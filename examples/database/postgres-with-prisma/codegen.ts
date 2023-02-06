import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../schema.graphql',
  generates: {
    'generated.d.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
      config: {
        // Prisma Client uses "type" for enums as well
        enumsAsTypes: true,
        // TODO: solve recursive relations more elegantly
        defaultMapper: 'Partial<{T}>',
      },
    },
  },
};

export default config;
