import url from 'url';
import path from 'path';

// Path to the GraphQL schema file.
export const schemaFile = path.join(
  url.fileURLToPath(new URL('.', import.meta.url)),
  'schema.graphql',
);
