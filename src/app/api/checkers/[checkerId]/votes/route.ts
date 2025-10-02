import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, {params}) {
    const { env } = getCloudflareContext();

    try{
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        const {checkerId} = await params;
        if (!checkerId) return Err.badParams("Missing checkerId parameter");

        const searchParams = req.nextUrl.searchParams;
        const sorting = searchParams.get('sorting') || 'startedTimestamp'
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 50;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')) : 0;

        console.log(sorting, limit, offset)

        return NextResponse.json({ checkerId, sorting, limit, offset }, {status: 200})

    } catch (error) {
        return Err.internal();
    }
}