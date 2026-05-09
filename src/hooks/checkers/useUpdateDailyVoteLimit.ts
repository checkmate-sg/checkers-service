import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkersAPI } from "@/lib/request/api";

export function useUpdateDailyVoteLimit(checkerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newVoteLimit: number) => {
      await checkersAPI.checkersPartialUpdate(checkerId, { maxDailyVotes: newVoteLimit });
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
      console.log("error occured in vote update: ", err);
    },
  });
}
