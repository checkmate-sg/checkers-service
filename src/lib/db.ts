import { connectToDB } from "@/lib/mongodb";

export async function findUserByTelegramID(telegramId: string) {
  console.log("[DB] Attempting to find user with telegramId:", telegramId);
  console.log("[DB] TelegramId type:", typeof telegramId);

  try {
    const db = await connectToDB();
    console.log("[DB] Database connection successful");

    // Make sure we're querying the right field - check your MongoDB collection
    const voter = await db.collection("checkers").findOne({
      telegramId: telegramId, // Make sure this field exists and matches
    });

    console.log("[DB] Query executed for telegramId:", telegramId);
    console.log("[DB] Query result:", voter);
    console.log("[DB] Found voter:", voter ? "YES" : "NO");

    if (!voter) {
      console.log("[DB] No user found with telegramId:", telegramId);
      return null;
    }

    const result = {
      id: voter._id.toString(),
      telegramId: voter.telegramId,
      name: voter.name || "No Name",
    };

    console.log("[DB] Returning user:", result);
    return result;
  } catch (error) {
    console.error("[DB] Database error:", error);
    console.error(
      "[DB] Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Don't return null on database errors - throw them so NextAuth can handle properly
    throw new Error(
      `Database error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
