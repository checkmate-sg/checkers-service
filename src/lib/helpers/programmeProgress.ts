import { computeAccuracyPercentage } from '@/shared/helpers/scoring';

import { ProgrammeProgress } from '../../../shared/types/schema';
import { getReportCount } from './getReportCount';

export async function calculateProgrammeProgress(
    env: CloudflareEnv,
    checkerId: string, 
    programme: {
        startDate: Date;
        votesAtStart: number;
    }
): Promise<{success: boolean, data?: ProgrammeProgress, error?: string}>{
    try {
         // 1. Get current checker to calculate vote count 
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({_id: checkerId});

    if (!checkerResult.success || !checkerResult.data) {
        console.error(`Checker not found: ${checkerId}`);
        return {success: false, error: "Checker not found"};
    }

    const voteCount = checkerResult.data.numVoted - programme.votesAtStart;

    // 2. Query votes for accuracy calculation
    const voteResults = await env.CHECKERS_DB_SERVICE.findVotes({
        checkerId: checkerId, 
        votedTimestamp: { $gte: programme.startDate},
        isCorrect: { $ne: null}
    })

    if (!voteResults.success || !voteResults.data) {
        console.error(`Checkers votes not found: ${checkerId}`);
        return {success: false, error: "Checkers votes not found"};
    }

    const accuracyPercentage = computeAccuracyPercentage(voteResults.data)

    // 3. Get report count using getReportCount helper 
    const reportCount = await getReportCount(env, checkerResult.data.whatsappId, programme.startDate);

    if (reportCount.error) {
        return { success: false, error: reportCount.error}
    }

    // 4. Return progress 
    return {success: true, data: {
        voteCount: voteCount,
        accuracy: accuracyPercentage, 
        reportCount: reportCount?.count}
    }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to compute programme progress")

        return {success: false, error: errorMessage};
    }
   

}