import crypto from "crypto";

type VerifiedTelegramData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  [key: string]: any;
};

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): VerifiedTelegramData {
  const secret = crypto.createHash("sha256").update(botToken).digest();

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) throw new Error("Missing hash in initData");

  urlParams.delete("hash");

  const sorted = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const hmac = crypto.createHmac("sha256", secret).update(sorted).digest("hex");

  if (hmac !== hash) throw new Error("Invalid initData signature");

  // Parse the user data from the 'user' parameter
  const userParam = urlParams.get("user");
  if (!userParam) throw new Error("Missing user data in initData");

  let userData;
  try {
    userData = JSON.parse(userParam);
  } catch (error) {
    throw new Error("Invalid user data format in initData");
  }

  if (!userData.id) throw new Error("Missing user ID in Telegram data");

  return {
    ...userData,
    id: Number(userData.id), // Ensure ID is a number
  };
}
