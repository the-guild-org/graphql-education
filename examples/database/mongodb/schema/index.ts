import { mergeSchemas } from '@graphql-tools/schema';
import { schema as basicSchema } from './basic';
import { schema as subscriptionsSchema } from './subscriptions';
import { schema as authenticationSchema } from './authentication';

export async function buildSchema(
  schema: 'basic' | 'subscriptions' | 'authentication',
) {
  return {
    basic: basicSchema,
    subscriptions: mergeSchemas({
      schemas: [basicSchema, subscriptionsSchema],
    }),
    authentication: mergeSchemas({
      schemas: [basicSchema, authenticationSchema],
    }),
  }[schema];
}
