import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { GraphQLContext } from '.';
import * as basic from './basic';
import { Resolvers, Task } from '../subscriptions.graphql';
import { createPubSub } from '@database/common';
import { GraphQLError } from 'graphql';

// The tasks wont change from basic schema in terms of their structure.
export interface DbTask extends basic.DbTask {}

// Pub/sub events map for susbscriptions. You can see them in action below.
const events = {
  taskCreated: createPubSub<{ taskCreated: Task }>(),
  taskChanged: createPubSub<{ taskChanged: Task }>(),
};

const resolvers: Resolvers<GraphQLContext> = {
  Mutation: {
    async createTask(_parent, { input }, ctx) {
      const { insertedId } = await ctx.db.collection<DbTask>('task').insertOne({
        title: input.title,
        description: input.description || null,
        // TODO: validate that the assignee exists if provided
        assigneeUserId: input.assigneeUserId
          ? new ObjectId(input.assigneeUserId)
          : null,
        status: input.status || 'TODO',
      });
      const task = await ctx.db
        .collection<DbTask>('task')
        .findOne({ _id: insertedId });
      if (!task) {
        throw new Error('Task not properly inserted');
      }
      events.taskCreated.pub({
        taskCreated: {
          ...task,
          id: task._id.toString(),
          assigneeUserId: task.assigneeUserId?.toString(),
        },
      });
      return {
        ...task,
        id: task._id.toString(),
        // will be populated by the Task.assignee resolver
        assignee: null,
        assigneeUserId: task.assigneeUserId?.toString(),
      };
    },
    async updateTask(_parent, { input }, ctx) {
      const { ok, value: task } = await ctx.db
        .collection<DbTask>('task')
        .findOneAndUpdate(
          { _id: new ObjectId(input.id) },
          {
            $set: {
              title: input.title,
              description: input.description || null,
              // TODO: validate that the assignee exists
              assigneeUserId: input.assigneeUserId
                ? new ObjectId(input.assigneeUserId)
                : null,
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
          assigneeUserId: task.assigneeUserId?.toString(),
        },
      });
      return {
        ...task,
        id: task._id.toString(),
        // will be populated by the Task.assignee resolver
        assignee: null,
        assigneeUserId: task.assigneeUserId?.toString(),
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
  typeDefs: loadFilesSync([
    '../../../schema/basic.graphql',
    '../../../schema/subscriptions.graphql',
  ]),
  resolvers: [resolvers],
});
