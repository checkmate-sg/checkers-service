import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PatchCheckerBodySchema, GetCheckerParamsSchema } from "@/validation/checker";

export async function PATCH(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();
  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsedParams = GetCheckerParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      console.error("fail to get check id");
      return Err.badParams("Invalid checkerId parameter");
    }

    const { checkerId } = parsedParams.data;

    if (checkerId.toString() !== session.user.id) {
      return Err.unauthorized();
    }
    const json = await req.json().catch(() => null);

    const parsedBody = PatchCheckerBodySchema.safeParse(json);

    if (!parsedBody.success) {
      return Err.badParams(parsedBody.error.message);
    }

    const result = await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: checkerId },
      { $set: parsedBody.data }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 400 });
    }
    return NextResponse.json({ modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsedParams = GetCheckerParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return Err.badParams("Invalid checkerId parameter");
    }

    const { checkerId } = parsedParams.data;

    if (checkerId.toString() !== session.user.id) {
      return Err.unauthorized();
    }

    const result = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });

    if (!result.success) {
      return Err.notFound();
    }
    const checker = result.data;
    return NextResponse.json(checker, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
