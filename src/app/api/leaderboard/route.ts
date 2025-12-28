import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest) {
    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        // Calculate current month's date range dynamically 
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const result = await env.CHECKERS_DB_SERVICE.getLeaderboardInfo(startOfMonth, startOfNextMonth);

        if (!result.success) {
            return Err.notFound();
        }

        return NextResponse.json(result, { status: 200});
    } catch (error) {
        return Err.internal();
    }
}