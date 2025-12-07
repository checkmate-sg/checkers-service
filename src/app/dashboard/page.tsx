import { auth } from "@/auth";
import { CheckersDashboard } from "@/components/dashboard/CheckersDashboard";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) return null;

  return <CheckersDashboard checkerId={session.user.id} />;
}
