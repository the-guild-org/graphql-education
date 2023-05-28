# Postgres with Prisma

[Prisma](https://www.prisma.io) is an [open source](https://github.com/prisma/prisma) database toolkit that makes it easy for developers to reason about their data and how they access it, by providing a
clean and type-safe API for submitting database queries.

Combined with [Postgres](https://www.postgresql.org/) as the database layer. It is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS or higher
- [Docker](https://www.docker.com/)
- [TypeScript](https://www.typescriptlang.org/) knowledge

## Setup

Initialise a project and provide the necessary fields:

```sh
npm init
```

And install Prisma and [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client):

```sh
npm i prisma @prisma/client
```

## Configure the environment

We'll use a dotenv file named [.env](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/.env) to store the relevant connection and database configuration parameters.

```sh filename="examples/database/postgres-with-prisma/.env"
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_PORT=50000
DATABASE_DB=kanban
DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:${DATABASE_PORT}/${DATABASE_DB}"
```

## Create the Prisma Schema

Create a file [prisma/schema.prisma](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/prisma/schema.prisma) file, describe the datasource and add the relevant data model:

```prisma filename="examples/database/postgres-with-prisma/prisma/schema.prisma"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id       String @id @default(uuid())
  email    String @unique
  name     String
  password String

  sessions Session[]

  createdTasks  Task[] @relation("createdTasks")
  assignedTasks Task[] @relation("asignedTasks")
}

model Session {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

model Task {
  id String @id @default(uuid())

  createdByUserId String
  createdBy       User   @relation("createdTasks", fields: [createdByUserId], references: [id])

  private Boolean @default(false)

  asigneeUserId String?
  assignee      User?   @relation("asignedTasks", fields: [asigneeUserId], references: [id])

  status      TaskStatus
  title       String
  description String?
}
```

## Configure and start Postgres

Using Docker, we'll create a Postgres instance that we'll use to connect with Prisma.

Start by creating a [docker-compose.yaml](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/docker-compose.yaml) file in the same directory as our `.env` for configuring Postgres.

```yaml filename="examples/database/postgres-with-prisma/docker-compose.yaml"
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=$DATABASE_USER
      - POSTGRES_PASSWORD=$DATABASE_PASSWORD
      - PGPORT=$DATABASE_PORT
      - POSTGRES_DB=$DATABASE_DB
    ports:
      - $DATABASE_PORT:$DATABASE_PORT
```

After having configured Postgres, you start the instance by simply running:

```sh
docker compose up
```

## Apply the Prisma Schema

At this point, you have a Prisma schema but the data model is not applied yet. Using [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) you can create the necessary database elements:

```sh
npx prisma migrate dev --name init
```

## Generate the Prisma Client

Now that the database is ready, you can use the [Prisma Generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators) to generate a TypeScript type-safe Prisma client. Simply run:

```sh
npx prisma generate
```

## GraphQL schema

Let's prepare the GraphQL schema file [schema.ts]() that will be used by the servers as the data source and model.

The first thing you need to do is import your generated Prisma Client library and wire up the GraphQL server so that you can access the database queries that your new Prisma Client exposes.

### Preparation

#### Using GraphQL Code Generator

We will use the great [graphql-codegen](https://the-guild.dev/graphql/codegen) library to generate the necessary resolvers with TypeScript for our [schema.graphql](/get-started#schema).

Start by installing the codegen and the necessary plugins;

```sh
npm i @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-resolvers
```

Now we will configure codegen to generate the TypeScript resolvers to `generated.d.ts` using [schema.graphql](/get-started#schema) as the source:

```ts filename="examples/database/postgres-with-prisma/codegen.ts"
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '<get-started>/schema.graphql',
  generates: {
    'generated.d.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-resolvers'],
      config: {
        // Prisma Client uses "type" for enums as well
        enumsAsTypes: true,
        // expect resolvers to return Prisma generated types
        mappers: {
          User: '@prisma/client#User as UserModel',
          Task: '@prisma/client#Task as TaskModel',
        },
      },
    },
  },
};

export default config;
```

Finally run codegen to execute the configuration and generate the necessary file:

```sh
npx graphql-codegen
```

#### Prisma Client in the context

Prisma Client will be available through the GraphQL context. The `context` argument is a plain JavaScript object that every resolver in the resolver chain can access and read from.

The context is usually constructed for each executed GraphQL operation.
You will attach an instance of Prisma Client to the `context` for convenient access inside your resolvers via the `context` argument.

Furthermore, the client will be available to potential external plugins that hook into the GraphQL execution and depend on the context.

### Writing the schema

The final step is to create the actual GraphQL schema and assemble the data retrial process.

This `schema.ts` file will later on be used by a [server](/server/introduction) to
serve the contents of the database.

```ts filename="examples/database/postgres-with-prisma/schema.ts"
import { createPubSub } from '@database/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient, Task } from '@prisma/client';
import fs from 'fs';
import { GraphQLError } from 'graphql';
import { ServerContext } from '@server/common';
import { Resolvers } from './generated';

const prisma = new PrismaClient();

export type DatabaseContext = {
  prisma: PrismaClient;
};

export type GraphQLContext = DatabaseContext & ServerContext;

export async function createContext(
  servCtx: ServerContext,
): Promise<GraphQLContext> {
  return {
    ...servCtx,
    prisma,
  };
}

const events = {
  taskCreated: createPubSub<{ taskCreated: Task }>(),
  taskChanged: createPubSub<{ taskChanged: Task }>(),
};

export async function buildSchema() {
  const resolvers: Resolvers<GraphQLContext> = {
    Query: {
      async me(_parent, _args, ctx) {
        if (!ctx.sessionId) {
          return null;
        }
        const session = await ctx.prisma.session.findUnique({
          where: { id: ctx.sessionId },
          select: { user: true },
        });
        if (!session) {
          return null;
        }
        return session.user;
      },
      task(_parent, args, ctx) {
        return ctx.prisma.task.findUniqueOrThrow({
          where: {
            id: args.id,
          },
        });
      },
      filterTasks(_parent, args, ctx) {
        if (!args.searchText) {
          return ctx.prisma.task.findMany();
        }
        return ctx.prisma.task.findMany({
          where: {
            OR: [
              {
                title: {
                  contains: args.searchText,
                },
              },
              {
                description: {
                  contains: args.searchText,
                },
              },
            ],
          },
        });
      },
    },
    User: {
      createdTasks(parent, _, ctx) {
        return ctx.prisma.task.findMany({
          where: {
            createdByUserId: parent.id,
          },
        });
      },
      assignedTasks(parent, _, ctx) {
        return ctx.prisma.task.findMany({
          where: {
            asigneeUserId: parent.id,
          },
        });
      },
    },
    Task: {
      createdBy(parent, _, ctx) {
        return ctx.prisma.user.findUniqueOrThrow({
          where: {
            id: parent.createdByUserId,
          },
        });
      },
      assignee(parent, _, ctx) {
        if (!parent.asigneeUserId) {
          return null;
        }
        return ctx.prisma.user.findUniqueOrThrow({
          where: {
            id: parent.asigneeUserId,
          },
        });
      },
    },
    Mutation: {
      async register(_parent, args, ctx) {
        const user = await ctx.prisma.user.create({
          data: {
            ...args.input,
            // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
            password: args.input.password,
          },
        });
        ctx.setSessionId(
          (
            await ctx.prisma.session.create({
              data: { userId: user.id },
              select: { id: true },
            })
          ).id,
        );
        return user;
      },
      async login(_parent, args, ctx) {
        const user = await ctx.prisma.user.findUnique({
          where: { email: args.email },
        });
        // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
        if (user?.password !== args.password) {
          throw new GraphQLError('Wrong credentials!');
        }
        ctx.setSessionId(
          (
            await ctx.prisma.session.create({
              data: { userId: user.id },
              select: { id: true },
            })
          ).id,
        );
        return user;
      },
      async createTask(_parent, { input }, ctx) {
        const session = ctx.sessionId
          ? await ctx.prisma.session.findUnique({
              where: { id: ctx.sessionId },
              select: { user: true },
            })
          : null;
        if (!session) {
          throw new GraphQLError('Unauthorized');
        }
        const task = await ctx.prisma.task.create({
          data: {
            title: input.title,
            assignee: {
              connect: {
                id: input.assignee,
              },
            },
            status: input.status || ('TODO' as const),
            createdBy: {
              connect: {
                id: session.user.id,
              },
            },
          },
        });
        events.taskCreated.pub({ taskCreated: task });
        return task;
      },
      // TODO: other mutations
    },
    Subscription: {
      taskCreated: {
        subscribe() {
          // TODO: check if allowed
          return events.taskCreated.sub();
        },
      },
      // TODO: other subscriptions
    },
  };
  return makeExecutableSchema({
    typeDefs: [fs.readFileSync('../../../schema.graphql').toString()],
    resolvers: [resolvers],
  });
}
```
