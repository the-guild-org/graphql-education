import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MongoClient, Db as MongoDb } from 'mongodb';
import { ServerContext } from '@server/common';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers, Task, User } from './generated';

// TODO: have just one .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a mongodb client.
const client = new MongoClient(
  `mongodb://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@localhost:${process.env.DATABASE_PORT}`,
);

// And use it with the configured database.
const mongodb: MongoDb = client.db(process.env.DATABASE_DB);

export type DatabaseContext = {
  mongodb: MongoDb;
};

export type GraphQLContext = DatabaseContext & ServerContext;

export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  return {
    ...servCtx,
    mongodb,
  };
}

export async function buildSchema() {
  // Create an index for fulltext search operations.
  await mongodb
    .collection<Task>('task')
    .createIndex({ title: 'text', contents: 'text' });

  const resolvers: Resolvers<GraphQLContext> = {
    Query: {
      async me(_parent, _args, ctx) {
        interface Session {
          id: string;
          userId: string;
        }
        if (!ctx.sessionId) {
          return null;
        }
        const session = await ctx.mongodb
          .collection<Session>('session')
          .findOne({ id: ctx.sessionId });
        if (!session) {
          return null;
        }
        return ctx.mongodb
          .collection<User>('user')
          .findOne({ id: session.userId });
      },
      task(_parent, args, ctx) {
        return ctx.mongodb
          .collection<Task>('task')
          .findOne({ id: String(args.id) });
      },
      filterTasks(_parent, args, ctx) {
        if (!args.searchText) {
          return ctx.mongodb.collection<Task>('task').find().toArray();
        }
        return ctx.mongodb
          .collection<Task>('task')
          .find({ $text: { $search: args.searchText } })
          .toArray();
      },
    },
  };
  return makeExecutableSchema({
    typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
    resolvers: [resolvers],
  });
}
