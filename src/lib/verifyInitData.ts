import crypto from "crypto";

type VerifiedTelegramData = {
  id: number;
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

  const data = Object.fromEntries(urlParams.entries());

  return {
    ...data,
    id: Number(data.id), // Telegram ID as number
  };
}
