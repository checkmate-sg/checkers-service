import { auth } from '@/auth';
import { CheckersDashboard } from '@/components/dashboard/CheckersDashboard';

export default async function Dashboard() {
      const session = await auth();

      if (!session?.user) return null;
      else {
            console.log(session);
      }
      return (
            <div>
                  <CheckersDashboard />
            </div>
      )
};