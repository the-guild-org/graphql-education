import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { Resolvers } from './basic.graphql';
import { schemaPath } from '@schema/basic';
import { prisma } from '../prisma';

// Using the generated `Resolvers` type definitions, we simply have to implement them to communicate with Postgres through Prisma.
export const resolvers: Resolvers = {
  Query: {
    task(_parent, args) {
      return prisma.task.findUniqueOrThrow({
        where: {
          id: String(args.id),
        },
      });
    },
    filterTasks(_parent, args) {
      if (!args.searchText) {
        return prisma.task.findMany();
      }
      return prisma.task.findMany({
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
  Mutation: {
    createTask(_parent, { input }) {
      return prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          status: input.status || ('TODO' as const),
        },
      });
    },
    updateTask(_parent, { input }) {
      return prisma.task.update({
        where: {
          id: String(input.id),
        },
        data: {
          title: input.title,
          description: input.description,
          status: input.status || ('TODO' as const),
        },
      });
    },
  },
};

// Schema builder function. The result is a ready-to-use executable GraphQL schema.
export async function buildSchema() {
  return makeExecutableSchema({
    typeDefs: loadFilesSync(schemaPath),
    resolvers: [resolvers],
  });
}
