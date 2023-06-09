import { mergeSchemas } from '@graphql-tools/schema';
import { BasicSchema } from './basic';
import { SubscriptionsSchema } from './subscriptions';
import { AuthenticationSchema } from './authentication';

export async function buildSchema(
  schema: 'basic' | 'subscriptions' | 'authentication',
) {
  return {
    basic: BasicSchema,
    subscriptions: mergeSchemas({
      schemas: [BasicSchema, SubscriptionsSchema],
    }),
    authentication: mergeSchemas({
      schemas: [BasicSchema, AuthenticationSchema],
    }),
  }[schema];
}
