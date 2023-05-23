import path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { Pool } from 'pg';
import {
  createPostGraphileSchema,
  withPostGraphileContext,
} from 'postgraphile';
import {
  GraphQLSchema,
  execute as graphqlExecute,
  subscribe as graphqlSubscribe,
} from 'graphql';
import { NodePlugin } from 'graphile-build';
import PgSimplifyInflector from '@graphile-contrib/pg-simplify-inflector';
import PgPubSub from 'pg-pubsub';

import { SessionPlugin } from './SessionPlugin';

import { TaskSubscriptionsPlugin } from './TaskSubscriptionsPlugin';

const env = dotenv.config({ path: path.join(__dirname, '.env') });
dotenvExpand.expand(env);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres:///';

export type DatabaseContext = {
  pgOwnerPool: Pool;
  pgSubscribe: (channel: string) => Promise<AsyncIterableIterator<string>>;
};

export type ServerContext = {
  sessionId: string | null;
  setSessionId: (sessionId: string) => void;
};

export type GraphQLContext = DatabaseContext & ServerContext;

const pgOwnerPool = new Pool({ connectionString: DATABASE_URL });
export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  const pgPubSub = new PgPubSub(DATABASE_URL);
  return {
    ...servCtx,
    pgOwnerPool,
    async pgSubscribe(channel) {
      const state = {
        payloads: [] as string[],
        error: null as unknown,
        done: false,
        resolve: () => {
          // noop
        },
      };

      function listener(payload: string) {
        state.payloads.push(payload);
        state.resolve();
      }

      await pgPubSub.addChannel(channel, listener);

      pgPubSub.once('error', (err) => {
        pgPubSub.removeChannel(channel, listener);
        state.error = err;
        state.resolve();
      });

      const iter = (async function* iter() {
        for (;;) {
          while (state.payloads.length) {
            yield state.payloads.shift()!;
          }
          if (state.error) {
            throw state.error;
          }
          if (state.done) {
            return;
          }
          await new Promise<void>((resolve) => (state.resolve = resolve));
        }
      })();
      iter.throw = async (err) => {
        if (!state.done) {
          state.done = true;
          state.error = err;
          state.resolve();
        }
        return { done: true, value: undefined };
      };
      iter.return = async () => {
        if (!state.done) {
          state.done = true;
          state.resolve();
        }
        return { done: true, value: undefined };
      };

      return iter;
    },
  };
}

export async function buildSchema() {
  return await createPostGraphileSchema(DATABASE_URL, 'public', {
    graphileBuildOptions: {
      // avoid appending list suffix to setof functions
      pgOmitListSuffix: true,
    },
    // none of our setof returning functions will contain nulls
    setofFunctionsContainNulls: false,
    // exclude fields, queries and mutations that are not available to the authenticated user
    ignoreRBAC: false,
    // we dont need relay style connections
    simpleCollections: 'only',
    // disable the global object identifier plugin because our IDs are globally unique
    skipPlugins: [NodePlugin],
    appendPlugins: [
      // simpler inflection for shorter names
      PgSimplifyInflector,
      SessionPlugin,
      TaskSubscriptionsPlugin,
    ],
  });
}

const pgPool = new Pool({ connectionString: DATABASE_URL });
export const execute: typeof graphqlExecute = (args) => {
  if (args instanceof GraphQLSchema) {
    throw new Error(
      'Legacy GraphQL execution with spread arguments is not supported!',
    );
  }
  const ctx: GraphQLContext = args.contextValue;
  return withPostGraphileContext(
    {
      pgPool,
      pgSettings: {
        role: ctx.sessionId ? 'auth_user' : 'anon_user',
        'session.id': ctx.sessionId,
      },
    },
    async (pgCtx) => {
      // Do NOT use context outside of this function.
      return await graphqlExecute({
        ...args,
        contextValue: { ...args.contextValue, ...pgCtx },
      });
    },
  );
};
export const subscribe: typeof graphqlSubscribe = (args) => {
  if (args instanceof GraphQLSchema) {
    throw new Error(
      'Legacy GraphQL subscription with spread arguments is not supported!',
    );
  }
  const ctx: GraphQLContext = args.contextValue;
  return withPostGraphileContext(
    {
      pgPool,
      pgSettings: {
        role: ctx.sessionId ? 'auth_user' : 'anon_user',
        'session.id': ctx.sessionId,
      },
    },
    // @ts-expect-error async iterator is allowed here too
    async (pgCtx) => {
      // Do NOT use context outside of this function.
      return await graphqlSubscribe({
        ...args,
        contextValue: { ...args.contextValue, ...pgCtx },
      });
    },
  );
};
