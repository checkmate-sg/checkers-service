import { Bot, Context, InlineKeyboard, Keyboard } from "grammy";

import { getParameters } from "@/shared/helpers/parameters";

import {
  createNewChecker,
  normalizePhoneNumber,
  progressBar,
  RESOURCES_MESSAGE,
} from "./constants";
import { checkOTP, sendOTP } from "./otp";

import type { CheckerAPI } from "./types";
// Safely answer callback query - don't let failures block the handler
async function safeAnswerCallbackQuery(ctx: Context): Promise<void> {
  try {
    await ctx.answerCallbackQuery();
  } catch (err) {
    // Ignore "query is too old" errors - the button click is still valid
    console.warn("Failed to answer callback query (likely expired):", err);
  }
}

// Create bot instance with env available via closure
export function createBot(token: string, env: Env): Bot {
  const bot = new Bot(token);

  // ============================================
  // COMMANDS
  // ============================================

  bot.command("start", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const existingUser = result.success ? result.data : null;

    if (!existingUser) {
      await ctx.reply(
        `Hello!! 🥳

You're about to become part of a team fighting misinformation.

We'll walk you through a simple onboarding process to help you become a skilled fact-seeker.

By the end, you'll be ready to make your first check and join CheckMate in action.`,
        {
          reply_markup: new InlineKeyboard().text("Let's go!", "START_ONBOARD"),
        }
      );
    } else if (existingUser.isOnboardingComplete) {
      await ctx.reply(
        `Welcome to your personal CheckMate Checker's bot! Click "Checker's Portal" to access the dashboard. Here, you'll review messages, view your statistics etc.`,
        {
          reply_markup: new InlineKeyboard().webApp("Checker's Portal", `${env.HOST_URL}/`),
        }
      );
    } else {
      await ctx.reply(
        `Welcome back to your personal CheckMate Checker's bot! Type /onboard to continue your journey as a CheckMate Checker.`
      );
    }
  });

  bot.command("onboard", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const existingUser = result.success ? result.data : null;

    if (existingUser) {
      if (existingUser.isOnboardingComplete) {
        await ctx.reply(
          `Hi there! You have already onboarded as a CheckMate Checker. Do explore the Checker's Portal to check out what you can do. Otherwise if you would like to go through onboarding again, click on the respective button below.`,
          {
            reply_markup: new InlineKeyboard()
              .webApp("Checker's Portal", `${env.HOST_URL}/`)
              .text("Go through onboarding again", "ONBOARD_AGAIN"),
          }
        );
        return;
      }

      // Resume from current step
      await resumeOnboarding(ctx, env, existingUser);
      return;
    }

    // Create new user
    const newChecker = createNewChecker(telegramId);
    await env.CHECKERS_DB_SERVICE.insertChecker(newChecker);

    // Start with name prompt
    await sendNamePrompt(ctx);
  });

  bot.command("stop", async ctx => {
    await ctx.reply("❌ Onboarding cancelled. You can start again anytime with /onboard");
  });

  bot.command("activate", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user) {
      console.error(`Checker with TelegramID ${telegramId} trying to /activate but not found`);
      return;
    }

    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          isActive: true,
          lastActivatedDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Cancel any pending reminder alarms
    try {
      await env.CHECKER_REMINDER_ALARM_SERVICE.cancelReminders(user._id!);
    } catch (err) {
      console.error(`Failed to cancel reminders for checker ${user._id}: ${err}`);
    }

    await ctx.reply("✅ You're now active! CheckMate will start sending you messages to review.");
  });

  bot.command("deactivate", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user) {
      console.error(`Checker with TelegramID ${telegramId} trying to /deactivate but not found`);
      return;
    }

    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    await ctx.reply(
      `Sorry to see you go! CheckMate will no longer send you messages to review. When you're ready to return, type /activate to start voting on messages again.`
    );
  });

  bot.command("resources", async ctx => {
    await ctx.reply(RESOURCES_MESSAGE, { parse_mode: "HTML" });
  });

  // ============================================
  // CALLBACK QUERIES (button clicks)
  // ============================================

  bot.callbackQuery("QUIZ_COMPLETED", async ctx => {
    console.log("Received QUIZ_COMPLETED callback");
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    try {
      // Verify quiz was actually completed via Typeform webhook
      const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
      console.log("QUIZ_COMPLETED: DB lookup result", JSON.stringify(result));
      const user = result.success ? result.data : null;

      if (user?.isQuizComplete) {
        await ctx.reply(
          `Thank you for completing the quiz!💪🎉 We hope you found it useful.\n\n${progressBar(3)}`
        );
        const checkResult = await env.WHATSAPP_CHECKER_HANDLER_SERVICE.checkUser(user.whatsappId);
        // const checkResult = {exists: null}
        if (checkResult.exists) {
          await sendTGGroupPrompt(ctx, env, telegramId, true);
        } else {
          await sendWAServicePrompt(ctx, env, telegramId, false);
        }
      } else {
        console.log("QUIZ_COMPLETED: Quiz not complete, showing prompt again");
        await sendQuizPrompt(
          ctx,
          env,
          telegramId,
          user?.name || "",
          user?.whatsappId || null,
          false
        );
      }
    } catch (error) {
      console.error("Error in QUIZ_COMPLETED callback:", error);
      await ctx.reply("An error occurred. Please try again or contact support.");
    }
  });

  bot.callbackQuery("WA_SERVICE_COMPLETED", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    // Verify user has actually used the WhatsApp service
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user?.whatsappId) {
      await sendWAServicePrompt(ctx, env, telegramId, false);
      return;
    }

    try {
      const checkResult = await env.WHATSAPP_CHECKER_HANDLER_SERVICE.checkUser(user.whatsappId);
      if (checkResult.exists) {
        await sendTGGroupPrompt(ctx, env, telegramId, true);
      } else {
        // User hasn't used the WhatsApp service yet
        await sendWAServicePrompt(ctx, env, telegramId, false);
      }
    } catch (error) {
      console.error("Error checking WhatsApp user:", error);
      // On error, proceed anyway to not block onboarding

      await sendTGGroupPrompt(ctx, env, telegramId, true);
    }
  });

  bot.callbackQuery("TG_COMPLETED", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();
    const userId = ctx.from!.id;

    // Check if user has joined the Telegram group using admin bot
    try {
      const adminBot = new Bot(env.TELEGRAM_ADMIN_BOT_TOKEN);
      const member = await adminBot.api.getChatMember(env.CHECKERS_CHAT_ID, userId);

      if (member.status !== "left" && member.status !== "kicked") {
        // User is in the group - complete onboarding
        await sendCompletionPrompt(ctx, env, telegramId);
      } else {
        // User hasn't joined the group yet
        await sendTGGroupPrompt(ctx, env, telegramId, false);
      }
    } catch (error) {
      console.error("Error checking Telegram group membership:", error);
      // On error, show the prompt again (user likely not in group)
      await sendTGGroupPrompt(ctx, env, telegramId, false);
    }
  });

  bot.callbackQuery("ONBOARD_AGAIN", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          onboardingStatus: "name",
          updatedAt: new Date(),
        },
      }
    );

    await sendNamePrompt(ctx);
  });

  bot.callbackQuery("START_ONBOARD", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const existingUser = result.success ? result.data : null;

    if (existingUser) {
      if (existingUser.isOnboardingComplete) {
        await ctx.reply(
          `Hi there! You have already onboarded as a CheckMate Checker. Do explore the Checker's Portal to check out what you can do. Otherwise if you would like to go through onboarding again, click on the respective button below.`,
          {
            reply_markup: new InlineKeyboard()
              .webApp("Checker's Portal", `${env.HOST_URL}/`)
              .text("Go through onboarding again", "ONBOARD_AGAIN"),
          }
        );
        return;
      }
      // Resume from current step
      await resumeOnboarding(ctx, env, existingUser);
      return;
    }

    // Create new user and start onboarding
    const newChecker = createNewChecker(telegramId);
    await env.CHECKERS_DB_SERVICE.insertChecker(newChecker);

    await sendNamePrompt(ctx);
  });

  bot.callbackQuery("RESOURCES", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    await ctx.reply(RESOURCES_MESSAGE, { parse_mode: "HTML" });
  });

  bot.callbackQuery("REQUEST_NUMBER", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    await sendNumberPrompt(ctx);
  });

  bot.callbackQuery("SEND_OTP", async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user || !user.whatsappId) {
      await ctx.reply("Please enter your phone number first.");
      await sendNumberPrompt(ctx);
      return;
    }

    await sendOTPPrompt(ctx, env, telegramId, user.whatsappId, user._id!);
  });

  bot.callbackQuery(/^reactivate$/i, async ctx => {
    await safeAnswerCallbackQuery(ctx);
    const telegramId = ctx.from!.id.toString();

    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user) {
      console.error(`Checker with TelegramID ${telegramId} triggered reactivate but not found`);
      return;
    }

    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          isActive: true,
          lastActivatedDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Cancel any pending reminder alarms
    try {
      await env.CHECKER_REMINDER_ALARM_SERVICE.cancelReminders(user._id!);
    } catch (err) {
      console.error(`Failed to cancel reminders for checker ${user._id}: ${err}`);
    }

    await ctx.reply(
      "✅ Welcome back! You're now active again. CheckMate will start sending you messages to review."
    );
  });

  // ============================================
  // MESSAGE HANDLERS (for onboarding flow)
  // ============================================

  // Handle contact sharing (phone number)
  bot.on("message:contact", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user || user.onboardingStatus !== "number") {
      return;
    }

    const phoneNumber = ctx.message.contact.phone_number;
    await processPhoneNumber(ctx, env, telegramId, phoneNumber, user);
  });

  // Handle text messages (name, phone number as text)
  bot.on("message:text", async ctx => {
    const telegramId = ctx.from!.id.toString();
    const text = ctx.message.text;

    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    const user = result.success ? result.data : null;

    if (!user) {
      await ctx.reply(
        "You have not onboarded as a CheckMate Checker yet. Type /onboard to begin your journey."
      );
      return;
    }

    switch (user.onboardingStatus) {
      case "name":
        await handleNameInput(ctx, env, telegramId, text);
        break;

      case "number":
        await handlePhoneInput(ctx, env, telegramId, text, user);
        break;

      case "verify":
        await handleOTPInput(ctx, env, telegramId, text, user);
        break;

      default:
        await ctx.reply("Sorry, this bot is unable to respond to free-form messages.");
    }
  });

  return bot;
}

