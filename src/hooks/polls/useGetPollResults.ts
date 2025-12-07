import { pollsAPI } from "@/lib/request/api";
import { useQuery } from "@tanstack/react-query";

export function useGetPollResultsById(externalId: string) {
  return useQuery({
    queryKey: ["useGetPollResultsById", externalId],
    queryFn: async () => {
      const resp = await pollsAPI.resultsDetail(externalId);
      return resp?.data;
    },
  });
}
