import { votesAPI } from '@/lib/request/api';
import { useQuery } from '@tanstack/react-query';

export function useGetVotesById(voteId: string) {
    return useQuery({
        queryKey: ['useGetVotesById', voteId],
        queryFn: async () => {
            const resp = await votesAPI.votesDetail(voteId) 
            
            return resp?.data;
        }
    })
}