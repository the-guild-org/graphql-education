import fs from 'fs';
import * as mongodb from './mongodb';
import { ServerContext } from '@server/common';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';
import { GraphQLError } from 'graphql';

export type DatabaseContext = {
  mongodb: typeof mongodb;
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
  const resolvers: Resolvers<GraphQLContext> = {
    Query: {
      async me(_parent, _args, ctx) {
        if (!ctx.sessionId) {
          return null;
        }
        const session = await ctx.mongodb.session.findOne({
          id: ctx.sessionId,
        });
        if (!session) {
          return null;
        }
        return ctx.mongodb.user.findOne({ id: session.userId });
      },
      task(_parent, args, ctx) {
        return ctx.mongodb.task.findOne({ id: String(args.id) });
      },
      filterTasks(_parent, args, ctx) {
        if (!args.searchText) {
          return ctx.mongodb.task.find().toArray();
        }
        return ctx.mongodb.task
          .find({ $text: { $search: args.searchText } })
          .toArray();
      },
    },
    Mutation: {
      async register(_parent, { input }, ctx) {
        const { insertedId: userId } = await ctx.mongodb.user.insertOne({
          ...input,
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          password: input.password,
        });
        const user = await ctx.mongodb.user.findOne({ id: userId });
        if (!user) {
          throw new Error('User not properly inserted');
        }
        const { insertedId: sessionId } = await ctx.mongodb.session.insertOne({
          userId: userId.toString(),
        });
        ctx.setSessionId(sessionId.toString());
        return user;
      },
      async login(_parent, args, ctx) {
        const user = await ctx.mongodb.user.findOne({
          email: args.email,
        });
        // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
        if (user?.password !== args.password) {
          throw new GraphQLError('Wrong credentials!');
        }
        const { insertedId: sessionId } = await ctx.mongodb.session.insertOne({
          userId: user._id.toString(),
        });
        ctx.setSessionId(sessionId.toString());
        return user;
      },
      async createTask(_parent, { input }, ctx) {
        const session = await ctx.mongodb.session.findOne({
          id: ctx.sessionId,
        });
        if (!session) {
          throw new GraphQLError('Unauthorized');
        }
        const { insertedId } = await ctx.mongodb.task.insertOne(
          {
            title: input.title,
            description: input.description || null,
            createdByUserId: session.userId,
            asigneeUserId: String(input.assignee),
            status: input.status || 'TODO',
            private: input.private,
          },
          {},
        );
        const task = await ctx.mongodb.task.findOne({ id: insertedId });
        if (!task) {
          throw new Error('Task not properly inserted');
        }
        // TODO: subscriptions
        // events.taskCreated.pub({ taskCreated: task });
        return task;
      },
      // TODO: other mutations
    },
    // Subscription: {
    //   taskCreated: {
    //     subscribe() {
    //       // TODO: check if allowed
    //       return events.taskCreated.sub();
    //     },
    //   },
    //   // TODO: other subscriptions
    // },
  };
  return makeExecutableSchema({
    typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
    resolvers: [resolvers],
  });
}
