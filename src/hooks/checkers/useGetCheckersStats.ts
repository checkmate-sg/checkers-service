import { checkersAPI } from "@/lib/request/api";
import { useQuery } from "@tanstack/react-query";

export function useGetCheckersStatsById(checkerId: string) {
  return useQuery({
    queryKey: ["useGetCheckersStatsById", checkerId],
    queryFn: async () => {
      const resp = await checkersAPI.statsDetail(checkerId);
      return resp?.data;
    },
  });
}
