import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSchema } from '@database/mongodb/schema';

// Yoga already uses built-in support for GraphQL over SSE for subscriptions.
const yoga = createYoga({
  schema: await buildSchema('subscriptions'),
});

const server = createServer(yoga);

server.listen(50005, () => {
  console.info('Server is running on http://localhost:50005/graphql');
});
