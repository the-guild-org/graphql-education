import path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { Pool } from 'pg';
import {
  createPostGraphileSchema,
  withPostGraphileContext,
} from 'postgraphile';
import { GraphQLSchema, execute as graphqlExecute } from 'graphql';
import { NodePlugin } from 'graphile-build';
import PgSimplifyInflector from '@graphile-contrib/pg-simplify-inflector';

import { SessionPlugin } from './SessionPlugin';

const env = dotenv.config({ path: path.join(__dirname, '.env') });
dotenvExpand.expand(env);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres:///';

export type DatabaseContext = {
  pgOwnerPool: Pool;
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
  return {
    ...servCtx,
    pgOwnerPool,
  };
}

let schema: GraphQLSchema;
export async function createSchema() {
  return schema
    ? schema
    : (schema = await createPostGraphileSchema(DATABASE_URL, 'public', {
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
        // simpler inflection for shorter names
        appendPlugins: [PgSimplifyInflector, SessionPlugin],
      }));
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
// TODO: implement subscriptions
export const subscribe = execute;
