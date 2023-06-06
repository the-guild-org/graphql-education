import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
    // Expect resolvers to return MongoDB types.
    mappers: {
      User: './mongodb#User as UserModel',
      Task: './mongodb#Task as TaskModel',
    },
  },
  generates: {
    'basic.graphql.d.ts': {
      schema: '../../../schemas/basic.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
    'authentication.graphql.d.ts': {
      schema: '../../../schemas/authentication.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
    'authorization.graphql.d.ts': {
      schema: '../../../schemas/authorization.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
