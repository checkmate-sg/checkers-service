import { votesAPI } from '@/lib/request/api';
import { VotePOST } from '@/lib/request/external/lib/data-contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateVoteParams {
    voteId: string;
    data: VotePOST
}

export const useUpdateVotesById = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ voteId, data } : UpdateVoteParams) => {
            return await votesAPI.votesCreate(voteId, data);
        },
        onSuccess: (response, variables) => {
            // INvalidate relevant queries to refetched updated data 
            queryClient.invalidateQueries({
                queryKey: ['votes']
            })
        },
        onError: (error) => {
            console.error('Failed to update vote:', error);
        }
    })
}