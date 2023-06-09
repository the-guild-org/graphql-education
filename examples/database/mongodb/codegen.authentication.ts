import { CodegenConfig } from '@graphql-codegen/cli';
import { schemaFile as basicSchemaFile } from '@schema/basic';
import { schemaFile as authenticationSchemaFile } from '@schema/authentication';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'schema/authentication.graphql.d.ts': {
      schema: [basicSchemaFile, authenticationSchemaFile],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
