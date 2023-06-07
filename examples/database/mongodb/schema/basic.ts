import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { GraphQLContext } from '.';
import { Resolvers, TaskStatus } from '../basic.graphql';
import { GraphQLError } from 'graphql';

export interface DbUser {
  name: string;
  email: string;
}

export interface DbTask {
  assigneeUserId: ObjectId | null;
  status: TaskStatus;
  title: string;
  description: string | null;
}

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    async task(_parent, args, ctx) {
      const task = await ctx.db.collection<DbTask>('task').findOne({
        _id: new ObjectId(args.id),
      });
      if (!task) {
        return null;
      }
      return {
        ...task,
        id: task._id.toString(),
        assigneeUserId: task.assigneeUserId?.toString(),
      };
    },
    filterTasks(_parent, args, ctx) {
      if (!args.searchText) {
        return ctx.db
          .collection<DbTask>('task')
          .find()
          .map(({ _id, ...task }) => ({
            ...task,
            id: _id.toString(),
            assigneeUserId: task.assigneeUserId?.toString(),
          }))
          .toArray();
      }
      return ctx.db
        .collection<DbTask>('task')
        .find({ $text: { $search: args.searchText } })
        .map(({ _id, ...task }) => ({
          ...task,
          id: _id.toString(),
          assigneeUserId: task.assigneeUserId?.toString(),
        }))
        .toArray();
    },
  },
  Mutation: {
    async createTask(_parent, { input }, ctx) {
      const { insertedId } = await ctx.db.collection<DbTask>('task').insertOne({
        title: input.title,
        description: input.description || null,
        // TODO: validate that the assignee exists if provided
        assigneeUserId: input.assigneeUserId
          ? new ObjectId(input.assigneeUserId)
          : null,
        status: input.status || 'TODO',
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
        // will be populated by the Task.assignee resolver
        assignee: null,
        assigneeUserId: task.assigneeUserId?.toString(),
      };
    },
    async updateTask(_parent, { input }, ctx) {
      const { ok, value: task } = await ctx.db
        .collection<DbTask>('task')
        .findOneAndUpdate(
          { _id: new ObjectId(input.id) },
          {
            $set: {
              title: input.title,
              description: input.description || null,
              // TODO: validate that the assignee exists
              assigneeUserId: input.assigneeUserId
                ? new ObjectId(input.assigneeUserId)
                : null,
              status: input.status || 'TODO',
            },
          },
        );
      if (!ok) {
        throw new Error('Task cannot be updated');
      }
      if (!task) {
        throw new GraphQLError('Task does not exist');
      }
      return {
        ...task,
        id: task._id.toString(),
        // will be populated by the Task.assignee resolver
        assignee: null,
        assigneeUserId: task.assigneeUserId?.toString(),
      };
    },
    async deleteTask(_parent, { input }, ctx) {
      const { ok, value: task } = await ctx.db
        .collection<DbTask>('task')
        .findOneAndDelete({
          _id: new ObjectId(input.id),
        });
      if (!ok) {
        throw new Error('Task cannot be deleted');
      }
      if (!task) {
        throw new GraphQLError('Task does not exist');
      }
      return {
        ...task,
        id: task._id.toString(),
        // will be populated by the Task.assignee resolver
        assignee: null,
        assigneeUserId: task.assigneeUserId?.toString(),
      };
    },
  },
  User: {
    assignedTasks(parent, _args, ctx) {
      return ctx.db
        .collection<DbTask>('task')
        .find({ assigneeUserId: new ObjectId(parent.id) })
        .map(({ _id, ...task }) => ({
          ...task,
          id: _id.toString(),
          // will be populated by the Task.assignee resolver
          assignee: null,
          assigneeUserId: task.assigneeUserId?.toString(),
        }))
        .toArray();
    },
  },
  Task: {
    async assignee(parent, _args, ctx) {
      if (!parent.assigneeUserId) {
        return null;
      }
      const user = await ctx.db.collection<DbUser>('user').findOne({
        _id: new ObjectId(parent.assigneeUserId),
      });
      if (!user) {
        return null;
      }
      return {
        ...user,
        id: user._id.toString(),
        // will be populated by the User.assignedTasks resolver
        assignedTasks: [],
      };
    },
  },
};

export const BasicSchema = makeExecutableSchema({
  typeDefs: loadFilesSync('../../../schema/basic.graphql'),
  resolvers: [resolvers],
});
