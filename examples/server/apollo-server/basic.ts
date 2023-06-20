import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema } from '@database/mongodb/schema/authentication';

const server = new ApolloServer({
  schema: await buildSchema(),
});

await startStandaloneServer(server, {
  listen: { port: 50005 },
});

console.info('Server is running on http://localhost:50005/graphql');
