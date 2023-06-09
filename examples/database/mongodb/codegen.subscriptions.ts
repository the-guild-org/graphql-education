import { CodegenConfig } from '@graphql-codegen/cli';
import { schemaFile as basicSchemaFile } from '@schema/basic';
import { schemaFile as subscriptionsSchemaFile } from '@schema/subscriptions';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'schema/subscriptions.graphql.d.ts': {
      schema: [basicSchemaFile, subscriptionsSchemaFile],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