// ============================================
// ONBOARDING FLOW HELPERS
// ============================================

async function resumeOnboarding(ctx: Context, env: Env, user: CheckerAPI): Promise<void> {
  const telegramId = ctx.from!.id.toString();

  switch (user.onboardingStatus) {
    case "name":
      await sendNamePrompt(ctx);
      break;
    case "number":
      await sendNumberPrompt(ctx);
      break;
    case "otpSent":
    case "verify":
      // Resume OTP verification - send a new OTP
      if (user.whatsappId) {
        await sendOTPPrompt(ctx, env, telegramId, user.whatsappId, user._id!);
      } else {
        await sendNumberPrompt(ctx);
      }
      break;
    case "quiz":
      await sendQuizPrompt(ctx, env, telegramId, user.name || "", user.whatsappId, true);
      break;
    case "onboardWhatsapp":
      await sendWAServicePrompt(ctx, env, telegramId, true);
      break;
    case "joinGroupChat":
      await sendTGGroupPrompt(ctx, env, telegramId, true);
      break;
    default:
      await sendNamePrompt(ctx);
  }
}

async function handleNameInput(
  ctx: Context,
  env: Env,
  telegramId: string,
  text: string
): Promise<void> {
  if (!text || text.trim().length < 1) {
    await ctx.reply("Name cannot be just spaces. Please enter a valid name.");
    await sendNamePrompt(ctx);
    return;
  }

  await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { telegramId },
    {
      $set: {
        name: text.trim(),
        onboardingStatus: "number",
        updatedAt: new Date(),
      },
    }
  );

  await sendNumberPrompt(ctx);
}

