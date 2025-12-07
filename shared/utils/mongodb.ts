// lib/mongodb.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = "checkmate-checkers-app";

export async function connectToDB(): Promise<Db> {
  console.log("[MongoDB] Starting connection...");

  if (!uri) {
    console.error("[MongoDB] MONGODB_URI is not defined");
    throw new Error("MONGODB_URI is not defined");
  }

  console.log("[MongoDB] Creating new connection...");

  try {
    const client = new MongoClient(uri);

    await client.connect();
    console.log("[MongoDB] Connection successful");

    console.log("[MongoDB] Database selected:", dbName);
    return client.db(dbName);
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    console.error(
      "[MongoDB] Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );

    throw new Error(
      `MongoDB connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
