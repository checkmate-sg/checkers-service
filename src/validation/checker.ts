import { z } from "zod";
import { OnboardingStatusSchema } from "./primatives";

export const GetCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

export const PatchCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

export const PatchCheckerBodySchema = z
  .object({
    name: z.string().nullable(),
    whatsappId: z.string().nullable(),
    isActive: z.boolean(),
    onboardingStatus: OnboardingStatusSchema,
    dailyAssignmentCount: z.number().int(),
    maxDailyVotes: z.number().int(),
  })
  .partial();

export const GetCheckerVotesParamsSchema = z.object({
  checkerId: z.string(),
});

export const GetCheckerVotesQuerySchema = z.object({
  sorting: z.string().optional(),

  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),

  VoteCheckerStatus: z.coerce.boolean(),
});

export const GetCheckerStatsParamsSchema = z.object({
  checkerId: z.string(),
});

export const GetCheckerProgrammeParamsSchema = z.object({
  checkerId: z.string(),
});
