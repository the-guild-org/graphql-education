import { createServer, IncomingMessage } from 'node:http';
import { createHandler } from 'graphql-http/lib/use/http';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/common';
import { Context } from '@schema/authentication';
import { buildSchema } from '@database/mongodb/schema/authentication';

const SESSION_REQUEST_TO_ID_MAP = new WeakMap<IncomingMessage, string>();

const handler = createHandler<Context>({
  schema: await buildSchema(),
  context: (req) => ({
    sessionId: sessionIdFromCookie(req.raw.headers.cookie),
    setSessionId(sessionId) {
      SESSION_REQUEST_TO_ID_MAP.set(req.raw, sessionId);
    },
  }),
});

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