import { useCallback } from "react";

import { SimpleInfinityScroll } from "../common/SimplyInfinityScroll";
import { VoteMessageCard } from "./voteMessageCard";

interface InfiniteVoteMessageProps {
  useGetCheckersVoteDetailHook: (params: {
    offset?: number;
    limit?: number;
    sorting?: string;
    checkerId: string;
    voteCheckerStatus: boolean;
  }) => any;
  voteCheckerStatus: boolean;
  checkerId: string;
  sorting?: string; // Sorting field
}

export const InfiniteVoteMessageList = (props: InfiniteVoteMessageProps) => {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    props.useGetCheckersVoteDetailHook({
      offset: 0,
      limit: 50,
      sorting: props?.sorting,
      checkerId: props.checkerId,
      voteCheckerStatus: props.voteCheckerStatus,
    });

  const results = data?.pages.flatMap((page: any) => page.data.items ?? []) ?? [];

  console.log(results);

  const handleLoadData = useCallback(() => {
    // Check if there's more data to load
    if (hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage]);

  return (
    <SimpleInfinityScroll onLoad={handleLoadData} manual={false} disabled={hasNextPage === false}>
      {/* Messages List */}
      {results.map(result => {
        return (
          <VoteMessageCard
            key={result.voteId}
            voteId={result.voteId}
            pollId={result.pollId}
            checkId={result.poll.checkId}
            text={result.poll.text}
            imageUrl={result.poll.imageUrl}
            startedTimestamp={result.poll.startedTimestamp}
            crowdSourcedCategory={result.poll.crowdSourcedCategory}
            category={result.category}
            truthScore={result.truthScore}
            responseCategory={result.responseCategory}
            commentOnResponse={result.commentOnResponse}
            isCorrect={result.isCorrect}
          />
        );
      })}
    </SimpleInfinityScroll>
  );
};
