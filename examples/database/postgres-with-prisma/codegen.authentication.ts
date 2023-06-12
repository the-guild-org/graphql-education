import { CodegenConfig } from '@graphql-codegen/cli';
import { schemaPath as basicSchemaPath } from '@schema/basic';
import { schemaPath as authenticationSchemaPath } from '@schema/authentication';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'schema/authentication.graphql.d.ts': {
      schema: [basicSchemaPath, authenticationSchemaPath],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
