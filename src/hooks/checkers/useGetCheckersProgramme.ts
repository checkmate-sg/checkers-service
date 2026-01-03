import { checkersAPI } from '@/lib/request/api';
import { useQuery } from '@tanstack/react-query';

export function useGetCheckersProgrammeById(checkerId: string) {
    return useQuery({
        queryKey: ["useGetCheckersProgrammeById", checkerId],
        queryFn: async () => {
            const resp = await checkersAPI.programmeDetail(checkerId);
            return resp?.data;
        }
    })
}