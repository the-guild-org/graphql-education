# SQLite with Prisma

[Prisma](https://www.prisma.io) is an [open source](https://github.com/prisma/prisma) database toolkit that makes it easy for developers to reason about their data and how they access it, by providing a
clean and type-safe API for submitting database queries.

Combined with [SQLite](https://www.sqlite.org/index.html) as the database layer. It is a library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine. SQLite is the most used database engine in the world. SQLite is built into all mobile phones and most computers and comes bundled inside countless other applications that people use every day.

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher

## Create project and set up Prisma

Initialise a project and provide the necessary fields:

```sh
npm init
```

Install Prisma:

```sh
npm i prisma
```

Initialise Prisma with SQLite:

```sh
npx prisma init --datasource-provider sqlite
```

This creates a new `prisma` directory with your Prisma schema file and configures SQLite as your database. You're now ready to model your data and create your database with some tables.

## Model your data

Edit the newly created [prisma/schema.prisma](https://github.com/the-guild-org/graphql-education/tree/modules/examples/database/sqlite-with-prisma/prisma/schema.prisma) file and add the relevant data model:

```prisma filename="prisma/schema.prisma"
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

## Create database

At this point, you have a Prisma schema but no database yet. Using [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate) you can create the necessary database elements:

```sh
npx prisma migrate dev --name init
```

## Explore the data

Prisma comes with a built-in GUI to view and edit the data in your database. You can open it using the following command:

```sh
npx prisma studio
```
