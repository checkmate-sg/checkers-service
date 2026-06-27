import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkersAPI } from "@/lib/request/api";

export function useUpdateTargetLoad(checkerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTarget: number) => {
      await checkersAPI.checkersPartialUpdate(checkerId, { targetDailyVotes: newTarget });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["useGetCheckersById", checkerId],
      });

      queryClient.invalidateQueries({
        queryKey: ["useGetCheckersStatsById", checkerId],
      });

      queryClient.invalidateQueries({
        queryKey: ["useGetCheckersProgrammeById", checkerId],
      });
    },
    onError: err => {
      console.log("error occurred in target load update: ", err);
    },
  });
}
