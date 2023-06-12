import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { prisma } from '../prisma';
import * as basic from './basic';
import { Resolvers } from './authentication.graphql';
import {
  schemaPath as authenticationSchemaPath,
  Context,
} from '@schema/authentication';
import { schemaPath as basicSchemaPath } from '@schema/basic';
import { GraphQLError } from 'graphql';

const resolvers: Resolvers<Context> = {
  Query: {
    async me(_parent, _args, ctx) {
      if (!ctx.sessionId) {
        return null;
      }
      const session = await prisma.session.findUnique({
        where: { id: ctx.sessionId },
        select: { user: true },
      });
      if (!session) {
        return null;
      }
      return {
        ...session.user,
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
  },
  Mutation: {
    async login(_parent, { email, password }, ctx) {
      const user = await prisma.user.findFirst({
        where: {
          AND: [
            { email },
            {
              // TODO: storing plaintext passwords is a BAD IDEA
              password,
            },
          ],
        },
      });
      if (!user) {
        throw new GraphQLError('Wrong credentials!');
      }
      const session = await prisma.session.create({
        data: { userId: user.id },
      });
      ctx.setSessionId(session.id);
      return {
        ...user,
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
    async register(_parent, { input: { email, password } }, ctx) {
      const user = await prisma.user.create({
        data: {
          email,
          // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
          password,
        },
      });
      const session = await prisma.session.create({
        data: { userId: user.id },
        select: { id: true },
      });
      ctx.setSessionId(session.id);
      return {
        ...user,
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
    async createTask(_parent, { input }, ctx) {
      if (!ctx.sessionId) {
        throw new GraphQLError('Unauthorized');
      }
      const session = await prisma.session.findUnique({
        where: { id: ctx.sessionId },
      });
      if (!session) {
        throw new GraphQLError('Unauthorized');
      }
      const task = await prisma.task.create({
        data: {
          title: input.title,
          description: input.description || null,
          status: input.status || 'TODO',
          createdByUserId: session.userId,
        },
      });
      return {
        ...task,
        // will be populated by the Task.createdBy resolver
        createdBy: null as any,
      };
    },
  },
  User: {
    async createdTasks(parent) {
      const tasks = await prisma.task.findMany({
        where: {
          createdByUserId: parent.id,
        },
      });
      return tasks.map((task) => ({
        ...task,
        // will be populated by the Task.createdBy resolver
        createdBy: null as any,
      }));
    },
  },
  Task: {
    async createdBy(parent) {
      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: parent.createdByUserId,
        },
      });
      return {
        ...user,
        // will be populated by User.createdTask resolver
        createdTasks: [],
      };
    },
  },
};

// Schema builder function. The result is a ready-to-use executable GraphQL schema.
// This schema extends the "basic" schema.
export async function buildSchema() {
  return makeExecutableSchema({
    typeDefs: loadFilesSync([basicSchemaPath, authenticationSchemaPath]),
    resolvers: [basic.resolvers, resolvers],
  });
}
