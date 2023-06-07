import { loadFilesSync } from '@graphql-tools/load-files';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { GraphQLContext } from '.';
import { Resolvers } from '../authentication.graphql';
import { GraphQLError } from 'graphql';

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
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by the User.assignedTasks resolver
        assignedTasks: [],
        // will be populated by the User.createdTasks resolver
        createdTasks: [],
      };
    },
  },
};

export const AuthenticationSchema = makeExecutableSchema({
  typeDefs: loadFilesSync([
    '../../../schema/basic.graphql',
    '../../../schema/authentication.graphql',
  ]),
  resolvers: [resolvers],
});
