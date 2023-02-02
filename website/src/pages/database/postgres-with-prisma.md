# Postgres with Prisma

[Prisma](https://www.prisma.io) is an [open source](https://github.com/prisma/prisma) database toolkit that makes it easy for developers to reason about their data and how they access it, by providing a
clean and type-safe API for submitting database queries.

Combined with [Postgres](https://www.postgresql.org/) as the database layer. It is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS or higher
- [Docker](https://www.docker.com/)

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

```sh filename=".env"
DATABASE_USER=user
DATABASE_PASSWORD=password
DATABASE_PORT=50000
DATABASE_DB=kanban
DATABASE_URL="postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:$DATABASE_PORT/$DATABASE_DB"
```

## Create the Prisma Schema

Create a file [prisma/schema.prisma](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/prisma/schema.prisma) file, describe the datasource and add the relevant data model:

```prisma filename="prisma/schema.prisma"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String @id @default(uuid())
  email         String @unique
  name          String
  assignedTasks Task[]
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

model Task {
  id          String     @id @default(uuid())
  assignee    User       @relation(fields: [userId], references: [id])
  userId      String
  status      TaskStatus
  title       String
  description String?
}
```

## Configure and start Postgres

Using Docker, we'll create a Postgres instance that we'll use to connect with Prisma.

Start by creating a [docker-compose.yaml](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/docker-compose.yaml) file for configuring Postgres.

```yaml filename="docker-compose.yaml"
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=$DATABASE_USER
      - POSTGRES_PASSWORD=$DATABASE_PASSWORD
      - POSTGRES_DB=$DATABASE_DB
    ports:
      - $DATABASE_PORT:$DATABASE_PORT
```

After having configured Postgres, you start the instance by simply running:

```sh
docker compose up -d
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

```ts filename="codegen.ts"
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '<get-started>/schema.graphql',
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

```ts filename="schema.ts"
import { PrismaClient } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Resolvers } from './generated';

const prisma = new PrismaClient();

export interface GraphQLContext {
  prisma: PrismaClient;
}

export function createContext(): GraphQLContext {
  return { prisma };
}

const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    task(_, args, ctx) {
      return ctx.prisma.task.findUniqueOrThrow({
        where: {
          id: args.id,
        },
      });
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: [require('path/to/schema.graphql')],
  resolvers: [resolvers],
});
```
