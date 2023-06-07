import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { GraphQLContext } from '.';
import * as basic from './basic';
import { Resolvers } from '../authentication.graphql';
import { GraphQLError } from 'graphql';

export interface DbUser extends basic.DbUser {}

export interface DbTask extends basic.DbTask {
  createdByUserId: ObjectId;
}

export interface DbSession {
  userId: ObjectId;
}

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    async me(_parent, _args, ctx) {
      if (!ctx.sessionId) {
        return null;
      }
      const session = await ctx.db.collection<DbSession>('session').findOne({
        _id: new ObjectId(ctx.sessionId),
      });
      if (!session) {
        return null;
      }
      const user = await ctx.db.collection<DbUser>('user').findOne({
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
  Mutation: {
    async createTask(_parent, { input }, ctx) {
      if (!ctx.sessionId) {
        throw new GraphQLError('Unauthorized');
      }
      const session = await ctx.db.collection<DbSession>('session').findOne({
        _id: new ObjectId(ctx.sessionId),
      });
      if (!session) {
        throw new GraphQLError('Unauthorized');
      }
      const { insertedId } = await ctx.db.collection<DbTask>('task').insertOne({
        title: input.title,
        description: input.description || null,
        // TODO: validate that the assignee exists if provided
        assigneeUserId: input.assigneeUserId
          ? new ObjectId(input.assigneeUserId)
          : null,
        status: input.status || 'TODO',
        createdByUserId: new ObjectId(session.userId),
      });
      const task = await ctx.db
        .collection<DbTask>('task')
        .findOne({ _id: insertedId });
      if (!task) {
        throw new Error('Task not properly inserted');
      }
      return {
        ...task,
        id: task._id.toString(),
        assigneeUserId: task.assigneeUserId?.toString(),
        // will be populated by the Task.createdBy resolver
        createdBy: null as any,
        createdByUserId: task.createdByUserId.toString(),
      };
    },
  },
  Task: {
    async createdBy(parent, _args, ctx) {
      const user = await ctx.db.collection<DbUser>('user').findOne({
        _id: new ObjectId(parent.createdByUserId),
      });
      if (!user) {
        throw new Error('Created by user not found');
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
