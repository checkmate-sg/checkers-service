import { z } from "zod";

export const GetCheckPollParamsSchema = z.object({
  checkId: z.string(),
});
