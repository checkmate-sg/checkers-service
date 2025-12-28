import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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
