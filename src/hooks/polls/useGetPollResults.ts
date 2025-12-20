import { pollsAPI } from "@/lib/request/api";
import { useQuery } from "@tanstack/react-query";

export function useGetPollResultsById(id: string) {
  return useQuery({
    queryKey: ["useGetPollResultsById", id],
    queryFn: async () => {
      const resp = await pollsAPI.resultsDetail(id);
      return resp?.data;
    },
    enabled: !!id,
  });
}
