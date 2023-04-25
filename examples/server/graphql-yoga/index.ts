import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { schema, createContext } from '@database/postgres-with-prisma/schema';

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({ schema, context: createContext });

// Pass it into a server to hook into request handlers.
const server = createServer(yoga);

// Start the server and you're done!
server.listen(50005, () => {
  console.info('Server is running on http://localhost:50005/graphql');
});
