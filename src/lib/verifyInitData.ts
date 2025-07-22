type VerifiedTelegramData = {
  id: number;
  [key: string]: any;
};

export async function verifyTelegramInitData(
  initData: string,
  botToken: string
): Promise<VerifiedTelegramData> {
  // Create secret hash using Web Crypto API
  const encoder = new TextEncoder();
  const tokenBuffer = encoder.encode(botToken);
  const secretHash = await crypto.subtle.digest("SHA-256", tokenBuffer);

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");

  if (!hash) throw new Error("Missing hash in initData");

  urlParams.delete("hash");

  const sorted = [...urlParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // Create HMAC using Web Crypto API
  const key = await crypto.subtle.importKey(
    "raw",
    secretHash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sorted)
  );
  const hmac = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hmac !== hash) throw new Error("Invalid initData signature");

  const data = Object.fromEntries(urlParams.entries());
  return {
    ...data,
    id: Number(data.id), // Telegram ID as number
  };
}
