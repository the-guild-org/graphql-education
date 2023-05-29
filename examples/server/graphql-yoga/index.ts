import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/common';
import { buildSchema, createContext } from '@database/mongodb/schema';

const SESSION_REQUEST_TO_ID_MAP = new WeakMap<Request, string>();

(async () => {
  const yoga = createYoga({
    schema: await buildSchema(),
    context: ({ request }) =>
      createContext({
        sessionId: sessionIdFromCookie(request.headers.get('cookie')),
        setSessionId(sessionId) {
          SESSION_REQUEST_TO_ID_MAP.set(request, sessionId);
        },
      }),
    plugins: [
      {
        onResponse({ request, response }) {
          const sessionId = SESSION_REQUEST_TO_ID_MAP.get(request);
          if (sessionId) {
            response.headers.set('set-cookie', sessionIdToCookie(sessionId));
          }
        },
      },
    ],
  });

  const server = createServer(yoga);

  server.listen(50005, () => {
    console.info('Server is running on http://localhost:50005/graphql');
  });
})();
