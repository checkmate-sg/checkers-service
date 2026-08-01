/**
 * A chat message as the sweep sees it.
 *
 * Projected from the `chatMessages` document rather than a separate buffer —
 * the durable record already holds everything needed to decide what to answer.
 */
export interface CandidateMessage {
  messageId: number;
  userName: string;
  text: string;
  /** Unix seconds. Mongo returns `sentAt` as an ISO string over RPC; converted on read. */
  date: number;
  /**
   * Genuine reply target, or null.
   *
   * Structural topic links are stripped before this is set — see
   * `resolveReplyTarget`. Without that, the first message in every forum topic
   * looks like a reply to the topic itself.
   */
  replyToMessageId: number | null;
  /**
   * Forum topic id, or null for the General topic.
   *
   * Telegram omits `message_thread_id` entirely in General rather than sending
   * a sentinel, so absence is the signal. Must be echoed back on sendMessage or
   * the reply lands in General instead of the topic it answers.
   */
  messageThreadId: number | null;
}

/** A message that came after a candidate question, used to judge if it was answered. */
export interface FollowingMessage {
  userName: string;
  text: string;
}

/** One entry from parameters/faqs.json — the bot's entire grounding surface. */
export interface Faq {
  /** Stable id. Round-trips through the model and lands in `answeredWithFaqId`. */
  id: string;
  /**
   * Ways this question actually gets asked. All are shown to the model, so more
   * phrasings widen what it will recognise — especially wording it could not
   * infer from the canonical form alone.
   */
  questions: string[];
  /** Human-authored source of truth. The model paraphrases this; it must not go beyond it. */
  answer: string;
}

/** Stage 1: does this message need answering at all? Decided without the FAQ list. */
export interface QuestionAssessment {
  /** False for statements, chitchat, or anything that isn't actually asking something. */
  isQuestion: boolean;
  /**
   * True when someone in the chat has already answered this.
   *
   * Not derivable from `reply_to_message_id`: in practice people answer by just
   * typing, without using Telegram's reply feature, so the threading signal
   * catches only a minority of real answers.
   */
  alreadyAnswered: boolean;
}

/** Stage 2: which FAQ covers the question, and what to say. Decided without the transcript. */
export interface FaqMatch {
  /** Matching FAQ id, or "none" when nothing in the list covers it. */
  faqId: string;
  /** 0-1. Compared against FAQ_CONFIDENCE_THRESHOLD. */
  confidence: number;
  /** The reply to post, grounded in the matched FAQ's answer. */
  answer: string;
}

/** Telegram update fields we care about. Deliberately narrow. */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    is_forum?: boolean;
  };
  date: number;
  text?: string;
  reply_to_message?: {
    message_id: number;
  };
  /** Present only for messages in a non-General forum topic. */
  message_thread_id?: number;
  is_topic_message?: boolean;
  /** Service message announcing a new topic. Carries no `text`. */
  forum_topic_created?: {
    name: string;
  };
}
