import * as mongodb from '../mongodb';
import { ServerContext } from '@server/common';
import { mergeSchemas } from '@graphql-tools/schema';
import { BasicSchema } from './basic';

export type DatabaseContext = {
  mongodb: typeof mongodb;
};

export type GraphQLContext = DatabaseContext & ServerContext;

export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  return {
    ...servCtx,
    mongodb,
  };
}

export async function buildSchema() {
  return mergeSchemas({ schemas: [BasicSchema] });
}
