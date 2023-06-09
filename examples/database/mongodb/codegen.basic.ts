import { CodegenConfig } from '@graphql-codegen/cli';
import { schemaFile } from '@schema/basic';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'schema/basic.graphql.d.ts': {
      schema: schemaFile,
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
