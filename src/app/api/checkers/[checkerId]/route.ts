import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function PATCH(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();
  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    const body = await req.json();

    if (!body || typeof body !== "object") {
      return Err.badParams("Invalid request body");
    }

    console.log("sending db update request:", { $set: body });
    const result = await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: checkerId },
      { $set: body }
    );
    console.log("results: ", result.success);
    console.log("mod count: ", result.modifiedCount);

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
