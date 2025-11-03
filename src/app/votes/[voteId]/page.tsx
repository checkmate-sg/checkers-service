import { auth } from '@/auth';
import { VoteContent } from '@/components/voteContent/VoteContent';

export default async function VotePage({
    params,
} : {
    params: Promise<{voteId: string}>
}) {
    const { voteId }  = await params

    const session = await auth();
    if (!session?.user) return null;
    return (
        <VoteContent 
            voteId={voteId} />
    )
}