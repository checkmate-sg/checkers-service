import { Context } from "hono";

import { checkGraduation } from "@/shared/helpers/checkGraduation";

export async function handleCheckGraduation(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  const apiKey = c.req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json<{ whatsappId: string }>();

    if (!body.whatsappId || typeof body.whatsappId !== "string") {
      return c.json({ error: "Missing 'whatsappId' in request body" }, 400);
    }

    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({
      whatsappId: body.whatsappId,
    });

    if (!checkerResult.success || !checkerResult.data) {
      return c.json({ success: false, error: "Checker not found" }, 404);
    }

    const result = await checkGraduation(env, checkerResult.data._id!);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 500);
    }

    return c.json({ success: true, graduated: result.graduated ?? false });
  } catch (err) {
    console.error("[CHECK-GRADUATION ERROR]", err);
    return c.json({ error: "Server error" }, 500);
  }
}
