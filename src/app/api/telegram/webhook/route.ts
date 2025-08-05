import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramID } from "@/lib/db";
import { connectToDB } from "@/lib/mongodb";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: false,
});

// User session storage (in production, use Redis or database)
const userSessions: { [key: string]: { step: string; data: any } } = {};

// Constants from old code
const NLB_SURE_IMAGE =
  "https://storage.googleapis.com/checkmate-static-assets/SURE%20Learning%20Community%20Logo%202024.png";
const TYPEFORM_URL =
  process.env.TYPEFORM_URL || "https://bit.ly/checkmates-quiz";
const WHATSAPP_BOT_LINK =
  process.env.WHATSAPP_BOT_LINK || "https://wa.me/your-whatsapp-bot";
const CHECKERS_GROUP_LINK =
  process.env.CHECKERS_GROUP_LINK || "https://t.me/c/2217060639/1";
const CHECKERS_CHAT_ID = process.env.CHECKERS_CHAT_ID || "";

const resources = `Here are some resources 📚 you might find useful:
1) <a href="https://checkmate.sg">Our official CheckMate website</a>
2) <a href="https://bit.ly/checkmates-wiki">Our fact-checking wiki</a>
3) <a href="https://bit.ly/checkmates-quiz">The Typeform quiz you just took</a>
4) <a href="https://www.nlb.gov.sg/main/site/learnx/explore-communities/explore-communities-content/sure-learning-community">The S.U.R.E Learning Community</a> that we're partnering the National Library Board on
5) <a href="https://facticity.ai/">Facticity</a>, which is useful for video links (just put them into facticity)
6) <a href="https://www.virustotal.com/gui/home/url">Virustotal</a>, which you can use for scanning suspicious URL links
7) <a href="https://onelink.to/scamshield">The ScamShield app</a>, which you can use for checking phone numbers`;

function progressBars(currentStep: number) {
  const totalSteps = 6;
  let progress = "Onboarding Progress: ";
  for (let i = 0; i < totalSteps; i++) {
    if (i < currentStep) {
      progress += "🟩";
    } else {
      progress += "⬜";
    }
  }
  return progress;
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

// COMMENTED OUT: OTP verification functions - not needed for current implementation
// async function sendOTP(whatsappId: string, checkerId: string) {
//   // Implement your OTP sending logic here
//   return { status: "success", message: "OTP sent" };
// }

// async function checkOTP(otp: string, whatsappId: string, checkerId: string) {
//   // Implement your OTP verification logic here
//   return { status: "success", message: "OTP verified" };
// }

// COMMENTED OUT: WhatsApp user checking - not needed for current implementation
// async function checkCheckerIsUser(whatsappId: string) {
//   // Check if the whatsapp user exists in users collection
//   const db = await connectToDB();
//   const users = db.collection("users");
//   const user = await users.findOne({ whatsappId });
//   return !!user;
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, callback_query } = body;

    // Handle callback queries (button clicks)
    if (callback_query) {
      return await handleCallbackQuery(callback_query);
    }

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramId = message.from.id.toString();
    const text = message.text;
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";
    const telegramUsername = message.from.username || null;

    console.log(`Received message from ${telegramId}: ${text}`);

    // Handle commands
    if (text?.startsWith("/")) {
      return await handleCommand(
        text,
        chatId,
        telegramId,
        firstName,
        telegramUsername
      );
    }

    // Handle onboarding flow
    const session = userSessions[telegramId];
    if (!session) {
      await bot.sendMessage(
        chatId,
        "You have not onboarded as a CheckMate Checker yet. Type /onboard to begin your journey."
      );
      return NextResponse.json({ ok: true });
    }

    return await handleOnboardingFlow(
      session,
      text,
      message,
      chatId,
      telegramId
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleCommand(
  text: string,
  chatId: number,
  telegramId: string,
  firstName: string,
  telegramUsername: string | null
) {
  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/start":
      return await handleStartCommand(chatId, telegramId, firstName);

    case "/onboard":
      return await handleOnboardCommand(chatId, telegramId, telegramUsername);

    case "/stop":
      delete userSessions[telegramId];
      await bot.sendMessage(
        chatId,
        "❌ Onboarding cancelled. You can start again anytime with /onboard"
      );
      break;

    case "/activate":
      return await handleActivateCommand(chatId, telegramId);

    case "/deactivate":
      return await handleDeactivateCommand(chatId, telegramId);

    case "/resources":
      await bot.sendMessage(chatId, resources, { parse_mode: "HTML" });
      break;

    default:
      await bot.sendMessage(chatId, "Sorry, this command is not supported.");
  }

  return NextResponse.json({ ok: true });
}

