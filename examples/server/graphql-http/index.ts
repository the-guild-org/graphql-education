import { createServer, IncomingMessage } from 'node:http';
import { createHandler } from 'graphql-http/lib/use/node';
import { schema, createContext } from '@database/postgres-with-prisma/schema';
import * as cookie from 'cookie';

const SESSION_ID_COOKIE_KEY = 'graphql.education.sid';
const SESSION_REQUEST_TO_ID_MAP = new WeakMap<IncomingMessage, string>();

// Create the GraphQL over HTTP Node request handler
const handler = createHandler({
  schema,
  context: (req) => {
    const { [SESSION_ID_COOKIE_KEY]: sessionId } = cookie.parse(
      String(req.raw.headers.cookie),
    );
    return createContext({
      sessionId,
      setSessionId(sessionId) {
        SESSION_REQUEST_TO_ID_MAP.set(req.raw, sessionId);
      },
    });
  },
});

// Create a HTTP server using the listner on `/graphql`
const server = createServer((req, res) => {
  if (req.url?.startsWith('/graphql')) {
    const sessionId = SESSION_REQUEST_TO_ID_MAP.get(req);
    if (sessionId) {
      res.setHeader(
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
    handler(req, res);
  } else {
    res.writeHead(404).end();
  }
});

server.listen(50005);
console.info('Server is running on http://localhost:50005/graphql');
