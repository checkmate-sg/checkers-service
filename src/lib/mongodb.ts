// lib/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = "checkmate";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDB(): Promise<Db> {
  console.log("[MongoDB] Starting connection...");

  // Check if we have a cached connection and if it's still valid
  if (cachedClient && cachedDb) {
    try {
      // Test if the connection is still alive
      await cachedClient.db("admin").command({ ping: 1 });
      console.log("[MongoDB] Using cached connection");
      return cachedDb;
    } catch (err) {
      console.log("[MongoDB] Cached connection is stale, creating new one");
      // Connection is stale, reset cache
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!uri) {
    console.error("[MongoDB] MONGODB_URI is not defined");
    throw new Error("MONGODB_URI is not defined");
  }

  console.log("[MongoDB] Creating new connection...");

  try {
    const client = new MongoClient(uri, {
      // Add connection options for better reliability
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 10000, // 10 second timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    });

    await client.connect();
    console.log("[MongoDB] Connection successful");

    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("[MongoDB] Ping successful");

    cachedClient = client;
    cachedDb = client.db(dbName);

    console.log("[MongoDB] Database selected:", dbName);
    return cachedDb;
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    console.error(
      "[MongoDB] Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // Reset cache on error
    cachedClient = null;
    cachedDb = null;

    throw new Error(
      `MongoDB connection failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
