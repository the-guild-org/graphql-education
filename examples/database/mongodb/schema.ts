import fs from 'fs';
import * as mongodb from './mongodb';
import { ServerContext } from '@server/common';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';
import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

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
          _id: new ObjectId(ctx.sessionId),
        });
        if (!session) {
          return null;
        }
        const user = await ctx.mongodb.user.findOne({
          _id: new ObjectId(session.userId),
        });
        if (!user) {
          return null;
        }
        return { id: user._id, ...user };
      },
      async task(_parent, args, ctx) {
        const task = await ctx.mongodb.task.findOne({
          _id: new ObjectId(args.id),
        });
        if (!task) {
          return null;
        }
        return { id: task._id, ...task };
      },
      filterTasks(_parent, args, ctx) {
        if (!args.searchText) {
          return ctx.mongodb.task
            .find()
            .map(({ _id, ...task }) => ({ id: _id, ...task }))
            .toArray();
        }
        return ctx.mongodb.task
          .find({ $text: { $search: args.searchText } })
          .map(({ _id, ...task }) => ({ id: _id, ...task }))
          .toArray();
      },
    },
    // User: {
    //   createdTasks(parent, _, ctx) {
    //     return ctx.prisma.task.findMany({
    //       where: {
    //         createdByUserId: parent.id,
    //       },
    //     });
    //   },
    //   assignedTasks(parent, _, ctx) {
    //     return ctx.prisma.task.findMany({
    //       where: {
    //         assigneeUserId: parent.id,
    //       },
    //     });
    //   },
    // },
    // Task: {
    //   createdBy(parent, _, ctx) {
    //     return ctx.prisma.user.findUniqueOrThrow({
    //       where: {
    //         id: parent.createdByUserId,
    //       },
    //     });
    //   },
    //   assignee(parent, _, ctx) {
    //     if (!parent.assigneeUserId) {
    //       return null;
    //     }
    //     return ctx.prisma.user.findUniqueOrThrow({
    //       where: {
    //         id: parent.assigneeUserId,
    //       },
    //     });
    //   },
    // },
    Mutation: {
      async register(_parent, { input }, ctx) {
        const { insertedId: userId } = await ctx.mongodb.user.insertOne({
          ...input,
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          password: input.password,
        });
        const user = await ctx.mongodb.user.findOne({
          _id: new ObjectId(userId),
        });
        if (!user) {
          throw new Error('User not properly inserted');
        }
        const { insertedId: sessionId } = await ctx.mongodb.session.insertOne({
          userId: user._id,
        });
        ctx.setSessionId(sessionId.toString());
        return { id: user._id, ...user };
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
          userId: user._id,
        });
        ctx.setSessionId(sessionId.toString());
        return { id: user._id, ...user };
      },
      async createTask(_parent, { input }, ctx) {
        if (!ctx.sessionId) {
          throw new GraphQLError('Unauthorized');
        }
        const session = await ctx.mongodb.session.findOne({
          _id: new ObjectId(ctx.sessionId),
        });
        if (!session) {
          throw new GraphQLError('Unauthorized');
        }
        const { insertedId } = await ctx.mongodb.task.insertOne(
          {
            title: input.title,
            description: input.description || null,
            createdByUserId: session.userId,
            // TODO: validate that the assignee exists
            assigneeUserId: new ObjectId(input.assignee),
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
        return { id: task._id, ...task };
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
