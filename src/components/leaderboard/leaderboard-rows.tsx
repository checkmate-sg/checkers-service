import { Fragment } from 'react/jsx-runtime';

import { TableCell, TableRow } from '../ui/table';

interface LeaderboardEntry {
    _id: string;
    checkerName: string;
    numberOfVotes: number;
    totalScore: number;
    averageResponseTime: number;
    accuracy: number;
    correctVotes: number;
    rank: number;
  }

interface LeaderboardRowsProps {
    entries: LeaderboardEntry[]; // TODO: Update the types
    currentUserId: string
}

export function LeaderboardRows({
    entries, 
    currentUserId,
} : LeaderboardRowsProps) {
    let lastRank = 0;

    return (
        <>
            {entries.map((entry, index) => {
                const discontinuity = entry.rank - lastRank > 1;
                const isCurrentUser = entry._id === currentUserId;
                const isLast = index === entries.length - 1;

                lastRank = entry.rank;

                return (
                    <Fragment key={entry._id}>
                        {discontinuity && (
                            <TableRow className="bg-muted/30">
                                <TableCell colSpan={6} className="text-center p-2">
                                    <span className="text-sm text-muted-foreground italic">
                                        ...
                                    </span>
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow className={
                            isCurrentUser ? 
                                "bg-orange-100 dark:bg-orange-950/30"
                                : isLast 
                                ? ""
                                : "border-b border-border"
                        }
                        >
                            <TableCell className="p-4">
                                <span className="text-sm text-muted-foreground">
                                    {entry.rank}
                                </span>
                            </TableCell>

                            <TableCell className="p-4">
                                <span className={`text-sm ${isCurrentUser ? "font-medium" : "text-muted-foreground"}`}>
                                {entry.checkerName.length > 10
                                    ? `${entry.checkerName.slice(0, 10)}..`
                                    : entry.checkerName}
                                </span>
                            </TableCell>

                            <TableCell className="p-4">
                                <span className="text-sm text-muted-foreground">
                                {entry.numberOfVotes}
                                </span>
                            </TableCell>

                            <TableCell className="p-4">
                                <span className="text-sm text-muted-foreground">
                                {entry.accuracy.toFixed(0)}
                                </span>
                            </TableCell>

                            <TableCell className="p-4">
                                <span className="text-sm text-muted-foreground">
                                {entry.averageResponseTime?.toFixed(2)}
                                </span>
                            </TableCell>
                            
                            <TableCell className="p-4">
                                <span className="text-sm font-bold">
                                {entry.totalScore.toFixed(0)}
                                </span>
                            </TableCell>
                        </TableRow>
                    </Fragment>
                )
            })}
        </>
    )
}