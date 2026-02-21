import { checkersAPI } from "@/lib/request/api";
import { Checker } from "@/lib/request/external/lib/data-contracts";
import { useQuery } from "@tanstack/react-query";

type CheckerEnvelope = { checker?: { success?: boolean; data: Checker } } & {
  data?: Checker; // in case some env returns plain { data: ... }
};

// const STALE_TIME = 8 * 60 * 60 * 1000; // 8 hours

export function useGetCheckersById(checkerId: string) {
  return useQuery({
    queryKey: ["useGetCheckersById", checkerId],
    queryFn: async () => {
      const resp = await checkersAPI.checkersDetail(checkerId);
      return resp?.data;
    },
    enabled: !!checkerId,
  });
}