async function handlePhoneInput(
  ctx: Context,
  env: Env,
  telegramId: string,
  text: string,
  user: CheckerAPI
): Promise<void> {
  const phoneNumber = normalizePhoneNumber(text);

  if (!phoneNumber) {
    await ctx.reply(`The phone number you entered is invalid. Please enter a valid phone number.`);
    return;
  }

  await processPhoneNumber(ctx, env, telegramId, phoneNumber, user);
}

async function processPhoneNumber(
  ctx: Context,
  env: Env,
  telegramId: string,
  phoneNumber: string,
  user: CheckerAPI
): Promise<void> {
  await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { telegramId },
    {
      $set: {
        whatsappId: phoneNumber,
        updatedAt: new Date(),
      },
    }
  );

  // Send OTP for verification
  await sendOTPPrompt(ctx, env, telegramId, phoneNumber, user._id!);
}

async function handleOTPInput(
  ctx: Context,
  env: Env,
  telegramId: string,
  otpAttempt: string,
  user: CheckerAPI
): Promise<void> {
  const whatsappId = user.whatsappId;

  if (!whatsappId) {
    await ctx.reply("Please enter your phone number first.");
    await sendNumberPrompt(ctx);
    return;
  }

  const result = await checkOTP(otpAttempt, whatsappId, user._id!, env);

  if (result.status === "success") {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          onboardingStatus: "quiz",
          updatedAt: new Date(),
        },
      }
    );
    await sendQuizPrompt(ctx, env, telegramId, user.name || "", whatsappId, true);
  } else {
    switch (result.message) {
      case "OTP mismatch":
        await sendVerificationPrompt(ctx, env, telegramId, true);
        break;
      case "OTP max attempts":
        await ctx.reply("Maximum OTP attempts reached. We will send a new OTP.");
        await sendOTPPrompt(ctx, env, telegramId, whatsappId, user._id!);
        break;
      case "OTP expired":
      case "OTP expired or not found":
        await ctx.reply("Your OTP has expired. We will send a new one.");
        await sendOTPPrompt(ctx, env, telegramId, whatsappId, user._id!);
        break;
      default:
        console.error(`OTP error for ${telegramId}: ${result.message}`);
        await ctx.reply("Apologies - an error occurred, please try again later.");
    }
  }
}

