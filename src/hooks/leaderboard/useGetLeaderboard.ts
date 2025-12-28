import { leaderboardAPI } from '@/lib/request/api';
import { useQuery } from '@tanstack/react-query';

export function useGetLeaderboard() {
    return useQuery({
        queryKey: ["useGetLeaderboard"],
        queryFn: async() => {
            const resp = await leaderboardAPI.leaderboardList();
            return resp?.data;
        }
    })
}