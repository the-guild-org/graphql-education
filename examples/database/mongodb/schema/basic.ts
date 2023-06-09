import { loadFilesSync } from '@graphql-tools/load-files';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mongodb, ObjectId } from '../mongodb';
import { Resolvers, TaskStatus } from '../basic.graphql';
import { GraphQLError } from 'graphql';
import { schemaFile } from '@schema/basic';

export interface DbTask {
  status: TaskStatus;
  title: string;
  description: string | null;
}

const resolvers: Resolvers = {
  Query: {
    async task(_parent, args) {
      const task = await mongodb.collection<DbTask>('task').findOne({
        _id: new ObjectId(args.id),
      });
      if (!task) {
        return null;
      }
      return {
        ...task,
        id: task._id.toString(),
      };
    },
    filterTasks(_parent, args) {
      if (!args.searchText) {
        return mongodb
          .collection<DbTask>('task')
          .find()
          .map(({ _id, ...task }) => ({
            ...task,
            id: _id.toString(),
          }))
          .toArray();
      }
      return mongodb
        .collection<DbTask>('task')
        .find({ $text: { $search: args.searchText } })
        .map(({ _id, ...task }) => ({
          ...task,
          id: _id.toString(),
        }))
        .toArray();
    },
  },
  Mutation: {
    async createTask(_parent, { input }) {
      const { insertedId } = await mongodb
        .collection<DbTask>('task')
        .insertOne({
          title: input.title,
          description: input.description || null,
          status: input.status || 'TODO',
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
      };
    },
    async updateTask(_parent, { input }) {
      const { ok, value: task } = await mongodb
        .collection<DbTask>('task')
        .findOneAndUpdate(
          { _id: new ObjectId(input.id) },
          {
            $set: {
              title: input.title,
              description: input.description || null,
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
      };
    },
    async deleteTask(_parent, { input }) {
      const { ok, value: task } = await mongodb
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
      };
    },
  },
};

export const BasicSchema = makeExecutableSchema({
  typeDefs: loadFilesSync(schemaFile),
  resolvers: [resolvers],
});
