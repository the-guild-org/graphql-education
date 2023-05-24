import { ApolloServer } from 'apollo-server';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  buildSchema,
  createContext,
} from '@database/postgres-with-prisma/schema';

(async () => {
  const server = new ApolloServer({
    schema: await buildSchema(),
    context: ({ req, res }) =>
      createContext({
        sessionId: sessionIdFromCookie(req.headers.cookie),
        setSessionId(sessionId) {
          res.setHeader('set-cookie', sessionIdToCookie(sessionId));
        },
      }),
  });

  await server.listen(50005);

  console.info('Server is running on http://localhost:50005/graphql');
})();
