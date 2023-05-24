import Fastify from 'fastify';
import mercurius from 'mercurius';
import { sessionIdFromCookie, sessionIdToCookie } from '@server/utils';
import {
  buildSchema,
  createContext,
} from '@database/postgres-with-prisma/schema';

(async () => {
  const app = Fastify();

  app.register(mercurius, {
    schema: await buildSchema(),
    context: (req, reply) =>
      createContext({
        sessionId: sessionIdFromCookie(req.headers['cookie']),
        setSessionId(sessionId) {
          reply.header('set-cookie', sessionIdToCookie(sessionId));
        },
      }),
  });

  app.listen({ port: 50005 });

  console.info('Server is running on http://localhost:50005/graphql');
})();
