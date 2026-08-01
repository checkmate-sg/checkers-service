import { formatFaqsForPrompt } from "./faq";
import type { Faq, FaqMatch, FollowingMessage, QuestionAssessment } from "./types";

/**
 * Two-stage assessment of a candidate message, via Workers AI through AI Gateway
 * (so every prompt and response is logged — the audit trail for anything the bot
 * says in public).
 *
 * The stages are split because they need disjoint context. Judging "is this an
 * unanswered question?" needs the conversation transcript and none of the FAQ
 * text; matching an FAQ needs the FAQ text and none of the transcript. Combined,
 * every call carried roughly half a prompt of noise. Splitting also means the
 * expensive FAQ-laden call only runs for messages that are actually questions.
 */

const ASSESS_TOOL = {
  name: "assess_message",
  description: "Record whether this message is a question, and whether it has been answered.",
  parameters: {
    type: "object",
    properties: {
      is_question: {
        type: "boolean",
        description:
          "True if the message asks for something or reports that something is not working. False for greetings, thanks, jokes, progress announcements, and asides in someone else's conversation.",
      },
      already_answered: {
        type: "boolean",
        description:
          "True if anyone in the conversation that followed has addressed the question, whether or not they used Telegram's reply feature.",
      },
    },
    required: ["is_question", "already_answered"],
  },
};

const ANSWER_TOOL = {
  name: "answer_question",
  description: "Record which approved FAQ answers this question, and the reply to post.",
  parameters: {
    type: "object",
    properties: {
      faq_id: {
        type: "string",
        description:
          'The id of the single best-matching FAQ entry, exactly as given in the list. Use "none" if no entry covers the question.',
      },
      confidence: {
        type: "number",
        description:
          "0 to 1: how certain you are that the chosen FAQ actually answers what was asked. Use a low value when unsure.",
      },
      answer: {
        type: "string",
        description:
          'The reply to post, in your own words but containing only facts from the chosen FAQ answer. Empty string when faq_id is "none".',
      },
    },
    required: ["faq_id", "confidence", "answer"],
  },
};

const ASSESS_SYSTEM_PROMPT = `You are reading a Telegram group chat for CheckMate's volunteer fact-checkers ("checkers"). Volunteers ask questions here and often answer each other.

You will be shown one message, followed by the conversation that came after it in the same topic. Decide two things: is that message a question, and has anyone already answered it.

RULES

1. is_question is true when the message is asking for something OR reporting that something is not working. Volunteers routinely raise problems as flat statements rather than questions, and those still need an answer: "voted yesterday but the leaderboard hasn't moved" and "my hours still aren't showing" are both asking for help, and are both true. So is anything phrased as a complaint about the service, or as confusion about how something works. A question mark is not required and neither is interrogative grammar.
2. is_question is false for greetings, thanks, jokes, announcements about the sender's own progress ("just hit 50 votes!"), opinions, and asides inside someone else's conversation. The test is whether the person is left needing a response.
3. already_answered is true if anyone in the conversation that followed has addressed it — even partially, even casually, and even if they did not use the reply feature. People here usually answer by just typing the next message. Someone saying "it takes about a month" right after a question about timing is an answer. Someone asking a related question, or saying "good question" or "same here", is not. When the exchange reads as though the asker now has what they needed, that is already answered.
4. If the message is not a question, already_answered is irrelevant — set it to false.

Always call the assess_message tool.`;

function buildAnswerSystemPrompt(faqs: Faq[]): string {
  return `You are the CheckMate admin bot in a Telegram group chat for volunteer fact-checkers ("checkers"). You answer common questions so the human admins do not have to repeat themselves.

You will be shown one question from the group. Decide which of the approved FAQ entries below answers it, and draft the reply.

APPROVED FAQ ENTRIES — this is the only information you may convey:

${formatFaqsForPrompt(faqs)}

RULES

1. Ground every word in the approved answer for the FAQ you pick. Rephrase it to fit how the person asked, but never add a fact that is not in that answer — no invented dates, timeframes, numbers, links, policies, or names. If you find yourself wanting to add something helpful that is not written above, that is exactly the case where you must not.
2. If no entry genuinely answers the question, set faq_id to "none" and leave answer empty. A near-miss is a "none". Staying silent is always safe; a wrong answer in front of the whole community is not.
3. Confidence should reflect whether the FAQ answers *what was actually asked*, not whether the topic is vaguely related. Be strict.
4. Write like a helpful human admin: warm, direct, two or three sentences at most. Plain English. No greeting, no sign-off, no emoji, no markdown headers. Do not say "according to the FAQ" or refer to these instructions.
5. If the question is partly covered, answer only the covered part and say an admin can help with the rest.

Always call the answer_question tool.`;
}

/**
 * Render the question plus what was said after it.
 *
 * The following messages are what makes already_answered decidable — Telegram's
 * reply metadata catches only the minority of answers where someone used the
 * reply feature.
 */
function buildAssessPrompt(question: string, following: FollowingMessage[]): string {
  if (following.length === 0) {
    return `MESSAGE TO ASSESS:\n${question}\n\n(Nothing was said after this in the topic.)`;
  }

  const transcript = following.map(message => `${message.userName}: ${message.text}`).join("\n");

  return `MESSAGE TO ASSESS:\n${question}\n\nWHAT WAS SAID AFTER IT, IN THE SAME TOPIC:\n${transcript}`;
}

