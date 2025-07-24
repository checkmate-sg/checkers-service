import { connectToDB } from "@/lib/mongodb";

export async function findUserByTelegramID(telegramId: string) {
  console.log("[DB] Attempting to find user with telegramId:", telegramId);
  console.log("[DB] TelegramId type:", typeof telegramId);

  try {
    const db = await connectToDB();
    console.log("[DB] Database connection successful");

    const voter = await db.collection("checkers").findOne({ telegramId });
    console.log("[DB] Query result:", voter);
    console.log("[DB] Found voter:", voter ? "YES" : "NO");

    if (!voter) return null;

    return {
      id: voter._id.toString(),
      telegramId: voter.telegramId,
      name: voter.name || "No Name",
    };
  } catch (error) {
    console.error("[DB] Database error:", error);
    return null;
  }
}
