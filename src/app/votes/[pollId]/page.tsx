import { auth } from '@/auth';
import { VoteContent } from '@/components/voteContent/VoteContent';

export default async function VotePage({
    params,
} : {
    params: Promise<{pollId: string}>
}) {
    const { pollId }  = await params

    const session = await auth();
    if (!session?.user) return null;
    return (
        <VoteContent 
            checkerId={session.user.id}
            pollId={pollId} />
    )
}