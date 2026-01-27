import { LeaderboardTable } from "./leaderboard-table";

interface LeaderboardDashboardProps {
  currentUserId: string;
}

export default function LeaderboardDashboard({ currentUserId }: LeaderboardDashboardProps) {
  return (
    <div className="px-5 mt-1">
      <div className="left-right-padding">
        <p className="text-muted-foreground font-normal">Refreshes every month</p>
        <LeaderboardTable currentUserId={currentUserId} />
      </div>
    </div>
  );
}
