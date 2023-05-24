import Fastify from 'fastify';
import mercurius from 'mercurius';
import { buildSchema } from '@database/postgres-with-prisma/schema';

(async () => {
  const app = Fastify();

  app.register(mercurius, {
    schema: await buildSchema(),
  });

  app.listen({ port: 50005 });

  console.info('Server is running on http://localhost:50005/graphql');
})();
