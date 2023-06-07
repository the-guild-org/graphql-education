import { createPubSub } from '@database/common';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient, Task } from '@prisma/client';
import fs from 'fs';
import { GraphQLError } from 'graphql';
import { ServerContext } from '@server/common';
import { Resolvers } from './generated';

const prisma = new PrismaClient();

export type DatabaseContext = {
  prisma: PrismaClient;
};

export type GraphQLContext = DatabaseContext & ServerContext;

export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  return {
    ...servCtx,
    prisma,
  };
}

const events = {
  taskCreated: createPubSub<{ taskCreated: Task }>(),
  taskChanged: createPubSub<{ taskChanged: Task }>(),
};

export async function buildSchema() {
  const resolvers: Resolvers<GraphQLContext> = {
    Query: {
      async me(_parent, _args, ctx) {
        if (!ctx.sessionId) {
          return null;
        }
        const session = await ctx.prisma.session.findUnique({
          where: { id: ctx.sessionId },
          select: { user: true },
        });
        if (!session) {
          return null;
        }
        return session.user;
      },
      task(_parent, args, ctx) {
        return ctx.prisma.task.findUniqueOrThrow({
          where: {
            id: String(args.id),
          },
        });
      },
      filterTasks(_parent, args, ctx) {
        if (!args.searchText) {
          return ctx.prisma.task.findMany();
        }
        return ctx.prisma.task.findMany({
          where: {
            OR: [
              {
                title: {
                  contains: args.searchText,
                },
              },
              {
                description: {
                  contains: args.searchText,
                },
              },
            ],
          },
        });
      },
    },
    User: {
      createdTasks(parent, _, ctx) {
        return ctx.prisma.task.findMany({
          where: {
            createdByUserId: parent.id,
          },
        });
      },
      assignedTasks(parent, _, ctx) {
        return ctx.prisma.task.findMany({
          where: {
            assigneeUserId: String(parent.id),
          },
        });
      },
    },
    Task: {
      createdBy(parent, _, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: {
            id: parent.createdByUserId,
          },
        });
      },
      assignee(parent, _, ctx) {
        if (!parent.assigneeUserId) {
          return null;
        }
        return ctx.prisma.user.findUniqueOrThrow({
          where: {
            id: parent.assigneeUserId,
          },
        });
      },
    },
    Mutation: {
      async register(_parent, args, ctx) {
        const user = await ctx.prisma.user.create({
          data: {
            ...args.input,
            // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
            password: args.input.password,
          },
        });
        ctx.setSessionId(
          (
            await ctx.prisma.session.create({
              data: { userId: user.id },
              select: { id: true },
            })
          ).id,
        );
        return user;
      },
      async login(_parent, args, ctx) {
        const user = await ctx.prisma.user.findUnique({
          where: { email: args.email },
        });
        // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
        if (user?.password !== args.password) {
          throw new GraphQLError('Wrong credentials!');
        }
        ctx.setSessionId(
          (
            await ctx.prisma.session.create({
              data: { userId: user.id },
              select: { id: true },
            })
          ).id,
        );
        return user;
      },
      async createTask(_parent, { input }, ctx) {
        const session = ctx.sessionId
          ? await ctx.prisma.session.findUnique({
              where: { id: ctx.sessionId },
              select: { user: true },
            })
          : null;
        if (!session) {
          throw new GraphQLError('Unauthorized');
        }
        const task = await ctx.prisma.task.create({
          data: {
            title: input.title,
            assignee: {
              connect: {
                id: String(input.assignee),
              },
            },
            status: input.status || ('TODO' as const),
            createdBy: {
              connect: {
                id: session.user.id,
              },
            },
          },
        });
        events.taskCreated.pub({ taskCreated: task });
        return task;
      },
      // TODO: other mutations
    },
    Subscription: {
      taskCreated: {
        subscribe() {
          // TODO: check if allowed
          return events.taskCreated.sub();
        },
      },
      // TODO: other subscriptions
    },
  };
  return makeExecutableSchema({
    typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
    resolvers: [resolvers],
  });
}
