import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, {params}) {
    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        const {checkerId, pollId} = await params; 
        if (!checkerId) return Err.badParams("Missing checkerId parameter");
        if (!pollId) return Err.badParams("Missing pollId parameter");

        const result = await env.CHECKERS_DB_SERVICE.findOneVote(
            {
                pollId: pollId, 
                checkerId: checkerId
            }
        );

        // console.log(result.data);

        if (!result.success) {
            return Err.notFound();
        }

        const vote = result.data 
        return NextResponse.json(vote, {status: 200});
    } catch (error) {
        return Err.internal();
    }
}