async function handleStartCommand(
  chatId: number,
  telegramId: string,
  firstName: string
) {
  const existingUser = await findUserByTelegramID(telegramId);

  if (!existingUser) {
    await bot.sendMessage(
      chatId,
      `Welcome to your personal CheckMate Checker's bot! This is where you'll review messages, view your statistics etc. Type /onboard to begin your journey as a CheckMate Checker.`
    );
  } else if (existingUser.isOnboardingComplete) {
    await bot.sendMessage(
      chatId,
      `Welcome to your personal CheckMate Checker's bot! Click "Checker's Portal" to access the dashboard. Here, you'll review messages, view your statistics etc.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Checker's Portal",
                web_app: { url: `${process.env.CHECKER_APP_HOST}/` },
              },
            ],
          ],
        },
      }
    );
  } else {
    await bot.sendMessage(
      chatId,
      `Welcome back to your personal CheckMate Checker's bot! Type /onboard to continue your journey as a CheckMate Checker.`
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleOnboardCommand(
  chatId: number,
  telegramId: string,
  telegramUsername: string | null
) {
  // Check if user already exists in database
  const db = await connectToDB();
  const checkers = db.collection("checkers");
  const existingUser = await checkers.findOne({ telegramId });

  if (existingUser) {
    // User already exists, check if onboarding is complete
    if (existingUser.isOnboardingComplete) {
      await bot.sendMessage(
        chatId,
        `Hi there! You have already onboarded as a CheckMate Checker. Do explore the Checker's Portal to check out what you can do. Otherwise if you would like to go through onboarding again, click on the respective button below.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Checker's Portal",
                  web_app: { url: `${process.env.CHECKER_APP_HOST}/` },
                },
                {
                  text: "Go through onboarding again",
                  callback_data: "ONBOARD_AGAIN",
                },
              ],
            ],
          },
        }
      );
      return NextResponse.json({ ok: true });
    } else {
      // User exists but onboarding not complete, continue from where they left off
      const currentStep = existingUser.onboardingStatus || "name";

      switch (currentStep) {
        case "name":
          await sendNamePrompt(chatId, telegramId);
          break;
        case "number":
          await sendNumberPrompt(chatId, telegramId);
          break;
        case "quiz":
          await sendQuizPrompt(
            chatId,
            telegramId,
            existingUser.name,
            existingUser.phoneNumber,
            true
          );
          break;
        case "whatsappService": // Added this case
          await sendWAServicePrompt(chatId, telegramId, true);
          break;
        case "joinGroupChat":
          await sendTGGroupPrompt(chatId, telegramId, true);
          break;
        case "nlb":
          await sendNLBPrompt(chatId, telegramId);
          break;
        default:
          await sendNamePrompt(chatId, telegramId);
      }
      return NextResponse.json({ ok: true });
    }
  }

  // User doesn't exist, create new user and start onboarding
  const userData = {
    name: null,
    telegramUsername: telegramUsername,
    type: "human",
    isActive: false,
    lastActivatedDate: null,
    isOnboardingComplete: false,
    onboardingTime: null,
    isQuizComplete: false,
    quizScore: null,
    onboardingStatus: "name",
    lastTrackedMessageId: null,
    isAdmin: false,
    singpassOpenId: null,
    telegramId: telegramId,
    // COMMENTED OUT: WhatsApp related fields - not needed for current implementation
    // whatsappId: null,
    phoneNumber: null,
    voteWeight: 1,
    level: 0,
    experience: 0,
    tier: "beginner",
    numReferred: 0,
    numReported: 0,
    numNonUnsureVotes: 0,
    numVerifiedLinks: 0,
    preferredPlatform: "telegram",
    lastVotedTimestamp: null,
    getNameMessageId: null,
    hasReceivedExtension: false,
    hasCompletedProgram: false,
    certificateUrl: null,
    correctVotes: 0,
    totalVotes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    offboardingTime: null,
    dailyAssignmentCount: 0,
    isTester: false,
    hasBlockedTelegramMessages: false,
  };

  await checkers.insertOne(userData);

  // Start onboarding with name prompt
  await sendNamePrompt(chatId, telegramId);

  return NextResponse.json({ ok: true });
}

async function handleOnboardingFlow(
  session: any,
  text: string,
  message: any,
  chatId: number,
  telegramId: string
) {
  const db = await connectToDB();
  const checkers = db.collection("checkers");

  switch (session.step) {
    case "collecting_name":
      if (!text || text.trim().length < 2) {
        await bot.sendMessage(
          chatId,
          "Name cannot be just spaces. Please enter a valid name."
        );
        await sendNamePrompt(chatId, telegramId);
        return NextResponse.json({ ok: true });
      }

      await checkers.updateOne(
        { telegramId },
        {
          $set: {
            name: text.trim(),
            onboardingStatus: "number",
            updatedAt: new Date(),
          },
        }
      );

      await sendNumberPrompt(chatId, telegramId);
      break;

    case "collecting_phone":
      let phoneNumber = "";

      if (message.contact) {
        phoneNumber = message.contact.phone_number;
      } else if (text) {
        let phone = text.replace("+", "").replace(" ", "");

        if (
          phone.length === 8 &&
          (phone.startsWith("9") || phone.startsWith("8"))
        ) {
          phone = `65${phone}`;
        }

        if (!isNumeric(phone)) {
          await bot.sendMessage(
            chatId,
            `The phone number you entered is invalid. Please enter a valid phone number.`
          );
          return NextResponse.json({ ok: true });
        }

        phoneNumber = phone.startsWith("+") ? phone : `+${phone}`;
      } else {
        await bot.sendMessage(chatId, "❌ Please provide your phone number");
        return NextResponse.json({ ok: true });
      }

      await checkers.updateOne(
        { telegramId },
        {
          $set: {
            phoneNumber: phoneNumber,
            onboardingStatus: "quiz",
            updatedAt: new Date(),
          },
        }
      );

      const user = await checkers.findOne({ telegramId });
      await sendQuizPrompt(chatId, telegramId, user?.name, phoneNumber, true);
      break;

    // COMMENTED OUT: Phone collection and OTP verification - not needed for current implementation
    // case "verify_otp":
    //   const otpAttempt = text || "";
    //   const user = await findUserByTelegramID(telegramId);

    //   if (!user?.whatsappId) {
    //     await bot.sendMessage(chatId, "Error: Phone number not found. Please start over with /onboard");
    //     return NextResponse.json({ ok: true });
    //   }

    //   const result = await checkOTP(otpAttempt, user.whatsappId, telegramId);

    //   if (result.status === "success") {
    //     await checkers.updateOne(
    //       { telegramId },
    //       {
    //         $set: {
    //           onboardingStatus: "quiz",
    //           lastTrackedMessageId: null,
    //           updatedAt: new Date()
    //         }
    //       }
    //     );
    //     await sendQuizPrompt(chatId, telegramId, user.name, user.whatsappId, true);
    //   } else {
    //     if (result.message === "OTP mismatch") {
    //       await sendVerificationPrompt(chatId, telegramId, true);
    //     } else if (result.message === "OTP max attempts") {
    //       await bot.sendMessage(chatId, `Maximum OTP attempts reached. We will send a new OTP.`);
    //       await sendOTPPrompt(chatId, telegramId, user.whatsappId);
    //     } else {
    //       console.error(`OTP error with ${chatId}: ${result.message}`);
    //       await bot.sendMessage(chatId, "Apologies - an error occurred, please try again later.");
    //     }
    //   }
    //   break;

    default:
      await bot.sendMessage(
        chatId,
        "Sorry, this bot is unable to respond to free-form messages."
      );
  }

  return NextResponse.json({ ok: true });
}

async function handleCallbackQuery(callbackQuery: any) {
  const callbackAction = callbackQuery?.data;
  const action = callbackAction.split("|")[0];
  const chatId = callbackQuery?.message?.chat.id;
  const telegramId = callbackQuery.from.id.toString();

  console.log(`Callback query received: ${callbackAction} from ${telegramId}`); // Debug log

  if (!chatId) return NextResponse.json({ ok: true });

  // Answer the callback query to remove loading state
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error("Error answering callback query:", error);
  }

  const db = await connectToDB();
  const checkers = db.collection("checkers");
  const fullUser = await checkers.findOne({ telegramId });

  if (!fullUser) {
    console.error(
      `Checker with TelegramID ${telegramId} triggered callback but not found`
    );
    return NextResponse.json({ ok: true });
  }

  switch (action) {
    case "QUIZ_COMPLETED":
      await bot.sendMessage(
        chatId,
        `Thank you for completing the quiz!💪🎉 We hope you found it useful.\n\n${progressBars(
          3
        )}`
      );

      // Proceed to WhatsApp service introduction
      await sendWAServicePrompt(chatId, telegramId, true);
      break;

    case "WA_SERVICE_COMPLETED":
      await bot.sendMessage(
        chatId,
        `Great! Now you know about our WhatsApp service! 🙌\n\n${progressBars(
          4
        )}`
      );
      await sendTGGroupPrompt(chatId, telegramId, true);
      break;

    case "TG_COMPLETED":
      try {
        // You might want to implement group membership checking here
        await sendNLBPrompt(chatId, telegramId);
      } catch (error) {
        console.log(error);
        await sendTGGroupPrompt(chatId, telegramId, false);
      }
      break;

    case "COMPLETED":
      console.log(`Processing COMPLETED callback for user ${telegramId}`); // Debug log
      await sendCompletionPrompt(chatId, telegramId);
      break;

    case "REQUEST_NUMBER":
      await sendNumberPrompt(chatId, telegramId);
      break;

    // COMMENTED OUT: OTP related callbacks - not needed for current implementation
    // case "SEND_OTP":
    //   await sendOTPPrompt(chatId, telegramId, user.whatsappId);
    //   break;

    case "ONBOARD_AGAIN":
      await checkers.updateOne(
        { telegramId },
        {
          $set: {
            onboardingStatus: "name",
            lastTrackedMessageId: null,
            updatedAt: new Date(),
          },
        }
      );
      await sendNamePrompt(chatId, telegramId);
      break;

    case "RESOURCES":
      await bot.sendMessage(chatId, resources, { parse_mode: "HTML" });
      break;

    default:
      console.log(`Unknown callback action: ${action}`); // Debug log
  }

  return NextResponse.json({ ok: true });
}

// Helper functions for sending different prompts
async function sendNamePrompt(chatId: number, telegramId: string) {
  userSessions[telegramId] = { step: "collecting_name", data: {} };

  await bot.sendMessage(chatId, `First up, how shall we address you?`, {
    reply_markup: { force_reply: true },
  });
}

async function sendNumberPrompt(chatId: number, telegramId: string) {
  userSessions[telegramId] = { step: "collecting_phone", data: {} };

  await bot.sendMessage(
    chatId,
    `What is your phone number? Please include the country code, but omit the "+", e.g 6591234567\n\n${progressBars(
      1
    )}`,
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
}

// COMMENTED OUT: OTP sending and verification - not needed for current implementation
// async function sendOTPPrompt(chatId: number, telegramId: string, whatsappId: string) {
//   const inlineButtons = {
//     rekey: { text: "Re-enter phone number", callback_data: "REQUEST_NUMBER" },
//     resendOTP: { text: "Get a new OTP", callback_data: "SEND_OTP" },
//   };

//   console.log(`sending OTP to ${whatsappId}`);
//   const postOTPHandlerRes = await sendOTP(whatsappId, telegramId);

//   if (postOTPHandlerRes.status === "success") {
//     await bot.sendMessage(
//       chatId,
//       `We have sent a 6-digit OTP to your WhatsApp at +${whatsappId}. Please check your WhatsApp for the OTP.`,
//       {
//         reply_markup: {
//           inline_keyboard: [[inlineButtons.resendOTP, inlineButtons.rekey]],
//         },
//       }
//     );
//     await sendVerificationPrompt(chatId, telegramId, false);
//   } else {
//     await bot.sendMessage(
//       chatId,
//       `An error occurred, likely because the phone number was keyed in wrongly.`,
//       {
//         reply_markup: { inline_keyboard: [[inlineButtons.rekey]] },
//       }
//     );
//   }
// }

// async function sendVerificationPrompt(chatId: number, telegramId: string, rePrompt: boolean = true) {
//   userSessions[telegramId] = { step: "verify_otp", data: {} };

//   await bot.sendMessage(
//     chatId,
//     !rePrompt
//       ? `Key in your OTP:`
//       : `The OTP you provided doesn't match that in our records. Please key it in again:`,
//     { reply_markup: { force_reply: true } }
//   );
// }

async function sendQuizPrompt(
  chatId: number,
  telegramId: string,
  name: string,
  phoneNumber: string | null,
  isFirstPrompt: boolean
) {
  const linkURL = `${TYPEFORM_URL}#name=${name}&phone=${phoneNumber || ""}`;

  await bot.sendMessage(
    chatId,
    `${
      isFirstPrompt
        ? "Thank you for providing your phone number"
        : "We noticed you have not completed the quiz yet"
    }. Please proceed to complete the onboarding quiz <a href="${linkURL}">here</a>. This will equip you with the skills and knowledge to be a better checker!\n\n${progressBars(
      2
    )}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Yes, I have finished the onboarding quiz",
              callback_data: "QUIZ_COMPLETED",
            },
          ],
        ],
      },
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }
  );
}

// NEW: WhatsApp service introduction (without OTP)
async function sendWAServicePrompt(
  chatId: number,
  telegramId: string,
  isFirstPrompt: boolean
) {
  if (isFirstPrompt) {
    const db = await connectToDB();
    const checkers = db.collection("checkers");
    await checkers.updateOne(
      { telegramId },
      { $set: { onboardingStatus: "whatsappService", updatedAt: new Date() } }
    );
  }

  await bot.sendMessage(
    chatId,
    `${
      isFirstPrompt
        ? "Next, let's introduce you to our CheckMate WhatsApp service"
        : "Please take a moment to learn about our WhatsApp service"
    }! 📱\n\nOur WhatsApp service is where the public sends in messages they want fact-checked. You can check it out <a href="${WHATSAPP_BOT_LINK}?utm_source=checkersonboarding&utm_medium=telegram&utm_campaign=${chatId}">here</a>.\n\nThis is important because:\n\n1️⃣ This is where users submit messages for you to check\n2️⃣ You'll also use this service to report suspicious messages you encounter\n3️⃣ It helps you understand the user experience\n\nFeel free to explore it, but you don't need to complete any verification. Just familiarize yourself with how it works!`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "I've explored the WhatsApp service",
              callback_data: "WA_SERVICE_COMPLETED",
            },
          ],
        ],
      },
      parse_mode: "HTML",
    }
  );
}

async function sendTGGroupPrompt(
  chatId: number,
  telegramId: string,
  isFirstPrompt: boolean
) {
  if (isFirstPrompt) {
    const db = await connectToDB();
    const checkers = db.collection("checkers");
    await checkers.updateOne(
      { telegramId },
      { $set: { onboardingStatus: "joinGroupChat", updatedAt: new Date() } }
    );
  }

  await bot.sendMessage(
    chatId,
    `${
      isFirstPrompt
        ? "Next, p"
        : "We noticed you have not joined the groupchat yet. P"
    }lease join the <a href="${CHECKERS_GROUP_LINK}">CheckMate Checker's groupchat</a>. This group chat is important as it will be used to:\n\n1) Inform checkers of any downtime in the system, updates/improvements being deployed to the bots\n\n2) Share relevant links from reputable news sources to aid fact-checking. Do note that beyond this, checkers should not discuss what to vote, as this may make the collective outcome biased.\n\n${progressBars(
      5
    )}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Yes, I have joined the Telegram Chat Group",
              callback_data: "TG_COMPLETED",
            },
          ],
        ],
      },
      parse_mode: "HTML",
    }
  );
}

