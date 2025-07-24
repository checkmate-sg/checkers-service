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

  const secret = crypto.createHash("sha256").update(botToken).digest();

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) {
    console.error("[VerifyTelegram] Missing hash in initData");
    throw new Error("Missing hash in initData");
  }

  urlParams.delete("hash");

  const sorted = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  console.log(
    "[VerifyTelegram] Data to verify:",
    sorted.substring(0, 100) + "..."
  );

  const hmac = crypto.createHmac("sha256", secret).update(sorted).digest("hex");

  if (hmac !== hash) {
    console.error(
      "[VerifyTelegram] Hash mismatch - expected:",
      hash,
      "got:",
      hmac
    );
    throw new Error("Invalid initData signature");
  }

  console.log("[VerifyTelegram] Signature verification successful");

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
