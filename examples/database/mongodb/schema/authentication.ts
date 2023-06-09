import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mongodb, ObjectId, MongoServerError } from '../mongodb';
import * as basic from './basic';
import { Resolvers } from './authentication.graphql';
import {
  schemaFile as authenticationSchemaFile,
  Context,
} from '@schema/authentication';
import { schemaFile as basicSchemaFile } from '@schema/basic';
import { GraphQLError } from 'graphql';

export interface DbUser {
  email: string;
  // TODO: storing plaintext passwords is a BAD IDEA
  password: string;
}

export interface DbTask extends basic.DbTask {
  createdByUserId: ObjectId;
}

export interface DbSession {
  userId: ObjectId;
}

const resolvers: Resolvers<Context> = {
  Query: {
    async me(_parent, _args, ctx) {
      if (!ctx.sessionId) {
        return null;
      }
      const session = await mongodb.collection<DbSession>('session').findOne({
        _id: new ObjectId(ctx.sessionId),
      });
      if (!session) {
        return null;
      }
      const user = await mongodb.collection<DbUser>('user').findOne({
        _id: new ObjectId(session.userId),
      });
      if (!user) {
        return null;
      }
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by the User.createdTasks resolver
        createdTasks: [],
      };
    },
  },
  Mutation: {
    async login(_parent, { email, password }, ctx) {
      const user = await mongodb.collection<DbUser>('user').findOne({ email });
      if (!user) {
        throw new GraphQLError('Wrong credentials');
      }
      // TODO: storing plaintext passwords is a BAD IDEA
      if (user.password !== password) {
        throw new GraphQLError('Wrong credentials');
      }
      const { insertedId: sessionId } = await mongodb
        .collection<DbSession>('session')
        .insertOne({ userId: user._id });
      ctx.setSessionId(sessionId.toString());
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
    async register(_parent, { input: { email, password } }, ctx) {
      let userId: ObjectId;
      try {
        const { insertedId } = await mongodb
          .collection<DbUser>('user')
          .insertOne({
            email,
            // TODO: storing plaintext passwords is a BAD IDEA
            password,
          });
        userId = insertedId;
      } catch (err) {
        if (
          err instanceof MongoServerError &&
          // duplicate key error
          err.code === 11000
        ) {
          throw new GraphQLError('User already exists');
        }
        throw err;
      }
      const user = await mongodb
        .collection<DbUser>('user')
        .findOne({ _id: userId });
      if (!user) {
        throw new Error('User not properly inserted');
      }
      const { insertedId: sessionId } = await mongodb
        .collection<DbSession>('session')
        .insertOne({ userId });
      ctx.setSessionId(sessionId.toString());
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
    async createTask(_parent, { input }, ctx) {
      if (!ctx.sessionId) {
        throw new GraphQLError('Unauthorized');
      }
      const session = await mongodb.collection<DbSession>('session').findOne({
        _id: new ObjectId(ctx.sessionId),
      });
      if (!session) {
        throw new GraphQLError('Unauthorized');
      }
      const { insertedId } = await mongodb
        .collection<DbTask>('task')
        .insertOne({
          title: input.title,
          description: input.description || null,
          status: input.status || 'TODO',
          createdByUserId: new ObjectId(session.userId),
        });
      const task = await mongodb
        .collection<DbTask>('task')
        .findOne({ _id: insertedId });
      if (!task) {
        throw new Error('Task not properly inserted');
      }
      return {
        ...task,
        id: task._id.toString(),
        // will be populated by the Task.createdBy resolver
        createdBy: null as any,
        createdByUserId: task.createdByUserId.toString(),
      };
    },
  },
  User: {
    async createdTasks(parent) {
      return mongodb
        .collection<DbTask>('task')
        .find({ createdByUserId: new ObjectId(parent.id) })
        .map(({ _id, ...task }) => ({
          ...task,
          id: _id.toString(),
          // will be populated by the User.createdTasks resolver
          createdBy: null as any,
          createdByUserId: task.createdByUserId.toString(),
        }))
        .toArray();
    },
  },
  Task: {
    async createdBy(parent, _args) {
      const user = await mongodb.collection<DbUser>('user').findOne({
        _id: new ObjectId(parent.createdByUserId),
      });
      if (!user) {
        throw new Error('Created by user not found');
      }
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by the User.createdTasks resolver
        createdTasks: [],
      };
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: loadFilesSync([basicSchemaFile, authenticationSchemaFile]),
  resolvers: [resolvers],
});
