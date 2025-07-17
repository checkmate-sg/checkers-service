import { connectToDB } from "@/lib/mongodb";

export async function findUserByTelegramID(telegramId: string) {
  const db = await connectToDB();
  const voter = await db.collection("checkers").findOne({ telegramId });

  if (!voter) return null;

  return {
    id: voter._id.toString(),
    telegramId: voter.telegramId,
    name: voter.name || "No Name",
    //onboarded: voter.onboarded ?? true, // or set your own logic
  };
}