// ============================================
// PROMPT SENDERS
// ============================================

async function sendNamePrompt(ctx: Context): Promise<void> {
  await ctx.reply(`First up, how shall we address you?`, {
    reply_markup: { force_reply: true },
  });
}

async function sendNumberPrompt(ctx: Context): Promise<void> {
  const keyboard = new Keyboard().requestContact("📱 Share Phone Number").resized().oneTime();

  await ctx.reply(
    `What is your WhatsApp phone number? Please include the country code, but omit the "+", e.g 6591234567\n\n${progressBar(1)}`,
    { reply_markup: keyboard }
  );
}

async function sendOTPPrompt(
  ctx: Context,
  env: Env,
  telegramId: string,
  whatsappId: string,
  checkerId: string
): Promise<void> {
  const otpButtons = new InlineKeyboard()
    .text("Get a new OTP", "SEND_OTP")
    .text("Re-enter phone number", "REQUEST_NUMBER");

  console.log(`Sending OTP to ${whatsappId} for checker ${checkerId}`);
  const result = await sendOTP(whatsappId, checkerId, env);

  if (result.status === "success") {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          onboardingStatus: "otpSent",
          updatedAt: new Date(),
        },
      }
    );

    await ctx.reply(
      `We have sent a 6-digit OTP to your WhatsApp at ${whatsappId}. Please check your WhatsApp for the OTP.`,
      { reply_markup: otpButtons }
    );
    await sendVerificationPrompt(ctx, env, telegramId, false);
  } else {
    switch (result.message) {
      case "OTP request limit exceeded":
        await ctx.reply(
          `An error occurred, likely because too many OTPs were requested. Please try again in 10 minutes.`,
          { reply_markup: otpButtons }
        );
        break;
      default:
        await ctx.reply(
          `An error occurred, likely because the phone number was keyed in wrongly.`,
          {
            reply_markup: new InlineKeyboard().text("Re-enter phone number", "REQUEST_NUMBER"),
          }
        );
        break;
    }
  }
}

