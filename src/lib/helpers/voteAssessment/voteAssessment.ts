

import {
  computeTruthScore,
  getCategoryCountsByPollId,
  getResponseCategoryCountsByPollId,
  getTotalTruthScoreValue,
  getTotalVoteRequestsCount
} from './voteAssessmentUtils';

export async function voteAssessment(pollId: string): Promise<{
    success: boolean; 
    data?: string | null; 
    error?: string;
}> {
    console.log("Vote Assessment");

    try {
        // Get categoryCounts
        const categoryCounts = await getCategoryCountsByPollId(pollId);

        // Get totalVoteReqeustsCount
        const totalVoteRequestsCount = await getTotalVoteRequestsCount(pollId);

        // Calculate factCheckerCount - totalVoteRequestsCount - passCount 
        const factCheckerCount = totalVoteRequestsCount - categoryCounts['pass'] - categoryCounts['null'];

        // Calculate validResponseCount 
        const validResponseCount = totalVoteRequestsCount - categoryCounts['pass'] - categoryCounts['null'];

        // susCount = scamCount + illicitCount 
        const susCount = categoryCounts['scam'] + categoryCounts['illicit'];

        // noClaimCount = irrelevantCount + legitimateCount 
        const noClaimCount = categoryCounts['irrelevant'] + categoryCounts['legitimate'];

        // Compute totalTruthScoreValue 
        const totalTruthScoreValue = await getTotalTruthScoreValue(pollId);

        // Compute truthScore 
        const truthScore = await computeTruthScore(categoryCounts['info'], totalTruthScoreValue);

        // harmfulCount = scamCount + illicitCount 
        let harmfulCount = categoryCounts['scam'] + categoryCounts['illicit'];

        // harmlessCount = legitimateCount + spamCount
        let harmlessCount = categoryCounts['legitimate'] + categoryCounts['spam'];

        if(truthScore !== null) {
            if (truthScore < 1.5) {
                harmfulCount += categoryCounts['info'];
            } else if (truthScore <= 3.75) {
                // pass
            } else {
                harmlessCount += categoryCounts['info'];
            }
        }

        // isHarmless = harmlessCount > 0.5 * validResponseCount
        const isHarmless = 
            harmlessCount > 0.5 * validResponseCount;
        // isHarmful = harmfulCount > 0.5 * validResponseCount 
        const isHarmful = 
            harmfulCount > 0.5 * validResponseCount;

        const isBigSus = susCount > 0.75 * validResponseCount;
        const isSus = isBigSus || susCount > 0.5 * validResponseCount;
        const isScam = isSus && categoryCounts['scam'] >= categoryCounts['illicit'];
        const isIllicit = isSus && !isScam;
        const isInfo = categoryCounts['info'] > 0.5 * validResponseCount;
        const isSatire = categoryCounts['satire'] > 0.5 * validResponseCount;
        const isSpam = categoryCounts['spam'] > 0.5 * validResponseCount;
        const isNoClaim = noClaimCount > 0.5 * validResponseCount;
        const isLegitimate = isNoClaim && categoryCounts['legitimate'] > categoryCounts['irrelevant'];
        const isIrrelevant = isNoClaim && !isLegitimate;
        const isUnsure = (
            !isSus &&
            !isBigSus &&
            !isInfo && 
            !isSpam && 
            !isLegitimate && 
            !isIrrelevant && 
            !isSatire
        )  || categoryCounts['unsure'] > 0.5 * validResponseCount;
        const isAssessed = 
            (isUnsure && 
                validResponseCount > 
                    Math.min(
                        0.8 * factCheckerCount,
                        16
                    ) 
            ) ||
            (!isUnsure && 
                validResponseCount > 
                    Math.min(
                        0.5 * factCheckerCount,
                        10
                    )
            ) ||
            (isBigSus && 
                validResponseCount > 
                    Math.min(
                        0.2 * factCheckerCount,
                        4
                    )
            ) || 
            (isHarmful &&
                validResponseCount > 
                    Math.min(
                        0.5 * factCheckerCount, 
                        10
                    )
            ) || 
            (isHarmless && 
                validResponseCount > 
                    Math.min(
                        0.5 * factCheckerCount, 
                        10
                    )
            )
    
    // Get responseCategory counts 
    const responseCategory = await getResponseCategoryCountsByPollId(pollId);

    // Check if unacceptableCount is more than 50%
    // if unacceptableCount > 50% of validResponseCount and message is considered assessed 
    const isUnacceptable = (responseCategory['unacceptable'] > 0.5 * validResponseCount) && isAssessed;
    const isAssessedUnacceptable = isUnacceptable;

    let primaryCategory: string; 
    switch (true) {
        case isScam: 
            primaryCategory = 'scam';
            break; 
        
        case isIllicit:
            primaryCategory = 'illicit';
            break;
        
        case isSatire:
            primaryCategory = 'satire';
            break;
        
        case isInfo:
            if (truthScore === null) {
                primaryCategory = "error";
                console.error("Category is info but truth score is null");
            } else {
                switch(true) {
                    case (truthScore < 1.5):
                        primaryCategory = "untrue";
                        break;
                    
                    case (truthScore <= 3.75):
                        primaryCategory = "misleading";
                        break;
                    
                    default:
                        primaryCategory = "accurate";
                }
            }
            break;
        
        case isSpam:
            primaryCategory = 'spam';
            break;
        
        case isLegitimate:
            primaryCategory = 'legitimate';
            break;
        
        case isIrrelevant:
            primaryCategory = 'irrelevant';
            break;
        
        case isUnsure:
            primaryCategory = 'unsure';
            break;
        
        default:
            primaryCategory = 'error';
            console.error("Error in primary category determination");
    }

    // Update Object - crowdSourcedCategory in Polls collection
    // primaryCategory - to be updated in crowdSourcedCategory
    if (isAssessed === true) {
        return {success: true, data: primaryCategory};
    } else {
        // if isAssessed is false, return null
        // no crowdSourcedCategory being determined yet
        return {success: true, data: null};
    }

    } catch(error) {
        console.error("Vote Assessment Error: ", error);
        return {
            success: false, 
            error: error instanceof Error ? error.message: "Vote Assessment error"
        };
    }
}