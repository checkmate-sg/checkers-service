import { connectToDB } from "@/lib/mongodb";

export async function findUserByTelegramID(telegramId: string) {
  console.log("[DB] ===== STARTING DATABASE LOOKUP =====");
  console.log("[DB] Searching for telegramId:", telegramId);
  console.log("[DB] TelegramId type:", typeof telegramId);

  try {
    console.log("[DB] Step 1: Connecting to database...");
    const db = await connectToDB();
    console.log("[DB] Step 2: Database connection successful");

    console.log("[DB] Step 3: Executing query...");
    const checker = await db.collection("checkers").findOne({
      telegramId: telegramId,
    });

    console.log("[DB] Step 4: Query completed");
    console.log("[DB] Raw query result:", checker);
    console.log("[DB] Found checker:", checker ? "YES" : "NO");

    if (!checker) {
      console.log("[DB] ❌ No checker found with telegramId:", telegramId);
      return null;
    }

    console.log("[DB] Step 5: Processing result...");
    const result = {
      id: checker._id.toString(),
      telegramId: checker.telegramId,
      name: checker.name || "No Name",
      phoneNumber: checker.phoneNumber || null,
      correctVotes: checker.correctVotes || 0,
      totalVotes: checker.totalVotes || 0,
      // Calculate accuracy percentage
      accuracy:
        checker.totalVotes > 0
          ? Math.round((checker.correctVotes / checker.totalVotes) * 100)
          : 0,
    };

    console.log("[DB] ✅ Returning processed result:", result);
    return result;
  } catch (error) {
    console.error("[DB] ===== DATABASE ERROR =====");
    console.error("[DB] Error type:", error?.constructor?.name);
    console.error(
      "[DB] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    );
    console.error(
      "[DB] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("[DB] Full error object:", error);

    // Re-throw the error so NextAuth can handle it properly
    throw new Error(
      `Database lookup failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
