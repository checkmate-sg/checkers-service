"use client";

import { useMemo } from "react";

import { useGetLeaderboard } from "@/hooks/leaderboard/useGetLeaderboard";
import {
  CalculatorIcon,
  CheckCircleIcon,
  ClockIcon,
  HashtagIcon,
  TrophyIcon,
  UserIcon,
} from "@heroicons/react/24/solid";

import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { LeaderboardRows } from "./leaderboard-rows";

// Number of top positions to always show
const TOP_N = 5;
// Number of positions above/below current user to show
const CONTEXT_SIZE = 2;

interface LeaderboardTableProps {
  currentUserId: string;
}

const iconSize = "h-4 w-4";
const COLUMNS = [
  {
    title: "rank",
    icon: <TrophyIcon className={iconSize} />,
    description: "Rank",
  },
  {
    title: "name",
    icon: <UserIcon className={iconSize} />,
    description: "Name",
  },
  {
    title: "numVotes",
    icon: <HashtagIcon className={iconSize} />,
    description: "Number of votes on messages that did not end in unsure",
  },
  {
    title: "accuracy",
    icon: <CheckCircleIcon className={iconSize} />,
    description: "Accuracy (%) of votes on messages that did not end in unsure",
  },
  {
    title: "averageTimeTaken",
    icon: <ClockIcon className={iconSize} />,
    description: "Average time (hrs) taken on votes on messages that did not end in unsure",
  },
  {
    title: "score",
    icon: <CalculatorIcon className={iconSize} />,
    description: "Score, based on both accuracy and speed",
  },
];

export function LeaderboardTable({ currentUserId }: LeaderboardTableProps) {
  const { data: leaderboardList, error, isLoading, status } = useGetLeaderboard();

  // Sort by totalScore descending and create abridged leaderboard
  const { abridgedLeaderboard } = useMemo(() => {
    if (!leaderboardList?.data || leaderboardList.data.length === 0) {
      return { abridgedLeaderboard: [] };
    }

    // Sort and add ranks
    const sorted = [...leaderboardList.data]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    // Find current user's position
    const currentUserIndex = sorted.findIndex(entry => entry._id === currentUserId);

    // If user is in top N or not found, just show top N
    if (currentUserIndex === -1 || currentUserIndex < TOP_N) {
      return { abridgedLeaderboard: sorted.slice(0, TOP_N) };
    }

    // Otherwise, show top N + current user with context (±CONTEXT_SIZE)
    const topN = sorted.slice(0, TOP_N);

    // Include positions above and below current user for context
    const userSectionStart = Math.max(TOP_N, currentUserIndex - CONTEXT_SIZE);
    const userSectionEnd = Math.min(sorted.length, currentUserIndex + CONTEXT_SIZE + 1);
    const userSection = sorted.slice(userSectionStart, userSectionEnd);

    return { abridgedLeaderboard: [...topN, ...userSection] };
  }, [leaderboardList?.data, currentUserId]);
  return (
    <Card className="h-full w-full overflow-auto mt-3">
      <TooltipProvider delayDuration={0}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {COLUMNS.map(col => (
                <TableHead key={col.title} className="p-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{col.icon}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{col.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons rows
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {COLUMNS.map(col => (
                    <TableCell key={col.title} className="p-4">
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              // Error state
              <TableRow>
                <TableCell colSpan={6} className="text-center p-4 text-destructive">
                  Failed to load leaderboard
                </TableCell>
              </TableRow>
            ) : abridgedLeaderboard.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={6} className="text-center p-4 text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              <LeaderboardRows entries={abridgedLeaderboard} currentUserId={currentUserId} />
            )}
          </TableBody>
        </Table>
      </TooltipProvider>
    </Card>
  );
}
