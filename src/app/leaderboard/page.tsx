import { auth } from "@/auth";
import LeaderboardDashboard from "@/components/leaderboard/index";

export default async function Leaderboard() {
  const session = await auth();

  if (!session?.user) return null;

  return <LeaderboardDashboard currentUserId={session?.user?.id} />;
}
