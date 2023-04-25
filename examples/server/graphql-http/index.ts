import { createServer } from 'node:http';
import { createHandler } from 'graphql-http/lib/use/node';
import { schema, createContext } from '@database/postgres-with-prisma/schema';

// Create the GraphQL over HTTP Node request handler
const handler = createHandler({ schema, context: createContext });

// Create a HTTP server using the listner on `/graphql`
const server = createServer((req, res) => {
  if (req.url?.startsWith('/graphql')) {
    handler(req, res);
  } else {
    res.writeHead(404).end();
  }
});

server.listen(50005);
console.info('Server is running on http://localhost:50005/graphql');
