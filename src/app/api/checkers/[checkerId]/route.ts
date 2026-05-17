import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CheckerPatchSchema } from "@/validation/checker";

export async function PATCH(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();
  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    if (checkerId.toString() !== session.user.id) {
      return Err.unauthorized();
    }

    const body = await req.json();

    if (!body || typeof body !== "object") {
      return Err.badParams("Invalid request body");
    }

    const parsed = CheckerPatchSchema.safeParse(body);

    if (!parsed.success) {
      return Err.badParams(parsed.error.message);
    }

    const updates = parsed.data;

    const result = await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: checkerId },
      { $set: updates }
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

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

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