async function sendVerificationPrompt(
  ctx: Context,
  env: Env,
  telegramId: string,
  isRetry: boolean
): Promise<void> {
  await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { telegramId },
    {
      $set: {
        onboardingStatus: "verify",
        updatedAt: new Date(),
      },
    }
  );

  await ctx.reply(
    isRetry
      ? "The OTP you provided doesn't match our records. Please key it in again:"
      : "Key in your OTP:",
    { reply_markup: { force_reply: true } }
  );
}

async function sendQuizPrompt(
  ctx: Context,
  env: Env,
  telegramId: string,
  name: string,
  whatsappId: string | null,
  isFirstPrompt: boolean
): Promise<void> {
  const linkURL = `${env.TYPEFORM_URL}#name=${name}&phone=${whatsappId || ""}`;

  await ctx.reply(
    `${
      isFirstPrompt
        ? "Thank you for verifying your WhatsApp number"
        : "We noticed you have not completed the quiz yet"
    }. Please proceed to complete the onboarding quiz <a href="${linkURL}">here</a>. This will equip you with the skills and knowledge to be a better checker!\n\n${progressBar(2)}`,
    {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: false },
      reply_markup: new InlineKeyboard().text(
        "Yes, I have finished the onboarding quiz",
        "QUIZ_COMPLETED"
      ),
    }
  );
}

async function sendWAServicePrompt(
  ctx: Context,
  env: Env,
  telegramId: string,
  isFirstPrompt: boolean
): Promise<void> {
  if (isFirstPrompt) {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      { $set: { onboardingStatus: "onboardWhatsapp", updatedAt: new Date() } }
    );
  }

  const chatId = ctx.chat!.id;
  const waLink = `${env.WHATSAPP_BOT_LINK}?utm_source=checkersonboarding&utm_medium=telegram&utm_campaign=${chatId}`;

  await ctx.reply(
    isFirstPrompt
      ? `Welcome back! As a volunteer, your main role is to vote on submitted messages. If you come across anything suspicious while doing so, you can also report it via WhatsApp to help us identify harmful content.\n\nAdd our WhatsApp service <a href="${waLink}">here</a> to report any suspicious messages you encounter. Come back here when you are done to continue.`
      : `Please add our WhatsApp service <a href="${waLink}">here</a> to report any suspicious messages you encounter. Come back here when you are done to continue.`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        "I've added the WhatsApp service",
        "WA_SERVICE_COMPLETED"
      ),
    }
  );
}

