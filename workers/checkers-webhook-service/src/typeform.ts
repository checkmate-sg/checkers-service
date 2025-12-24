/**
 * Typeform webhook handler for quiz completion
 */
import { Context } from "hono";

interface TypeformAnswer {
  type: string;
  phone_number?: string;
  text?: string;
  choices?: {
    ids: string[];
    labels: string[];
    refs: string[];
  };
  field: {
    id: string;
    type: string;
    ref: string;
  };
}

interface TypeformWebhookPayload {
  form_response: {
    form_id: string;
    hidden?: {
      phone?: string;
      name?: string;
    };
    answers?: TypeformAnswer[];
    calculated?: {
      score: number;
    };
  };
}

/**
 * Verify Typeform webhook signature using HMAC-SHA256
 */
async function verifySignature(
  signature: string | undefined,
  payload: string,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  // Typeform signature format: "sha256=<hash>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) {
    return false;
  }

  const providedHash = signature.slice(expectedPrefix.length);

  // Create HMAC-SHA256 hash
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  // Convert to base64
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computedHash = btoa(String.fromCharCode(...hashArray));

  return computedHash === providedHash;
}

/**
 * Handle Typeform webhook for quiz completion
 */
export async function handleTypeformWebhook(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;

  try {
    const signature = c.req.header("typeform-signature");
    const rawBody = await c.req.text();

    // Verify signature if secret is configured
    if (env.TYPEFORM_SECRET_TOKEN) {
      const isValid = await verifySignature(signature, rawBody, env.TYPEFORM_SECRET_TOKEN);
      if (!isValid) {
        console.warn("Typeform signature mismatch");
        return c.json({ status: "ok" }, 200);
      }
    }

    const body: TypeformWebhookPayload = JSON.parse(rawBody);

    // Verify form ID matches expected form
    const formId = body.form_response?.form_id ?? "";
    const expectedFormId = env.TYPEFORM_URL?.split("/").pop();
    if (expectedFormId && formId !== expectedFormId) {
      console.warn(`Typeform response from unexpected form: ${formId}`);
      return c.json({ status: "ok" }, 200);
    }

    // Extract whatsappId from hidden fields or answers
    let whatsappId = "";
    const answers = body.form_response?.answers ?? [];

    if (body.form_response?.hidden?.phone) {
      whatsappId = body.form_response.hidden.phone;
    } else if (answers.length > 0) {
      const phoneAnswer = answers.find(answer => answer.type === "phone_number");
      if (phoneAnswer?.phone_number) {
        // Remove leading + if present
        whatsappId = phoneAnswer.phone_number.startsWith("+")
          ? phoneAnswer.phone_number.substring(1)
          : phoneAnswer.phone_number;
      }
    }

    if (!whatsappId) {
      console.warn("No whatsappId obtained in the typeform response");
      return c.json({ status: "ok" }, 200);
    }

    // Find and update checker
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ whatsappId });

    if (result.success && result.data) {
      const quizScore = body.form_response?.calculated?.score ?? null;

      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { whatsappId },
        {
          $set: {
            isQuizComplete: true,
            quizScore,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`Checker with whatsappId ${whatsappId} quiz completed with score ${quizScore}`);
    } else {
      console.warn(
        `Checker with whatsappId ${whatsappId} not found - may not have onboarded via telegram`
      );
    }

    return c.json({ status: "ok" }, 200);
  } catch (error) {
    console.error("Error in handleTypeformWebhook:", error);
    return c.json({ status: "ok" }, 200);
  }
}
