import url from 'url';
import path from 'path';

// Path to the GraphQL schema file.
export const schemaPath = path.join(
  // ESM style __dirname
  url.fileURLToPath(new URL('.', import.meta.url)),
  'schema.graphql',
);