import { z } from "zod";
import { CategoryWithPassNullableSchema, ResponseCategorySchema } from "./primatives";

export const GetVoteParamsSchema = z.object({
  voteId: z.string(),
});

export const UpdateVoteParamsSchema = z.object({
  voteId: z.string(),
});

export const UpdateVoteBodySchema = z
  .object({
    category: CategoryWithPassNullableSchema.optional(),
    truthScore: z.number().int().min(0).max(5).nullable().optional(),
    responseCategory: ResponseCategorySchema.optional(),
    commentOnResponse: z.string().optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: "At least one field must be provided",
  });
