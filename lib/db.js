// Cached MongoDB connection helper for Next.js (handles dev hot-reload).
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'safar';
if (!uri) throw new Error('MONGO_URL is not defined in environment');

let cached = global._safarMongo;
if (!cached) cached = global._safarMongo = { client: null, db: null, promise: null };

export async function getDb() {
  if (cached.db) return cached.db;
  if (!cached.promise) {
    cached.promise = MongoClient.connect(uri, { maxPoolSize: 10 }).then((client) => {
      cached.client = client;
      cached.db = client.db(dbName);
      return cached.db;
    });
  }
  return cached.promise;
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

// Ensure indexes (idempotent, called lazily)
let _ensured = false;
export async function ensureIndexes() {
  if (_ensured) return;
  const users = await getCollection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  _ensured = true;
}
