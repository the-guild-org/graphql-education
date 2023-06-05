import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/common';
import {
  buildSchema,
  createContext,
} from '@database/postgres-with-prisma/schema';

const server = new ApolloServer({
  schema: await buildSchema(),
});

await startStandaloneServer(server, {
  listen: { port: 50005 },
  context: ({ req, res }) =>
    createContext({
      sessionId: sessionIdFromCookie(req.headers.cookie),
      setSessionId(sessionId) {
        res.setHeader('set-cookie', sessionIdToCookie(sessionId));
      },
    }),
});

console.info('Server is running on http://localhost:50005/graphql');
