import { auth } from "@/auth";
import { VoteDashboard } from "@/components/voteDashboard/VoteDashboard";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) return null;

  return <VoteDashboard checkerId={session.user.id} />;
}
