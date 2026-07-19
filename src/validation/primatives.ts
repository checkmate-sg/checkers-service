import { z } from "zod";

export const DateTimeSchema = z.string().datetime();

export const CategorySchema = z.enum([
  "scam",
  "illicit",
  "info",
  "untrue",
  "misleading",
  "accurate",
  "satire",
  "spam",
  "legitimate",
  "irrelevant",
  "unsure",
]);

export const CategoryWithPassNullableSchema = z.enum([
  "scam",
  "illicit",
  "info",
  "satire",
  "spam",
  "legitimate",
  "irrelevant",
  "unsure",
  "pass",
]);

export const ResponseCategorySchema = z.enum(["great", "acceptable", "unacceptable"]);

export const OnboardingStatusSchema = z.enum([
  "name",
  "number",
  "verify",
  "quiz",
  "onboardWhatsapp",
  "joinGroupChat",
  "nlb",
  "completed",
  "offboarded",
]);
