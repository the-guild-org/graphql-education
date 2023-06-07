import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  config: {
    // Types are easier to handle compared to enums.
    enumsAsTypes: true,
  },
  generates: {
    'basic.graphql.d.ts': {
      schema: '../../../schema/basic.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
    'subscriptions.graphql.d.ts': {
      schema: [
        '../../../schema/basic.graphql',
        '../../../schema/subscriptions.graphql',
      ],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
    'authentication.graphql.d.ts': {
      schema: [
        '../../../schema/basic.graphql',
        '../../../schema/authentication.graphql',
      ],
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
    },
  },
};

export default config;
