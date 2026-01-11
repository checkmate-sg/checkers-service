import { checkersAPI } from "@/lib/request/api";
import { useInfiniteQuery } from "@tanstack/react-query";

// Custom hook to fetch all the Votes of a specific checkers based on the filter
export function useGetCheckersVoteDetail({
  offset,
  limit,
  sorting,
  checkerId,
  voteCheckerStatus,
}: {
  offset?: number;
  limit?: number;
  sorting?: string;
  checkerId: string;
  voteCheckerStatus: boolean;
}) {
  return useInfiniteQuery({
    queryKey: [
      "useGetCheckersVoteDetail",
      { offset, limit, sorting, checkerId, voteCheckerStatus },
    ],
    queryFn: async ({ pageParam = offset }) => {
      return checkersAPI.votesDetail(checkerId, {
        offset: pageParam,
        limit: limit,
        sorting: sorting,
        VoteCheckerStatus: voteCheckerStatus,
      });
    },
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      // Extract required dta from thel ast page
      const offset = lastPage.data.offset;
      const limit = lastPage.data.limit;
      const total = lastPage.data.total;

      // If any are missing, return undefined
      if (offset === undefined || limit === undefined || total === undefined) {
        return undefined;
      }

      // Calculate the next offset
      const nextOffset = offset + limit;

      // If nextOffset is >= total, no more data, return undefined to stop fetching
      if (nextOffset >= total) {
        return undefined;
      }

      // Otherwise, return the next offset
      return nextOffset;
    },
  });
}
