import url from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Re-export MongoDB for ease of use.
export * from 'mongodb';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// TODO: have just one .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a mongodb client.
const client = new MongoClient(
  `mongodb://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@localhost:${process.env.DATABASE_PORT}`,
);

// And use it with the configured database.
export const mongodb = client.db(process.env.DATABASE_DB);

// The setup function for configuring MongoDB on startup. Failing the setup will fail the startup.
(async function setup() {
  // Unique index on user email.
  mongodb.collection('user').createIndex({ email: 1 }, { unique: true });
  // Create an index for fulltext search operations on the task collection.
  mongodb
    .collection('task')
    .createIndex({ title: 'text', description: 'text' });
})().catch((err) => {
  console.error('Problem while setting up MongoDB', err);
  process.exit(1);
});
