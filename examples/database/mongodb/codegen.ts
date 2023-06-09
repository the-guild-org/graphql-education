import { CodegenConfig } from '@graphql-codegen/cli';
import basic from './codegen.basic';
import authentication from './codegen.authentication';
import subscriptions from './codegen.subscriptions';

const config: CodegenConfig = {
  ...basic,
  ...authentication,
  ...subscriptions,
  generates: {
    ...basic.generates,
    ...authentication.generates,
    ...subscriptions.generates,
  },
};

export default config;
