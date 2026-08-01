import bundledFaqs from "../../../parameters/faqs.json";
import type { Faq } from "./types";

/**
 * FAQ content is authored in parameters/faqs.json and read from KV at runtime,
 * so editing an answer is a KV upload rather than a deploy.
 *
 * The same file is also bundled into the Worker as a fallback, mirroring how
 * PARAMETER_DEFAULTS backs the numeric parameters in shared/helpers/parameters.ts.
 * That is what makes local dev work: each worker keeps its own
 * .wrangler/state/v3/kv, so `pnpm upload-parameters:local` (which writes to the
 * repo-root state directory) is invisible here.
 *
 * The fallback is safe because it is the same reviewed, version-controlled copy
 * that gets uploaded — never unapproved content. Which source was used is logged,
 * because a deployed bundle can drift from KV once someone edits one and not the
 * other.
 */
const FAQ_KV_KEY = "FAQS";

const BUNDLED = (bundledFaqs as { faqs: Faq[] }).faqs ?? [];

/** Drop entries the bot could not act on: no id, nothing to match, or nothing to say. */
function usable(faqs: Faq[]): Faq[] {
  return faqs.filter(faq => faq.id && faq.answer && faq.questions?.length);
}

/**
 * Load the FAQ set: KV if present, otherwise the bundled copy.
 *
 * Returns [] only when both are unusable, which the sweep treats as "stay
 * silent" — with no grounding source the bot has nothing it is allowed to say.
 */
export async function loadFaqs(kv: KVNamespace): Promise<Faq[]> {
  try {
    const raw = await kv.get(FAQ_KV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { faqs?: Faq[] };
      if (Array.isArray(parsed.faqs)) {
        return usable(parsed.faqs);
      }
      console.error(`FAQ key "${FAQ_KV_KEY}" is malformed: expected { faqs: [...] }`);
    } else {
      console.warn(
        `FAQ key "${FAQ_KV_KEY}" not set in KV; using the ${BUNDLED.length} bundled ` +
          `entries from parameters/faqs.json`
      );
    }
  } catch (error) {
    console.error("Reading FAQs from KV failed, falling back to bundled copy:", error);
  }

  return usable(BUNDLED);
}

/**
 * Render the FAQ set for the prompt.
 *
 * Every phrasing is listed, not just the first: they are the examples the model
 * matches an incoming message against, so wording that only appears in the
 * `questions` array is exactly what widens recognition beyond the obvious.
 * Ids must round-trip so the chosen entry can be matched back in code.
 */
export function formatFaqsForPrompt(faqs: Faq[]): string {
  return faqs
    .map(faq => {
      const asked = faq.questions.map(question => `- ${question}`).join("\n");
      return `[${faq.id}]\nAsked as:\n${asked}\nApproved answer: ${faq.answer}`;
    })
    .join("\n\n");
}
