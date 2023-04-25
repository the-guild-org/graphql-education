import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

export type DatabaseContext = {
  prisma: PrismaClient;
};

export type ServerContext = {
  sessionId: string | null;
  setSessionId: (sessionId: string) => void;
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

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    async me(_0, _1, ctx) {
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
    task(_, args, ctx) {
      return ctx.prisma.task.findUniqueOrThrow({
        where: {
          id: args.id,
        },
      });
    },
    filterTasks(_, args, ctx) {
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
          asigneeUserId: parent.id,
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
      if (!parent.asigneeUserId) {
        return null;
      }
      return ctx.prisma.user.findUniqueOrThrow({
        where: {
          id: parent.asigneeUserId,
        },
      });
    },
  },
  Mutation: {
    async register(_, args, ctx) {
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
    async login(_, args, ctx) {
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
    // TODO: other mutations
  },
  // TODO: subscriptions
};

export const schema = makeExecutableSchema({
  typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
  resolvers: [resolvers],
});
