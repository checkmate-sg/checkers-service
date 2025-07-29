// src/lib/verifyInitData.ts
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
  console.log("[VerifyTelegram] Starting verification process");

  // For Telegram Web Apps, use "WebAppData" as the constant string
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) {
    console.error("[VerifyTelegram] Missing hash in initData");
    throw new Error("Missing hash in initData");
  }

  urlParams.delete("hash");

  // Sort parameters alphabetically by key
  const sorted = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  console.log(
    "[VerifyTelegram] Data to verify:",
    sorted.substring(0, 100) + "..."
  );

  const hmac = crypto.createHmac("sha256", secret).update(sorted).digest("hex");

  console.log("[VerifyTelegram] Expected hash:", hash);
  console.log("[VerifyTelegram] Calculated hash:", hmac);

  if (hmac !== hash) {
    console.error(
      "[VerifyTelegram] Hash mismatch - expected:",
      hash,
      "got:",
      hmac
    );
    console.error("[VerifyTelegram] Sorted data string:", sorted);
    throw new Error("Invalid initData signature");
  }

  console.log("[VerifyTelegram] Signature verification successful");

  // Check auth_date to ensure the data is recent (within 24 hours)
  const authDate = urlParams.get("auth_date");
  if (authDate) {
    const authTimestamp = parseInt(authDate, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timeDiff = currentTimestamp - authTimestamp;

    // Allow 24 hours (86400 seconds) + some buffer
    if (timeDiff > 86400) {
      console.warn("[VerifyTelegram] Auth data is older than 24 hours");
      // You might want to throw an error here in production
      // throw new Error("Auth data is too old");
    }
  }

  // Parse the user data from the 'user' parameter
  const userParam = urlParams.get("user");
  if (!userParam) {
    console.error("[VerifyTelegram] Missing user data in initData");
    throw new Error("Missing user data in initData");
  }

  let userData;
  try {
    userData = JSON.parse(userParam);
    console.log("[VerifyTelegram] Parsed user data:", userData);
  } catch (error) {
    console.error("[VerifyTelegram] Error parsing user data:", error);
    throw new Error("Invalid user data format in initData");
  }

  if (!userData.id) {
    console.error("[VerifyTelegram] Missing user ID in parsed data");
    throw new Error("Missing user ID in Telegram data");
  }

  console.log(
    "[VerifyTelegram] Verification complete for user ID:",
    userData.id
  );

  return {
    ...userData,
    id: Number(userData.id), // Ensure ID is a number
  };
}
