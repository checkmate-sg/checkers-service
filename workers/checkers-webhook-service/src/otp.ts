/**
 * OTP (One-Time Password) handling for WhatsApp verification
 */

interface OTPData {
  otp: string;
  whatsappId: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

interface OTPResult {
  status: "success" | "error";
  message: string;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const MAX_OTP_REQUESTS_PER_WINDOW = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to user's WhatsApp
 */
export async function sendOTP(whatsappId: string, checkerId: string, env: Env): Promise<OTPResult> {
  const kvKey = `otp:${checkerId}`;
  const rateLimitKey = `otp_rate:${checkerId}`;

  try {
    // Check rate limiting
    const rateLimitData = await env.OTP_KV.get(rateLimitKey);
    if (rateLimitData) {
      const rateLimit = JSON.parse(rateLimitData) as { count: number; windowStart: number };
      const now = Date.now();

      if (now - rateLimit.windowStart < OTP_REQUEST_WINDOW_MS) {
        if (rateLimit.count >= MAX_OTP_REQUESTS_PER_WINDOW) {
          return {
            status: "error",
            message: "OTP request limit exceeded",
          };
        }
        // Increment count
        await env.OTP_KV.put(
          rateLimitKey,
          JSON.stringify({ count: rateLimit.count + 1, windowStart: rateLimit.windowStart }),
          { expirationTtl: Math.ceil(OTP_REQUEST_WINDOW_MS / 1000) }
        );
      } else {
        // Reset window
        await env.OTP_KV.put(rateLimitKey, JSON.stringify({ count: 1, windowStart: now }), {
          expirationTtl: Math.ceil(OTP_REQUEST_WINDOW_MS / 1000),
        });
      }
    } else {
      // First request in window
      await env.OTP_KV.put(rateLimitKey, JSON.stringify({ count: 1, windowStart: Date.now() }), {
        expirationTtl: Math.ceil(OTP_REQUEST_WINDOW_MS / 1000),
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const now = Date.now();
    const otpData: OTPData = {
      otp,
      whatsappId,
      attempts: 0,
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
    };

    await env.OTP_KV.put(kvKey, JSON.stringify(otpData), {
      expirationTtl: Math.ceil(OTP_EXPIRY_MS / 1000),
    });

    // Send OTP via WhatsApp queue
    try {
      await env.WHATSAPP_MESSAGE_SERVICE.sendOtp(whatsappId, otp);
    } catch (error) {
      await env.WHATSAPP_ADHOC_MESSAGE_QUEUE.send({
        whatsappId,
        messageType: "otp",
        content: {
          otp,
        },
        metadata: {
          source: "checkers-service",
        },
      });
    }

    return {
      status: "success",
      message: "OTP sent successfully",
    };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return {
      status: "error",
      message: "Failed to send OTP",
    };
  }
}

/**
 * Verify OTP entered by user
 */
export async function checkOTP(
  otpAttempt: string,
  whatsappId: string,
  checkerId: string,
  env: Env
): Promise<OTPResult> {
  const kvKey = `otp:${checkerId}`;

  try {
    const storedData = await env.OTP_KV.get(kvKey);

    if (!storedData) {
      return {
        status: "error",
        message: "OTP expired or not found",
      };
    }

    const otpData: OTPData = JSON.parse(storedData);

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      await env.OTP_KV.delete(kvKey);
      return {
        status: "error",
        message: "OTP expired",
      };
    }

    // Check if WhatsApp ID matches
    if (otpData.whatsappId !== whatsappId) {
      return {
        status: "error",
        message: "WhatsApp ID mismatch",
      };
    }

    // Check attempts
    if (otpData.attempts >= MAX_ATTEMPTS) {
      await env.OTP_KV.delete(kvKey);
      return {
        status: "error",
        message: "OTP max attempts",
      };
    }

    // Verify OTP
    if (otpData.otp === otpAttempt.trim()) {
      // Success - delete the OTP
      await env.OTP_KV.delete(kvKey);
      return {
        status: "success",
        message: "OTP verified",
      };
    }

    // Increment attempts on failure
    otpData.attempts += 1;
    await env.OTP_KV.put(kvKey, JSON.stringify(otpData), {
      expirationTtl: Math.ceil((otpData.expiresAt - Date.now()) / 1000),
    });

    return {
      status: "error",
      message: "OTP mismatch",
    };
  } catch (error) {
    console.error("Error checking OTP:", error);
    return {
      status: "error",
      message: "Failed to verify OTP",
    };
  }
}
