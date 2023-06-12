import { createServer } from 'node:http';
import { createHandler } from 'graphql-http/lib/use/http';
import { buildSchema } from '@database/mongodb/schema/basic';

const handler = createHandler({
  schema: await buildSchema(),
});

const server = createServer((req, res) => {
  if (req.url?.startsWith('/graphql')) {
    handler(req, res);
  } else {
    res.writeHead(404).end();
  }
});

server.listen(50005);

console.info('Server is running on http://localhost:50005/graphql');
