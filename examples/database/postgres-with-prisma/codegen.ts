import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../schema.graphql',
  generates: {
    'generated.d.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
      config: {
        // Prisma Client uses "type" for enums as well
        enumsAsTypes: true,
        // expect resolvers to return Prisma generated types
        scalars: {
          ID: 'string',
        },
        mappers: {
          User: '@prisma/client#User as UserModel',
          Task: '@prisma/client#Task as TaskModel',
        },
      },
    },
  },
};

export default config;
