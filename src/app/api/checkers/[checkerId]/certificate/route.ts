import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { publishCheckersEvent } from "@/lib/helpers/events/publishCheckersEvent";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const MIN_NAME_LEN = 1;
const MAX_NAME_LEN = 100;

export async function POST(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    if (session.user.id !== checkerId) return Err.forbidden();

    const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.replace(/[\p{Cc}\p{Cn}]/gu, "").trim();
    if (name.length < MIN_NAME_LEN || name.length > MAX_NAME_LEN) {
      return Err.badParams(`Name must be between ${MIN_NAME_LEN} and ${MAX_NAME_LEN} characters`);
    }

    // Find the checker's most recent completed programme that doesn't yet have a certificate.
    const programmesResult = await env.CHECKERS_DB_SERVICE.findProgrammes(
      { checkerId, status: "completed", certificateUrl: null },
      { sort: { completedAt: -1 } }
    );

    const pendingProgramme = programmesResult.data?.[0];
    if (!programmesResult.success || !pendingProgramme?._id) {
      return Err.notFound("No pending certificate to claim");
    }

    const updateResult = await env.CHECKERS_DB_SERVICE.updateOneProgramme(
      { _id: pendingProgramme._id, certificateUrl: null },
      { $set: { certificateName: name } }
    );
    if (!updateResult.success) {
      return Err.internal("Failed to store certificate name");
    }
    if (updateResult.modifiedCount === 0) {
      return Err.conflict("Certificate has already been issued");
    }

    const publishResult = await publishCheckersEvent(env, {
      type: "certificate.requested",
      data: { checkerId, programmeId: pendingProgramme._id },
      timestamp: new Date().toISOString(),
    });
    if (!publishResult.success) {
      return Err.internal("Failed to queue certificate generation");
    }

    return NextResponse.json({ status: "queued" }, { status: 202 });
  } catch (error) {
    console.error("Error claiming certificate:", error);
    return Err.internal();
  }
}
