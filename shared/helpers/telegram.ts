import { Bot, InlineKeyboard } from "grammy";

export function buildVotePreviewText(text?: string | null, imageUrl?: string | null): string {
  let previewText = "";

  if (text) {
    previewText = text.length > 50 ? `${text.substring(0, 50)}...` : text;
  }

  if (imageUrl) {
    previewText = previewText ? `${previewText}\n<Image 🖼️>` : "<Image 🖼️>";
  }

  return previewText;
}

export class VoteNotifier {
  constructor(
    private bot: Bot,
    private hostUrl: string
  ) {}

  async sendVoteMessage(telegramId: string, voteId: string, previewText: string) {
    const voteRequestPath = `${this.hostUrl}/votes/${voteId}`;
    const keyboard = new InlineKeyboard().webApp("Vote 🗳️!", voteRequestPath);

    return this.bot.api.sendMessage(telegramId, previewText, {
      reply_markup: keyboard,
    });
  }

  async deleteVoteMessage(telegramId: string, messageId: number) {
    return this.bot.api.deleteMessage(telegramId, messageId);
  }
}
