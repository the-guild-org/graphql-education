import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { GraphQLContext } from '.';
import { Resolvers } from '../basic.graphql';
import { GraphQLError } from 'graphql';

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    async task(_parent, args, ctx) {
      const task = await ctx.mongodb.task.findOne({
        _id: new ObjectId(args.id),
      });
      if (!task) {
        return null;
      }
      return {
        ...task,
        assigneeUserId: task.asigneeUserId?.toString(),
        id: task._id.toString(),
      };
    },
    filterTasks(_parent, args, ctx) {
      if (!args.searchText) {
        return ctx.mongodb.task
          .find()
          .map(({ _id, ...task }) => ({
            ...task,
            assigneeUserId: task.asigneeUserId?.toString(),
            id: _id.toString(),
          }))
          .toArray();
      }
      return ctx.mongodb.task
        .find({ $text: { $search: args.searchText } })
        .map(({ _id, ...task }) => ({
          ...task,
          assigneeUserId: task.asigneeUserId?.toString(),
          id: _id.toString(),
        }))
        .toArray();
    },
  },
  Mutation: {
    async createTask(_parent, { input }, ctx) {
      const { insertedId } = await ctx.mongodb.task.insertOne({
        title: input.title,
        description: input.description || null,
        // TODO: validate that the asignee exists if provided
        asigneeUserId: input.assigneeUserId
          ? new ObjectId(input.assigneeUserId)
          : null,
        status: input.status || 'TODO',
      });
      const task = await ctx.mongodb.task.findOne({ _id: insertedId });
      if (!task) {
        throw new Error('Task not properly inserted');
      }
      return {
        ...task,
        assigneeUserId: task.asigneeUserId?.toString(),
        id: task._id.toString(),
      };
    },
    async updateTask(_parent, { input }, ctx) {
      const { ok, value: task } = await ctx.mongodb.task.findOneAndUpdate(
        { _id: new ObjectId(input.id) },
        {
          $set: {
            title: input.title,
            description: input.description || null,
            // TODO: validate that the asignee exists
            asigneeUserId: input.assigneeUserId
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
        assigneeUserId: task.asigneeUserId?.toString(),
        id: task._id.toString(),
      };
    },
    async deleteTask(_parent, { input }, ctx) {
      const { ok, value: task } = await ctx.mongodb.task.findOneAndDelete({
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
        assigneeUserId: task.asigneeUserId?.toString(),
        id: task._id.toString(),
      };
    },
  },
  User: {
    assignedTasks(parent, _args, ctx) {
      return ctx.mongodb.task
        .find({ asigneeUserId: new ObjectId(parent.id) })
        .map(({ _id, ...task }) => ({
          ...task,
          assigneeUserId: task.asigneeUserId?.toString(),
          id: _id.toString(),
        }))
        .toArray();
    },
  },
  Task: {
    async assignee(parent, _args, ctx) {
      if (!parent.assigneeUserId) {
        return null;
      }
      const user = await ctx.mongodb.user.findOne({
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
