import { Context } from "hono";
import { Bot, InlineKeyboard } from "grammy";
import type { PollRequest, PollAPI, VoteAPI } from "./types";

export async function handlePollWebhook(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  // Verify API key
  const apiKey = c.req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = (await c.req.json()) as PollRequest;
    const { checkId, imageUrl, caption, text, longformResponse, shortformResponse, humanResponse } =
      body;

    // Validate required fields
    if (!checkId) {
      return c.json({ error: "Missing 'checkId'" }, 400);
    }

    // Validate that text and imageUrl are mutually exclusive
    if (text && imageUrl) {
      return c.json(
        { error: "Cannot provide both 'text' and 'imageUrl' - they are mutually exclusive" },
        400
      );
    }

    // Check if poll with this checkId already exists
    const existingPollResult = await env.CHECKERS_DB_SERVICE.findOnePoll({
      checkId: checkId,
    });

    if (existingPollResult.success && existingPollResult.data) {
      return c.json(
        {
          error: "Poll with this checkId already exists",
          id: existingPollResult.data._id,
        },
        409
      );
    }

    // Create new poll
    const newPoll: Omit<PollAPI, "_id"> = {
      checkId: checkId,
      text: text || null,
      imageURL: imageUrl || null,
      caption: caption || null,
      longformResponse: longformResponse
        ? {
            en: longformResponse.en ?? null,
            cn: longformResponse.cn ?? null,
            links: longformResponse.links ?? null,
            timestamp: longformResponse.timestamp ?? null,
          }
        : {
            en: null,
            cn: null,
            links: null,
            timestamp: null,
          },
      shortformResponse: shortformResponse
        ? {
            en: shortformResponse.en ?? null,
            cn: shortformResponse.cn ?? null,
            links: shortformResponse.links ?? null,
            timestamp: shortformResponse.timestamp ?? null,
            downvoted: shortformResponse.downvoted ?? false,
          }
        : {
            en: null,
            cn: null,
            downvoted: false,
            links: null,
            timestamp: null,
          },
      humanResponse: humanResponse
        ? {
            en: humanResponse.en ?? null,
            cn: humanResponse.cn ?? null,
            links: humanResponse.links ?? null,
            timestamp: humanResponse.timestamp ?? null,
            updatedBy: humanResponse.updatedBy ?? null,
          }
        : {
            en: null,
            cn: null,
            links: null,
            timestamp: null,
            updatedBy: null,
          },
      crowdSourcedCategory: null,
      crowdSourcedTruthScore: null,
      startedTimestamp: new Date(),
      assessedTimestamp: null,
    };

    // Insert the new poll into the database
    const insertResult = await env.CHECKERS_DB_SERVICE.insertPoll(newPoll);

    if (!insertResult.success) {
      console.error("[POLL WEBHOOK ERROR]", insertResult.error);
      return c.json({ error: insertResult.error || "Failed to create poll" }, 500);
    }

    // Build preview text for notification
    let previewText = "";
    if (text) {
      previewText = text.length > 50 ? text.substring(0, 50) + "..." : text;
    }
    if (imageUrl) {
      previewText = previewText ? `${previewText}\n <Image 🖼️>` : "<Image 🖼️>";
    }

    // Get all active checkers
    const activeCheckersResult = await env.CHECKERS_DB_SERVICE.findCheckers(
      {
        isActive: true,
        isOnboardingComplete: true,
      },
      { dailyAssignmentCount: 1 }
    );

    // Create Telegram bot instance
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

    // Send vote requests to each checker
    for (const checker of activeCheckersResult.data) {
      // Create a vote request in the database
      const voteRequest: Omit<VoteAPI, "_id"> = {
        pollId: insertResult.id!,
        checkerId: checker._id!,
        createdTimestamp: new Date(),
        votedTimestamp: null,
        category: null,
        truthScore: null,
        responseCategory: null,
        commentOnResponse: null,
        responseTime: null, 
        score: null, 
        isCorrect: null
      };

      const insertVoteResult = await env.CHECKERS_DB_SERVICE.insertVote(voteRequest);

      if (!insertVoteResult.success) {
        console.error("[POLL WEBHOOK ERROR]", insertVoteResult.error);
        return c.json({ error: insertVoteResult.error || "Failed to create vote" }, 500);
      }

      const voteRequestPath = `${env.HOST_URL}/votes/${insertVoteResult.id}`;

      // Send Telegram notification
      const keyboard = new InlineKeyboard().webApp("Vote 🗳️!", voteRequestPath);

      try {
        await bot.api.sendMessage(checker.telegramId, previewText, {
          reply_markup: keyboard,
        });
      } catch (error) {
        console.error(`Failed to send message to checker ${checker.telegramId}:`, error);
        // Continue with other checkers even if one fails
      }
    }

    return c.json({
      message: "Poll created successfully",
      id: insertResult.id,
    });
  } catch (err) {
    console.error("[POLL WEBHOOK ERROR]", err);
    return c.json({ error: "Server error" }, 500);
  }
}
