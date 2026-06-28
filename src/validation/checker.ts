import { z } from "zod";

import { MAX_TARGET_DAILY_VOTES, MIN_TARGET_DAILY_VOTES } from "@/shared/constants";

export const GetCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

export const PatchCheckerParamsSchema = z.object({
  checkerId: z.string(),
});

// Only targetDailyVotes is user-controllable via the dashboard. Other fields
// (isActive, onboardingStatus, dailyAssignmentCount) are managed by bot
// commands, the onboarding state machine, and the distribution system
// respectively — exposing them here would let checkers game their quota
// or skip onboarding.
//
// targetDailyVotes is bounded to [MIN_TARGET_DAILY_VOTES, MAX_TARGET_DAILY_VOTES].
// The lower bound mirrors the slider's lowest snap point and prevents an
// API-crafted 0, which would silently self-deactivate the checker (the
// distributor filters dailyAssignmentCount < targetDailyVotes).
// MAX_TARGET_DAILY_VOTES doubles as the receive-all sentinel — see
// shared/constants.ts.
export const PatchCheckerBodySchema = z.object({
  targetDailyVotes: z.number().int().min(MIN_TARGET_DAILY_VOTES).max(MAX_TARGET_DAILY_VOTES),
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
