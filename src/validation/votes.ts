import { z } from "zod";
import { CategorySchema, ResponseCategorySchema } from "./primatives";

export const GetVoteParamsSchema = z.object({
  voteId: z.string(),
});

export const UpdateVoteParamsSchema = z.object({
  voteId: z.string(),
});

export const UpdateVoteBodySchema = z
  .object({
    category: CategorySchema.nullable().optional(),
    truthScore: z.number().int().min(0).max(5).optional(),
    responseCategory: ResponseCategorySchema.optional(),
    commentOnResponse: z.string().optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: "At least one field must be provided",
  });
