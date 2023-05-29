import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../schema.graphql',
  generates: {
    'generated.d.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
      config: {
        // Types are easier to handle compared to enums.
        enumsAsTypes: true,
        // Expect resolvers to return MongoDB types.
        mappers: {
          User: './mongodb#User as UserModel',
          Task: './mongodb#Task as TaskModel',
        },
      },
    },
  },
};

export default config;
