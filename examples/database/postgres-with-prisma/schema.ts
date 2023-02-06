import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';

const prisma = new PrismaClient();

export interface GraphQLContext {
  prisma: PrismaClient;
}

export function createContext(): GraphQLContext {
  return { prisma };
}

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    task(_, args, ctx) {
      return ctx.prisma.task.findUniqueOrThrow({
        where: {
          id: args.id,
        },
      });
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
  resolvers: [resolvers],
});
