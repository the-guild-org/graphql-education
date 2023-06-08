import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { buildSchema } from '@database/mongodb/schema';

const yoga = createYoga({
  schema: await buildSchema('basic'),
});

const server = createServer(yoga);

server.listen(50005, () => {
  console.info('Server is running on http://localhost:50005/graphql');
});