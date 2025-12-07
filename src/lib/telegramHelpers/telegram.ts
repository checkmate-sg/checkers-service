/**
 * Custom Telegram Bot API methods
 * Direct HTTP calls to Telegram Bot API without using Telegraf
 */

interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: any;
  link_preview_options?: {
    is_disabled?: boolean;
  };
}

interface SendPhotoOptions {
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: any;
}

/**
 * Send a text message to a Telegram chat
 */
export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: SendMessageOptions
): Promise<any> {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
      throw new Error(data.description || 'Failed to send message');
    }

    return data.result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

/**
 * Send a photo to a Telegram chat
 */
export async function sendPhoto(
  chatId: number | string,
  photo: string,
  options?: SendPhotoOptions
): Promise<any> {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        ...options,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram sendPhoto error:', data);
      throw new Error(data.description || 'Failed to send photo');
    }

    return data.result;
  } catch (error) {
    console.error('Error sending Telegram photo:', error);
    throw error;
  }
}

/**
 * Answer a callback query from an inline keyboard button
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  options?: {
    text?: string;
    show_alert?: boolean;
    url?: string;
    cache_time?: number;
  }
): Promise<any> {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...options,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram answerCallbackQuery error:', data);
      throw new Error(data.description || 'Failed to answer callback query');
    }

    return data.result;
  } catch (error) {
    console.error('Error answering callback query:', error);
    throw error;
  }
}

/**
 * Helper to create inline keyboard markup
 */
export function createInlineKeyboard(buttons: Array<Array<any>>) {
  return {
    inline_keyboard: buttons,
  };
}

/**
 * Helper to create reply keyboard markup
 */
export function createReplyKeyboard(
  buttons: Array<Array<any>>,
  options?: {
    one_time_keyboard?: boolean;
    resize_keyboard?: boolean;
  }
) {
  return {
    keyboard: buttons,
    ...options,
  };
}

/**
 * Helper to create force reply markup
 */
export function createForceReply() {
  return {
    force_reply: true,
  };
}
