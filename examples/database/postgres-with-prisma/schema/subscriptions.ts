import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { prisma } from '../prisma';
import * as basic from './basic';
import { Resolvers, Task } from './subscriptions.graphql';
import { createPubSub } from '@database/common';
import { schemaPath as basicSchemaPath } from '@schema/basic';
import { schemaPath as subscriptionsSchemaPath } from '@schema/subscriptions';

// Pub/sub events map for subscriptions. You can see them in action below.
const events = {
  taskCreated: createPubSub<{ taskCreated: Task }>(),
  taskChanged: createPubSub<{ taskChanged: Task }>(),
};

// Using the generated `Resolvers` type definitions, we simply have to implement them to communicate with Postgres through Prisma.
const resolvers: Resolvers = {
  Mutation: {
    async createTask(_parent, { input }) {
      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          status: input.status || ('TODO' as const),
        },
      });
      events.taskCreated.pub({ taskCreated: task });
      return task;
    },
    async updateTask(_parent, { input }) {
      const task = await prisma.task.update({
        where: {
          id: String(input.id),
        },
        data: {
          title: input.title,
          description: input.description,
          status: input.status || ('TODO' as const),
        },
      });
      events.taskChanged.pub({
        taskChanged: task,
      });
      return task;
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

// Schema builder function. The result is a ready-to-use executable GraphQL schema.
// This schema extends the "basic" schema.
export async function buildSchema() {
  return makeExecutableSchema({
    typeDefs: loadFilesSync([basicSchemaPath, subscriptionsSchemaPath]),
    resolvers: [basic.resolvers, resolvers],
  });
}
