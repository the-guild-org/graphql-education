import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../../schema.graphql',
  generates: {
    'generated.d.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
      config: {
        // easier type mappings because the Prisma Client uses "type" for enums as well
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