async function sendNLBPrompt(chatId: number, telegramId: string) {
  const db = await connectToDB();
  const checkers = db.collection("checkers");
  await checkers.updateOne(
    { telegramId },
    { $set: { onboardingStatus: "nlb", updatedAt: new Date() } }
  );

  await bot.sendPhoto(chatId, NLB_SURE_IMAGE, {
    caption: `One last thing - CheckMate is partnering with the National Library Board to grow a vibrant learning community aimed at safeguarding the community from scams and misinformation.\n\nIf you'd like to get better at fact-checking, or if you're keen to meet fellow checkers in person, do check out and join the <a href="https://www.nlb.gov.sg/main/site/learnx/explore-communities/explore-communities-content/sure-learning-community">SURE Learning Community</a>. It'll be fun!\n\n${progressBars(
      6
    )}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Complete Onboarding", callback_data: "COMPLETED" }],
      ],
    },
  });
}

async function sendCompletionPrompt(chatId: number, telegramId: string) {
  const db = await connectToDB();
  const checkers = db.collection("checkers");

  try {
    const updateResult = await checkers.updateOne(
      { telegramId },
      {
        $set: {
          onboardingStatus: "completed",
          isOnboardingComplete: true,
          onboardingTime: new Date(),
          isActive: true,
          lastActivatedDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`Update result for ${telegramId}:`, updateResult); // Debug log

    await bot.sendMessage(
      chatId,
      `🎉 Congratulations on becoming a CheckMate Checker! 🎉\n\nDo check out the Checker's Portal below, which is where you will vote on messages and view your statistics. There's even a leaderboard!\n\n${resources}\n\nYou may view these resources anytime with the command /resources.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚀 Open Checker's Portal",
                web_app: { url: `${process.env.CHECKER_APP_HOST}/` },
              },
            ],
            [
              {
                text: "📚 View Resources",
                callback_data: "RESOURCES",
              },
            ],
          ],
        },
        parse_mode: "HTML",
      }
    );

    await bot.sendMessage(
      chatId,
      `You can relax for now while we wait for new messages to be sent to CheckMate for fact-checking. You'll receive notifications in this chat when users submit messages for checking, and you'll do the fact-checks on the Checker's Portal.\n\n✅ Use /activate to start receiving messages\n❌ Use /deactivate to stop receiving messages`
    );

    // Clear session
    delete userSessions[telegramId];
  } catch (error) {
    console.error("Error in sendCompletionPrompt:", error);
    await bot.sendMessage(
      chatId,
      "There was an error completing your onboarding. Please try again or contact support."
    );
  }
}

