import { createServer, IncomingMessage } from 'node:http';
import { createHandler } from 'graphql-http/lib/use/node';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  buildSchema,
  createContext,
  execute,
  // TODO: implement subscriptions
  // subscribe,
} from '@database/postgraphile/schema';

const SESSION_REQUEST_TO_ID_MAP = new WeakMap<IncomingMessage, string>();

(async () => {
  // Create the GraphQL over HTTP Node request handler
  const handler = createHandler({
    schema: await buildSchema(),
    context: (req) =>
      createContext({
        sessionId: sessionIdFromCookie(req.raw.headers.cookie),
        setSessionId(sessionId) {
          SESSION_REQUEST_TO_ID_MAP.set(req.raw, sessionId);
        },
      }),
    execute,
  });

  // Create a HTTP server using the listner on `/graphql`
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/graphql')) {
      const sessionId = SESSION_REQUEST_TO_ID_MAP.get(req);
      if (sessionId) {
        res.setHeader('set-cookie', sessionIdToCookie(sessionId));
      }
      handler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });

  server.listen(50005);
  console.info('Server is running on http://localhost:50005/graphql');
})();
