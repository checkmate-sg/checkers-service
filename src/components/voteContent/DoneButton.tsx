import { CheckCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useUpdateVotesById } from '@/hooks/votes/useUpdateVotesById';
import { Category, ResponseCategory } from '@/lib/request/external/lib/data-contracts';

import { Button } from '../ui/button';

interface DoneButtonProps {
    voteRequestId: string | null; 
    voteCategory: Category | null;
    truthScore: number | null;
    crowdSourcedCategory: ResponseCategory | null;

}
export default function DoneButton(props: DoneButtonProps) {
    const router = useRouter();
    const updateVoteMutation = useUpdateVotesById();

    const handleVoteUpdate = async () => {
        try {
            const result = await updateVoteMutation.mutateAsync({
                voteId: props.voteRequestId, 
                data: {
                    category: props.voteCategory, 
                    truthScore: props.truthScore, 
                    responseCategory: props.crowdSourcedCategory
                }
            });
            console.log('Vote updated', result);
            // TODO: Show success message 

            // Navigate back to the Vote Pending Page
            router.push('/votes');

        } catch (error) {
            console.error(error);
        }
    }
    return (
        <Button
            variant="doneButton"
            className="my-5 flex items-center justify-center gap-3 w-full"
            size="sm"
            onClick={handleVoteUpdate}
        >
            <CheckCircleIcon className="h-5 w-5"/>
            Done! 
        </Button>
    )

}