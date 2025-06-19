// lib/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = "checkmate";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDB(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(uri);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(dbName);

  return cachedDb;
}
