import { z } from "zod";

export const CreatePollWebhookBodySchema = z.object({
  checkId: z.string(),

  text: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),

  longformResponse: z.any(),
  shortformResponse: z.any(),
});

export const GetPollParamsSchema = z.object({
  id: z.string(),
});

export const GetPollResultsParamsSchema = z.object({
  id: z.string(),
});

export const GetCheckPollParamsSchema = z.object({
  checkId: z.string(),
});
