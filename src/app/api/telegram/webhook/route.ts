import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramID } from "@/lib/db";
import { connectToDB } from "@/lib/mongodb";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: false,
});

// User session storage (in production, use Redis or database)
const userSessions: { [key: string]: { step: string; data: any } } = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramId = message.from.id.toString();
    const text = message.text;
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";

    console.log(`Received message from ${telegramId}: ${text}`);

    // Handle /stop command at any time
    if (text === "/stop") {
      delete userSessions[telegramId];
      await bot.sendMessage(
        chatId,
        "❌ Onboarding cancelled. You can start again anytime with /start"
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /start command
    if (text === "/start") {
      // Check if user already exists
      const existingUser = await findUserByTelegramID(telegramId);

      if (existingUser) {
        await bot.sendMessage(
          chatId,
          `🎉 Welcome back, ${existingUser.name}! You're already registered for Checkmate. Head to the mini app to start voting!`
        );
        return NextResponse.json({ ok: true });
      }

      // Start onboarding process
      userSessions[telegramId] = { step: "welcome", data: {} };

      const welcomeMessage = `🎯 **Welcome to Checkmate!** 🎯

Hi ${firstName}! This is the onboarding process for Checkers - your ultimate voting platform for making decisions together.

🎮 **What is Checkmate?**
• Vote on important decisions
• See real-time results
• Make your voice heard in the community

📱 **Getting Started:**
I'll help you set up your account in just a few simple steps.

Let's begin! What's your full name? (This will be displayed when you vote)

💡 *Tip: Type /stop at any time to cancel the onboarding process.*`;

      await bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
      userSessions[telegramId].step = "collecting_name";

      return NextResponse.json({ ok: true });
    }

    // Handle onboarding flow
    const session = userSessions[telegramId];
    if (!session) {
      await bot.sendMessage(
        chatId,
        "Please start the onboarding process with /start"
      );
      return NextResponse.json({ ok: true });
    }

    switch (session.step) {
      case "collecting_name":
        if (!text || text.trim().length < 2) {
          await bot.sendMessage(
            chatId,
            "❌ Please enter a valid name (at least 2 characters)"
          );
          return NextResponse.json({ ok: true });
        }

        session.data.name = text.trim();
        session.step = "collecting_phone";

        await bot.sendMessage(
          chatId,
          `📱 Great! Now I need your phone number for verification.

Please share your phone number using one of these methods:
1️⃣ Click the button below to share automatically
2️⃣ Type it manually (include country code, e.g., +1234567890)

Your phone number will be kept secure and used only for account verification.`,
          {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: "📱 Share Phone Number",
                    request_contact: true,
                  },
                ],
              ],
              one_time_keyboard: true,
              resize_keyboard: true,
            },
          }
        );
        break;

      case "collecting_phone":
        let phoneNumber = "";

        if (message.contact) {
          phoneNumber = message.contact.phone_number;
        } else if (text) {
          // Validate phone number format
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          if (!phoneRegex.test(text.replace(/\s/g, ""))) {
            await bot.sendMessage(
              chatId,
              "❌ Please enter a valid phone number with country code (e.g., +1234567890)"
            );
            return NextResponse.json({ ok: true });
          }
          phoneNumber = text.replace(/\s/g, "");
        } else {
          await bot.sendMessage(chatId, "❌ Please provide your phone number");
          return NextResponse.json({ ok: true });
        }

        // Save user to database
        try {
          const db = await connectToDB();
          const checkers = db.collection("checkers");

          const userData = {
            name: session.data.name,
            phoneNumber: phoneNumber.startsWith("+")
              ? phoneNumber
              : `+${phoneNumber}`,
            telegramId: telegramId,
            correctVotes: 0,
            totalVotes: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await checkers.insertOne(userData);

          // Clear session
          delete userSessions[telegramId];

          const successMessage = `✅ **Registration Complete!** ✅

🎉 Welcome to Checkmate, ${session.data.name}!

**Your Account Details:**
👤 Name: ${session.data.name}
📱 Phone: ${phoneNumber}
🆔 Telegram ID: ${telegramId}
🗳️ Votes: 0/0 (correct/total)

**What's Next?**
🎮 Open the Checkmate mini app to start voting
📊 Participate in community decisions
🏆 Build your voting accuracy score

Ready to make your voice heard? Let's go! 🚀`;

          await bot.sendMessage(chatId, successMessage, {
            parse_mode: "Markdown",
            reply_markup: { remove_keyboard: true },
          });
        } catch (error) {
          console.error("Database error:", error);
          await bot.sendMessage(
            chatId,
            "❌ Sorry, there was an error saving your information. Please try again with /start"
          );
          delete userSessions[telegramId];
        }
        break;

      default:
        await bot.sendMessage(
          chatId,
          "Something went wrong. Please start over with /start"
        );
        delete userSessions[telegramId];
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
