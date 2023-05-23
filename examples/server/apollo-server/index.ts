import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  createSchema,
  createContext,
  // TODO: implement
  // execute,
  // subscribe,
} from '@database/postgraphile/schema';

(async () => {
  const schema = await createSchema();
  const server = new ApolloServer({ schema });

  await startStandaloneServer(server, {
    listen: {
      port: 50005,
    },
    context: ({ req, res }) =>
      createContext({
        sessionId: sessionIdFromCookie(req.headers.cookie),
        setSessionId(sessionId) {
          res.setHeader('set-cookie', sessionIdToCookie(sessionId));
        },
      }),
  });

  console.info('Server is running on http://localhost:50005/graphql');
})();
