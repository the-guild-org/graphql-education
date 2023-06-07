import url from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// TODO: have just one .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Create a mongodb client.
const client = new MongoClient(
  `mongodb://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@localhost:${process.env.DATABASE_PORT}`,
);

// And use it with the configured database.
const db = client.db(process.env.DATABASE_DB);

// Define the collections that will be used from MongoDB.
export interface User {
  name: string;
  email: string;
  // TODO: storing plaintext passwords is a BAD IDEA! use bcrypt instead
  password: string;
}
export const user = db.collection<User>('user');

export interface Session {
  userId: ObjectId;
}
export const session = db.collection<Session>('session');

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export interface Task {
  createdByUserId: ObjectId;
  private: boolean;
  assigneeUserId: ObjectId | null;
  status: TaskStatus;
  title: string;
  description: string | null;
}
export const task = db.collection<Task>('task');

// The setup function for configuring MongoDB on startup. Failing the setup will fail the startup.
(async function setup() {
  // Unique index on user email.
  user.createIndex({ email: 1 }, { unique: true });
  // Create an index for fulltext search operations on the task collection.
  task.createIndex({ title: 'text', description: 'text' });
})().catch((err) => {
  console.error('Problem while setting up MongoDB', err);
  process.exit(1);
});
