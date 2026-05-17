import { z } from "zod";

export const CheckerPatchSchema = z
  .object({
    maxDailyVotes: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type CheckerPatchRequest = z.infer<typeof CheckerPatchSchema>;
