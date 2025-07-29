// test-db.js
// Place this file in your project root directory (same level as package.json)

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" }); // Load environment variables

async function testDatabase() {
  console.log("🚀 Starting database test...\n");

  // Check environment variables
  console.log("📋 Environment Variables Check:");
  console.log(
    "MONGODB_URI:",
    process.env.MONGODB_URI ? "✅ Present" : "❌ Missing"
  );
  console.log(
    "TELEGRAM_BOT_TOKEN:",
    process.env.TELEGRAM_BOT_TOKEN ? "✅ Present" : "❌ Missing"
  );
  console.log(
    "NEXTAUTH_SECRET:",
    process.env.NEXTAUTH_SECRET ? "✅ Present" : "❌ Missing"
  );
  console.log("");

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set in environment variables");
    return;
  }

  let client;

  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB successfully!\n");

    // Get database (MongoDB will use the database name from your connection string)
    const db = client.db();
    console.log("📊 Database name:", db.databaseName);

    // List all collections
    console.log("\n📁 Available collections:");
    const collections = await db.listCollections().toArray();
    collections.forEach((collection) => {
      console.log(`  - ${collection.name}`);
    });

    // Check if 'checkers' collection exists
    const checkersExists = collections.some((col) => col.name === "checkers");
    console.log(
      '\n🔍 "checkers" collection exists:',
      checkersExists ? "✅ Yes" : "❌ No"
    );

    if (!checkersExists) {
      console.log('❌ The "checkers" collection does not exist!');
      return;
    }

    // Get the checkers collection
    const checkersCollection = db.collection("checkers");

    // Count total documents
    const totalCount = await checkersCollection.countDocuments();
    console.log(`📈 Total documents in "checkers" collection: ${totalCount}`);

    if (totalCount === 0) {
      console.log('❌ No documents found in "checkers" collection!');
      return;
    }

    // Get a sample document to see the structure
    console.log("\n🔬 Sample document structure:");
    const sampleDoc = await checkersCollection.findOne();
    if (sampleDoc) {
      console.log("Available fields:", Object.keys(sampleDoc));
      console.log("Sample document:", JSON.stringify(sampleDoc, null, 2));
    }

    // Test different ways to find the specific user
    const telegramIdToFind = "547271064";

    console.log(
      `\n🎯 Searching for user with telegramId: "${telegramIdToFind}"`
    );

    // Method 1: Search as string
    console.log("\n1️⃣  Searching with telegramId as STRING:");
    const userAsString = await checkersCollection.findOne({
      telegramId: telegramIdToFind,
    });
    console.log("Result:", userAsString ? "✅ Found" : "❌ Not found");
    if (userAsString) {
      console.log("User data:", JSON.stringify(userAsString, null, 2));
    }

    // Method 2: Search as number
    console.log("\n2️⃣  Searching with telegramId as NUMBER:");
    const userAsNumber = await checkersCollection.findOne({
      telegramId: parseInt(telegramIdToFind),
    });
    console.log("Result:", userAsNumber ? "✅ Found" : "❌ Not found");
    if (userAsNumber) {
      console.log("User data:", JSON.stringify(userAsNumber, null, 2));
    }

    // Method 3: Search with different field names (in case field name is different)
    console.log("\n3️⃣  Searching with different field names:");
    const alternativeFields = [
      "telegram_id",
      "telegramID",
      "telegram_user_id",
      "tgId",
    ];

    for (const fieldName of alternativeFields) {
      const userAlt = await checkersCollection.findOne({
        [fieldName]: telegramIdToFind,
      });
      console.log(`   ${fieldName}:`, userAlt ? "✅ Found" : "❌ Not found");
      if (userAlt) {
        console.log(`   Data:`, JSON.stringify(userAlt, null, 2));
        break;
      }
    }

    // Method 4: Show all documents to see what's actually in the collection
    console.log("\n4️⃣  All documents in collection (first 5):");
    const allDocs = await checkersCollection.find().limit(5).toArray();
    allDocs.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`, JSON.stringify(doc, null, 2));
    });

    // Method 5: Search for any document that might contain our telegram ID in any field
    console.log(
      '\n5️⃣  Searching for documents containing "547271064" in any field:'
    );
    const regexSearch = await checkersCollection
      .find({
        $or: [
          { telegramId: telegramIdToFind },
          { telegramId: parseInt(telegramIdToFind) },
          { telegram_id: telegramIdToFind },
          { telegram_id: parseInt(telegramIdToFind) },
          { id: telegramIdToFind },
          { id: parseInt(telegramIdToFind) },
          { _id: telegramIdToFind },
        ],
      })
      .toArray();

    console.log(`Found ${regexSearch.length} documents with regex search`);
    if (regexSearch.length > 0) {
      regexSearch.forEach((doc, index) => {
        console.log(`Match ${index + 1}:`, JSON.stringify(doc, null, 2));
      });
    }
  } catch (error) {
    console.error("❌ Database test failed:", error);
    console.error("Error details:", error.message);
  } finally {
    // Close connection
    if (client) {
      await client.close();
      console.log("\n🔒 Database connection closed");
    }
  }
}

// Run the test
testDatabase()
  .then(() => {
    console.log("\n✅ Database test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Database test failed:", error);
    process.exit(1);
  });
