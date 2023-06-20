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
