import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mongodb, ObjectId } from '../mongodb';
import * as basic from './basic';
import { Resolvers, Task } from '../subscriptions.graphql';
import { createPubSub } from '@database/common';
import { GraphQLError } from 'graphql';
import { schemaFile as basicSchemaFile } from '@schema/basic';
import { schemaFile as subscriptionsSchemaFile } from '@schema/subscriptions';

// The tasks wont change from basic schema in terms of their structure.
export interface DbTask extends basic.DbTask {}

// Pub/sub events map for susbscriptions. You can see them in action below.
const events = {
  taskCreated: createPubSub<{ taskCreated: Task }>(),
  taskChanged: createPubSub<{ taskChanged: Task }>(),
};

const resolvers: Resolvers = {
  Mutation: {
    async createTask(_parent, { input }) {
      const { insertedId } = await mongodb
        .collection<DbTask>('task')
        .insertOne({
          title: input.title,
          description: input.description || null,
          status: input.status || 'TODO',
        });
      const task = await mongodb
        .collection<DbTask>('task')
        .findOne({ _id: insertedId });
      if (!task) {
        throw new Error('Task not properly inserted');
      }
      events.taskCreated.pub({
        taskCreated: {
          ...task,
          id: task._id.toString(),
        },
      });
      return {
        ...task,
        id: task._id.toString(),
      };
    },
    async updateTask(_parent, { input }) {
      const { ok, value: task } = await mongodb
        .collection<DbTask>('task')
        .findOneAndUpdate(
          { _id: new ObjectId(input.id) },
          {
            $set: {
              title: input.title,
              description: input.description || null,
              status: input.status || 'TODO',
            },
          },
        );
      if (!ok) {
        throw new Error('Task cannot be updated');
      }
      if (!task) {
        throw new GraphQLError('Task does not exist');
      }
      events.taskChanged.pub({
        taskChanged: {
          ...task,
          id: task._id.toString(),
        },
      });
      return {
        ...task,
        id: task._id.toString(),
      };
    },
  },
  Subscription: {
    taskCreated: {
      subscribe() {
        return events.taskCreated.sub();
      },
    },
    taskChanged: {
      subscribe() {
        return events.taskChanged.sub();
      },
    },
  },
};

export const SubscriptionsSchema = makeExecutableSchema({
  typeDefs: loadFilesSync([basicSchemaFile, subscriptionsSchemaFile]),
  resolvers: [resolvers],
});
