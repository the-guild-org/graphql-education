import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';
import { GraphQLError } from 'graphql';

const prisma = new PrismaClient();

export type GraphQLContext = {
  prisma: PrismaClient;
};

export function createContext(): GraphQLContext {
  return { prisma };
}

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    // TODO: identify
    me() {
      return null;
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
    register(_, args, ctx) {
      return ctx.prisma.user.create({
        data: {
          ...args.input,
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          password: args.input.password,
        },
      });
    },
    async login(_, args, ctx) {
      const user = await ctx.prisma.user.findUnique({
        where: { email: args.email },
      });
      // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
      if (user?.password !== args.password) {
        throw new GraphQLError('Wrong credentials!');
      }
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
