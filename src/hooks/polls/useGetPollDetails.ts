import { pollsAPI } from '@/lib/request/api';
import { useQuery } from '@tanstack/react-query';

export function useGetPollDetailsById(externalId: string) {
    return useQuery({
        queryKey: ['useGetPollDetailsById', externalId],
        queryFn: async () => {
            const resp = (await pollsAPI.pollsDetail(externalId));
            return resp?.data;
        }
    })
}