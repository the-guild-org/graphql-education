# PostGraphile

[PostGraphile](https://www.graphile.org/postgraphile/) is an [open source](https://github.com/graphile/postgraphile) tool to instantly spin-up a GraphQL API server by pointing PostGraphile at your existing Postgres database. Introspecting the SQL schema, it auto-creates a fully functioning, and already connected, GraphQL schema.

It uses exclusively [Postgres](https://www.postgresql.org/) as the database layer. It is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS or higher
- [Docker](https://www.docker.com/)
- [TypeScript](https://www.typescriptlang.org/) knowledge

## Setup

Initialise a project and provide the necessary fields:

```sh
npm init
```

## Configure the environment

We'll use a dotenv file named `.env` to store the relevant connection and database configuration parameters.

```sh filename="examples/database/postgraphile/.env"
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_PORT=50000
DATABASE_DB=kanban
DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:${DATABASE_PORT}/${DATABASE_DB}"
```

## Create the Schema in SQL

Create the file `schema.sql`, and design your database schema in SQL:

```sql filename="examples/database/postgraphile/schema.sql"
create extension "uuid-ossp";
create extension pg_trgm;

--

create role anon_user;
create role auth_user;

--

create table public.user (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  password text not null
);
grant all on public.user to anon_user, auth_user;

comment on column public.user.password is '@omit';

--

create table session (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user
);
comment on table session is '@omit';

create index session_user_id_idx on session (user_id);

--

create type task_status as enum (
  'TODO',
  'IN_PROGRESS',
  'DONE'
);

create table task (
  id uuid primary key default uuid_generate_v4(),
  created_by_id uuid not null references public.user,
  private boolean not null default false,
  assignee_id uuid references public.user,
  status task_status not null,
  title text not null,
  description text
);
grant all on task to anon_user, auth_user;

create index task_title_idx on task using gin (title gin_trgm_ops);

create function filter_tasks(
  search_text text
) returns setof task as $
  select * from task
  where search_text is null
  or (
    title ilike '%' || search_text || '%'
  )
$ language sql stable;

--

create function notify_task_created()
returns trigger as $
begin
  perform pg_notify('task_created', new.id::text);
  return null;
end
$ language plpgsql stable;
create trigger task_created_trigger
  after insert on task
  for each row
  execute procedure notify_task_created();

-- create trigger task_changed_trigger
--   after update on task
--   for each row
--   execute procedure ?;
```

## Configure and start Postgres

Using Docker, we'll create a Postgres instance that we'll use with PostGraphile.

Start by creating a `docker-compose.yaml` file in the same directory as our `.env` and `schema.sql` for configuring Postgres.

We mount the `schema.sql` file so that Postgres will use it to create a schema during setup.

```yaml filename="examples/database/postgraphile/docker-compose.yaml"
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=$DATABASE_USER
      - POSTGRES_PASSWORD=$DATABASE_PASSWORD
      - PGPORT=$DATABASE_PORT
      - POSTGRES_DB=$DATABASE_DB
    volumes:
      - ./schema.sql:/docker-entrypoint-initdb.d/1-schema.sql
    ports:
      - $DATABASE_PORT:$DATABASE_PORT
```

After having configured Postgres, you start the instance by simply running:

```sh
docker compose up
```

## GraphQL schema

Now that we have the SQL schema ready and applied - we will start with the `schema.ts` file that connects PostGraphile to Postgres and uses it to perform operations.

This `schema.ts` file will later on be used by a [server](/server/introduction) to serve the contents of the database.

```ts filename="examples/database/postgraphile/schema.ts"
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
        appendPlugins: [
          // simpler inflection for shorter names
          PgSimplifyInflector,
          SessionPlugin,
          TaskSubscriptionsPlugin,
        ],
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
```
