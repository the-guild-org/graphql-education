import { ApolloServer } from 'apollo-server';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  createSchema,
  createContext,
  execute,
  // TODO: implement subscriptions
  // subscribe,
} from '@database/postgraphile/schema';

(async () => {
  const schema = await createSchema();

  const server = new ApolloServer({
    schema,
    executor: async ({
      schema,
      context: contextValue,
      operationName,
      document,
      request: { variables: variableValues },
    }) =>
      execute({
        schema,
        contextValue,
        operationName,
        document,
        variableValues,
      }),
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
