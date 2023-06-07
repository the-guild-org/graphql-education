import { mongodb } from '../mongodb';
import { ServerContext } from '@server/common';
import { mergeSchemas } from '@graphql-tools/schema';
import { BasicSchema } from './basic';
import { SubscriptionsSchema } from './subscriptions';
import { AuthenticationSchema } from './authentication';

export type DatabaseContext = {
  db: typeof mongodb;
};

export type GraphQLContext = DatabaseContext & ServerContext;

export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  return {
    ...servCtx,
    db: mongodb,
  };
}

export async function buildSchema() {
  return mergeSchemas({
    schemas: [BasicSchema, SubscriptionsSchema, AuthenticationSchema],
  });
}
