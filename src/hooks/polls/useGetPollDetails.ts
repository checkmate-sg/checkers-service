import { pollsAPI } from "@/lib/request/api";
import { useQuery } from "@tanstack/react-query";

export function useGetPollDetailsById(id: string) {
  return useQuery({
    queryKey: ["useGetPollDetailsById", id],
    queryFn: async () => {
      const resp = await pollsAPI.pollsDetail(id);
      return resp?.data;
    },
    enabled: !!id,
  });
}
