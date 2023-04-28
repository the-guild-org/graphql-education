import path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { Pool } from 'pg';
import {
  createPostGraphileSchema,
  withPostGraphileContext,
} from 'postgraphile';
import { execute as graphqlExecute, ExecutionArgs } from 'graphql';

const env = dotenv.config({ path: path.join(__dirname, '.env') });
dotenvExpand.expand(env);
const DATABASE_URL = process.env.DATABASE_URL || 'postgres:///';

export function createSchema() {
  return createPostGraphileSchema(DATABASE_URL, 'public');
}

export async function createContext(_servCtx: any) {
  return {};
}

const pgPool = new Pool({ connectionString: DATABASE_URL });

export function execute(args: ExecutionArgs) {
  return withPostGraphileContext({ pgPool }, async (context) => {
    // Do NOT use context outside of this function.
    return await graphqlExecute({
      ...args,
      contextValue: { ...args.contextValue, ...context },
    });
  });
}