async function sendTGGroupPrompt(
  ctx: Context,
  env: Env,
  telegramId: string,
  isFirstPrompt: boolean
): Promise<void> {
  if (isFirstPrompt) {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      { $set: { onboardingStatus: "joinGroupChat", updatedAt: new Date() } }
    );
  }

  const firstPromptMessage = `You're now part of the CheckMate Checker community, a network fighting misinformation together!\n\nJoin our <a href="${env.CHECKERS_GROUP_LINK}">group chat</a> to connect with fellow checkers here.\n\nIn this group chat, you'll get system updates, shared fact-checking resources, and see our collective impact.\n\nImportant: Keep your votes independent, but lean on the community for support and resources.\n\nWelcome to the team 😀!\n\n${progressBar(5)}`;
  const retryMessage = `We noticed you have not joined the group chat yet. Join our <a href="${env.CHECKERS_GROUP_LINK}">group chat</a> to connect with fellow checkers and be part of our mission to fight misinformation together!\n\n${progressBar(5)}`;

  await ctx.reply(isFirstPrompt ? firstPromptMessage : retryMessage, {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text(
      "Yes, I have joined the Telegram Chat Group",
      "TG_COMPLETED"
    ),
  });
}

async function sendCompletionPrompt(ctx: Context, env: Env, telegramId: string): Promise<void> {
  try {
    // Fetch checker to get _id and numVoted
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ telegramId });
    if (!checkerResult.success || !checkerResult.data) {
      throw new Error("Checker not found");
    }
    const checker = checkerResult.data;
    const now = new Date();

    const shouldCreateProgramme = !checker.currentProgrammeId && !checker.hasCompletedProgramme;

    let newProgrammeId: string | null = checker.currentProgrammeId || null;

    if (shouldCreateProgramme) {
      // Get programme targets from KV
      const { PROGRAMME_TARGET_VOTES, PROGRAMME_TARGET_ACCURACY, PROGRAMME_TARGET_REPORTS } =
        await getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
          "PROGRAMME_TARGET_VOTES",
          "PROGRAMME_TARGET_ACCURACY",
          "PROGRAMME_TARGET_REPORTS",
        ]);

      const programmeResult = await env.CHECKERS_DB_SERVICE.insertProgramme({
        checkerId: checker._id!,
        startDate: now,
        endDate: null,
        status: "active",
        targets: {
          votes: PROGRAMME_TARGET_VOTES,
          accuracy: PROGRAMME_TARGET_ACCURACY,
          reports: PROGRAMME_TARGET_REPORTS,
        },
        votesAtStart: checker.numVoted,
        hasReceivedExtension: false,
        hasReceivedLowAccuracyWarning: false,
        certificateUrl: null,
        completedAt: null,
      });

      if (!programmeResult.success) {
        console.error(`Failed to create programme: ${programmeResult.error}`);
      } else {
        newProgrammeId = programmeResult.id || null;
      }
    }

    // Update checker with onboarding completion and programme ID
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { telegramId },
      {
        $set: {
          onboardingStatus: "completed",
          isOnboardingComplete: true,
          onboardingTime: now,
          isActive: true,
          lastActivatedDate: now,
          updatedAt: now,
          currentProgrammeId: newProgrammeId,
        },
      }
    );

    await ctx.reply(
      `🎉 Congratulations on becoming a CheckMate Checker! 🎉\n\nDo check out the Checker's Portal below, which is where you will vote on messages and view your statistics. There's even a leaderboard!\n\n${RESOURCES_MESSAGE}\n\nYou may view these resources anytime with the command /resources.`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .webApp("🚀 Open Checker's Portal", `${env.HOST_URL}/`)
          .row()
          .text("📚 View Resources", "RESOURCES"),
      }
    );

    await ctx.reply(
      `You can relax for now while we wait for new messages to be sent to CheckMate for fact-checking. You'll receive notifications in this chat when users submit messages for checking, and you'll do the fact-checks on the Checker's Portal.\n\n✅ Use /activate to start receiving messages\n❌ Use /deactivate to stop receiving messages`
    );
  } catch (error) {
    console.error("Error in sendCompletionPrompt:", error);
    await ctx.reply(
      "There was an error completing your onboarding. Please try again or contact support."
    );
  }
}
