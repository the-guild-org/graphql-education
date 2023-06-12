import { CodegenConfig } from '@graphql-codegen/cli';
import { schemaPath as basicSchemaPath } from '@schema/basic';
import { schemaPath as subscriptionsSchemaPath } from '@schema/subscriptions';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'schema/subscriptions.graphql.d.ts': {
      schema: [basicSchemaPath, subscriptionsSchemaPath],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
