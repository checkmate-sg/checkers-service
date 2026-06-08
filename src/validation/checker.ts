import { z } from "zod";

export const GetCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

export const PatchCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

// Only maxDailyVotes is user-controllable via the dashboard. Other fields
// (isActive, onboardingStatus, dailyAssignmentCount) are managed by bot
// commands, the onboarding state machine, and the distribution system
// respectively — exposing them here would let checkers game their quota
// or skip onboarding.
export const PatchCheckerBodySchema = z.object({
  maxDailyVotes: z.number().int().min(0).max(50),
});

export const GetCheckerVotesParamsSchema = z.object({
  checkerId: z.string(),
});

export const GetCheckerVotesQuerySchema = z.object({
  sorting: z.string().optional(),

  limit: z.coerce.number().int().optional(),
  offset: z.coerce.number().int().optional(),

  VoteCheckerStatus: z
    .enum(["true", "false"])
    .transform(v => v === "true")
    .optional(),
});

export const GetCheckerStatsParamsSchema = z.object({
  checkerId: z.string(),
});

export const GetCheckerProgrammeParamsSchema = z.object({
  checkerId: z.string(),
});
