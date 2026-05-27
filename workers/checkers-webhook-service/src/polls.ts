import { Bot } from "grammy";
import { Context } from "hono";

import { InitialPhaseDistributor } from "@/shared/helpers/distributor/initial";
import type { PollRequest, PollAPI } from "./types";

export async function handlePollWebhook(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  // Verify API key
  const apiKey = c.req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = (await c.req.json()) as PollRequest;
    const {
      checkId,
      imageUrl,
      caption,
      text,
      longformResponse,
      shortformResponse,
      humanResponse,
      isReport,
    } = body;

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

    // Download image to R2 and store the object key (staging/prod only)
    let storedImageURL = imageUrl || null;
    if (imageUrl && env.ENVIRONMENT !== "local") {
      const presignedUrl = await env.PRESIGNED_URL_SERVICE.getPresignedUrl(imageUrl);
      storedImageURL = new URL(presignedUrl).pathname.slice(1);
    }

    // Create new poll
    const newPoll: Omit<PollAPI, "_id"> = {
      checkId: checkId,
      text: text || null,
      imageUrl: storedImageURL,
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
      isReport: isReport ?? false,
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

    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const distributor = new InitialPhaseDistributor(env.HOST_URL, bot, env.CHECKERS_DB_SERVICE);
    const results = await distributor.distribute({
      pollId: insertResult.id!,
      text: text ?? null,
      imageUrl: imageUrl ?? null,
    });

    console.info("ran initial distribution:", results);

    return c.json({
      message: "Poll created successfully",
      id: insertResult.id,
      results: results,
    });
  } catch (err) {
    console.error("[POLL WEBHOOK ERROR]", err);
    return c.json({ error: "Server error" }, 500);
  }
}
