import { GraphQLSchema } from 'graphql';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      task: {
        type: GraphQLString,
        resolve: () => 'world',
      },
    },
  }),
});
