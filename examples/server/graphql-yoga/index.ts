import { createServer } from 'node:http';
import { createYoga, Plugin } from 'graphql-yoga';
import {
  createSchema,
  createContext,
  execute,
  subscribe,
} from '@database/postgres-with-postgraphile/schema';
import * as cookie from 'cookie';

const SESSION_ID_COOKIE_KEY = 'graphql.education.sid';
const SESSION_REQUEST_TO_ID_MAP = new WeakMap<Request, string>();

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({
  schema: createSchema,
  context: ({ request }) => {
    const { [SESSION_ID_COOKIE_KEY]: sessionId } = cookie.parse(
      String(request.headers.get('cookie')),
    );
    return createContext({
      sessionId,
      setSessionId(sessionId) {
        SESSION_REQUEST_TO_ID_MAP.set(request, sessionId);
      },
    });
  },
  plugins: [
    {
      onExecute({ setExecuteFn }) {
        setExecuteFn(execute);
      },
      onSubscribe({ setSubscribeFn }) {
        setSubscribeFn(subscribe);
      },
      onResponse({ request, response }) {
        // TODO: use hmac to sign the session id making sure it originated from us
        const sessionId = SESSION_REQUEST_TO_ID_MAP.get(request);
        if (sessionId) {
          response.headers.set(
            'set-cookie',
            cookie.serialize(SESSION_ID_COOKIE_KEY, sessionId, {
              httpOnly: true, // cannot be accessed through JavaScript by browsers
              sameSite: 'lax', // sent from same website and when navigating to the website
              maxAge: 10 * 60, // 10 minutes
              // use secure cookies when serving over HTTPS
              // secure: true,
            }),
          );
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
