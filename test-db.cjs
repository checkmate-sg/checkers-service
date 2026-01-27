const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

async function testDatabase() {
  console.log("🚀 Starting MongoDB test...\n");

  const mongoUri = process.env.MONGODB_CONNECTION_STRING;

  if (!mongoUri) {
    console.error("❌ MONGODB_CONNECTION_STRING is not set in .env.local");
    return;
  }

  let client;

  try {
    console.log("🔗 Connecting to MongoDB...");
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log("✅ Connected successfully!\n");

    const db = client.db();
    console.log("📊 Database name:", db.databaseName);

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("\n📁 Available collections:");
    collectionNames.forEach((name) => console.log(`  - ${name}`));

    const hasCheckers = collectionNames.includes("checkers");
    const hasVotes = collectionNames.includes("votes");

    console.log(
      `\n🔍 "checkers" collection exists: ${hasCheckers ? "✅ Yes" : "❌ No"}`
    );
    console.log(
      `🔍 "votes" collection exists: ${hasVotes ? "✅ Yes" : "❌ No"}`
    );

    if (hasCheckers) {
      const checkersCount = await db.collection("checkers").countDocuments();
      console.log(`📈 Total documents in "checkers": ${checkersCount}`);
    }

    if (hasVotes) {
      const votesCount = await db.collection("votes").countDocuments();
      console.log(`📈 Total documents in "votes": ${votesCount}`);
    }
  } catch (err) {
    console.error("❌ Error during DB test:", err);
  } finally {
    await client?.close();
  }

  console.log("\n✅ Test completed.");
}

testDatabase();
