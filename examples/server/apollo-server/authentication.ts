import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/common';
import { Context } from '@schema/authentication';
import { buildSchema } from '@database/mongodb/schema/authentication';

const server = new ApolloServer<Context>({
  schema: await buildSchema(),
});

await startStandaloneServer(server, {
  listen: { port: 50005 },
  context: async ({ req, res }) => ({
    sessionId: sessionIdFromCookie(req.headers.cookie),
    setSessionId(sessionId) {
      res.setHeader('set-cookie', sessionIdToCookie(sessionId));
    },
  }),
});

console.info('Server is running on http://localhost:50005/graphql');
