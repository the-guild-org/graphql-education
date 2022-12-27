# Postgres with Prisma

[Prisma](https://www.prisma.io) is an [open source](https://github.com/prisma/prisma) database toolkit that makes it easy for developers to reason about their data and how they access it, by providing a
clean and type-safe API for submitting database queries.

Combined with [Postgres](https://www.postgresql.org/) as the database layer. It is a powerful, open source object-relational database system with over 35 years of active development that has earned it a strong reputation for reliability, feature robustness, and performance.

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- [Docker](https://www.docker.com/)

## Create project and set up Prisma

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
DATABASE_PORT=50001
DATABASE_DB=kanban
DATABASE_URL="postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:$DATABASE_PORT/$DATABASE_DB"
```

## Describe the datasource and model your data

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
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

## Create and start Postgres

Using Docker, we'll create a Postgres instance that we'll use to connect with Prisma.

Start by creating a [docker-compose.yml](https://github.com/the-guild-org/graphql-education/blob/main/examples/database/postgres-with-prisma/docker-compose.yml) file for configuring Postgres.

```yml filename="docker-compose.yml"
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

## Migrate the database

At this point, you have a Prisma schema but the data model is not applied yet. Using [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) you can create the necessary database elements:

```sh
npx prisma migrate dev --name init
```

## Generate the client

Now that the database is ready, you can use the [Prisma Generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators) to generate a TypeScript type-safe Prisma client. Simply run:

```sh
npx prisma generate
```

## Explore the data

Prisma comes with a built-in GUI to view and edit the data in your database. You can open it using the following command:

```sh
npx prisma studio
```
