import { createServer } from 'node:http';
import { createYoga, Plugin } from 'graphql-yoga';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  createSchema,
  createContext,
  execute,
  subscribe,
} from '@database/postgres-with-postgraphile/schema';

const SESSION_REQUEST_TO_ID_MAP = new WeakMap<Request, string>();

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({
  schema: createSchema,
  context: ({ request }) =>
    createContext({
      sessionId: sessionIdFromCookie(request.headers.get('cookie')),
      setSessionId(sessionId) {
        SESSION_REQUEST_TO_ID_MAP.set(request, sessionId);
      },
    }),
  plugins: [
    {
      onExecute({ setExecuteFn }) {
        setExecuteFn(execute);
      },
      onSubscribe({ setSubscribeFn }) {
        setSubscribeFn(subscribe);
      },
      onResponse({ request, response }) {
        const sessionId = SESSION_REQUEST_TO_ID_MAP.get(request);
        if (sessionId) {
          response.headers.set('set-cookie', sessionIdToCookie(sessionId));
        }
      },
    } as Plugin,
  ],
});

// Pass it into a server to hook into request handlers.
const server = createServer(yoga);

// Start the server and you're done!
server.listen(50005, () => {
  console.info('Server is running on http://localhost:50005/graphql');
});
