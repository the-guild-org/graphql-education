import Fastify from 'fastify';
import mercurius from 'mercurius';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/common';
import { Context } from '@schema/authentication';
import { buildSchema } from '@database/mongodb/schema/authentication';

const app = Fastify();

app.register(mercurius, {
  schema: await buildSchema(),
  context: (req, reply) =>
    ({
      sessionId: sessionIdFromCookie(req.headers['cookie']),
      setSessionId(sessionId) {
        reply.header('set-cookie', sessionIdToCookie(sessionId));
      },
    } satisfies Context),
});

app.listen({ port: 50005 });

console.info('Server is running on http://localhost:50005/graphql');