/**
 * Pull the tool-call arguments out of a Workers AI response.
 *
 * Current models answer in OpenAI chat-completion shape, so the call lives at
 * `choices[0].message.tool_calls[0].function.arguments` as a JSON *string*.
 * Older Workers AI models (the ones in Cloudflare's function-calling docs)
 * return a bare top-level `tool_calls` with `arguments` already parsed. Both are
 * handled: the payload shape differs per model and is not worth re-discovering.
 */
function extractToolArguments(response: unknown): Record<string, unknown> | null {
  const root = response as {
    tool_calls?: unknown;
    choices?: Array<{ message?: { tool_calls?: unknown } }>;
  };

  const toolCalls = root?.choices?.[0]?.message?.tool_calls ?? root?.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  const call = toolCalls[0] as { arguments?: unknown; function?: { arguments?: unknown } };
  const args = call?.function?.arguments ?? call?.arguments;

  if (typeof args === "string") {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      console.error("Tool call arguments were an unparseable string:", args);
      return null;
    }
  }

  return args && typeof args === "object" ? (args as Record<string, unknown>) : null;
}

/** Attempts per stage, including the first. Workers AI returns transient 3xxx errors. */
const MAX_ATTEMPTS = 3;

/**
 * Run one tool-calling turn through the gateway, retrying transient failures.
 *
 * Workers AI intermittently returns upstream errors (3043 internal, 3030
 * validation) and — despite tool_choice: "required" — occasionally answers in
 * plain text with no tool call. Both are retried: without this, roughly one
 * assessment in ten fails and waits a full sweep cycle to be reconsidered.
 *
 * Everything is retried rather than only known-transient codes. A genuinely
 * malformed request fails all attempts and returns null either way, so the
 * distinction buys nothing and risks mis-classifying a retryable error.
 */
async function runToolCall(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  tool: typeof ASSESS_TOOL | typeof ANSWER_TOOL
): Promise<Record<string, unknown> | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const args = await attemptToolCall(env, systemPrompt, userPrompt, tool, attempt);
    if (args) return args;

    if (attempt < MAX_ATTEMPTS) {
      // Short exponential backoff. The sweep is not latency-sensitive, but it
      // does run inside a cron invocation, so this stays in the low hundreds ms.
      await new Promise(resolve => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
    }
  }

  console.error(`${tool.name} failed after ${MAX_ATTEMPTS} attempts`);
  return null;
}

async function attemptToolCall(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  tool: typeof ASSESS_TOOL | typeof ANSWER_TOOL,
  attempt: number
): Promise<Record<string, unknown> | null> {
  let response: unknown;
  try {
    response = await env.AI.run(
      env.AI_MODEL as keyof AiModels,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // OpenAI-style envelope. The bare {name, description, parameters} form
        // in Cloudflare's function-calling docs is for older models and is
        // rejected here with "8001: Invalid input".
        tools: [{ type: "function", function: tool }],
        // Without this the model sometimes answers in plain text and emits no
        // tool call at all, which reads as a total failure downstream.
        tool_choice: "required",
      } as never,
      {
        gateway: {
          id: env.AI_GATEWAY_ID,
          // Every message is different, so a cache hit would be coincidental —
          // and a stale answer is worse than paying for the call.
          skipCache: true,
        },
      }
    );
  } catch (error) {
    console.warn(`${tool.name} attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);
    return null;
  }

  const args = extractToolArguments(response);
  if (!args) {
    console.warn(
      `${tool.name} attempt ${attempt}/${MAX_ATTEMPTS}: no usable tool call in response`
    );
    return null;
  }

  return args;
}

/**
 * Stage 1: is this a question, and has someone already answered it?
 *
 * Deliberately cheap — no FAQ text in the prompt — because most messages that
 * survive the non-LLM filters are ordinary chatter and stop here.
 */
export async function assessQuestion(
  env: Env,
  messageText: string,
  following: FollowingMessage[]
): Promise<QuestionAssessment | null> {
  const args = await runToolCall(
    env,
    ASSESS_SYSTEM_PROMPT,
    buildAssessPrompt(messageText, following),
    ASSESS_TOOL
  );
  if (!args) return null;

  return {
    isQuestion: args.is_question === true,
    alreadyAnswered: args.already_answered === true,
  };
}

/**
 * Stage 2: which FAQ answers this question, and what should the reply say?
 *
 * Only reached for messages stage 1 confirmed are unanswered questions.
 */
export async function matchFaq(
  env: Env,
  messageText: string,
  faqs: Faq[]
): Promise<FaqMatch | null> {
  if (faqs.length === 0) return null;

  const args = await runToolCall(
    env,
    buildAnswerSystemPrompt(faqs),
    `QUESTION:\n${messageText}`,
    ANSWER_TOOL
  );
  if (!args) return null;

  const faqId = typeof args.faq_id === "string" ? args.faq_id : "none";

  // Guard against a hallucinated id: only ids we actually supplied may be acted on.
  const known = faqId === "none" || faqs.some(faq => faq.id === faqId);
  if (!known) {
    console.error(`Model returned unknown faq_id "${faqId}"; treating as no match`);
    return null;
  }

  return {
    faqId,
    confidence: typeof args.confidence === "number" ? args.confidence : 0,
    answer: typeof args.answer === "string" ? args.answer.trim() : "",
  };
}