async function handleActivateCommand(chatId: number, telegramId: string) {
  const db = await connectToDB();
  const checkers = db.collection("checkers");

  const user = await findUserByTelegramID(telegramId);
  if (!user) {
    console.error(
      `Checker with TelegramID ${telegramId} trying to /activate but not found`
    );
    return NextResponse.json({ ok: true });
  }

  await checkers.updateOne(
    { telegramId },
    {
      $set: {
        isActive: true,
        lastActivatedDate: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  await bot.sendMessage(
    chatId,
    "✅ You're now active! CheckMate will start sending you messages to review."
  );

  return NextResponse.json({ ok: true });
}

async function handleDeactivateCommand(chatId: number, telegramId: string) {
  const db = await connectToDB();
  const checkers = db.collection("checkers");

  const user = await findUserByTelegramID(telegramId);
  if (!user) {
    console.error(
      `Checker with TelegramID ${telegramId} trying to /deactivate but not found`
    );
    return NextResponse.json({ ok: true });
  }

  await checkers.updateOne(
    { telegramId },
    { $set: { isActive: false, updatedAt: new Date() } }
  );

  await bot.sendMessage(
    chatId,
    `Sorry to see you go! CheckMate will no longer send you messages to review. When you're ready to return, type /activate to start voting on messages again.`
  );

  return NextResponse.json({ ok: true });
}
