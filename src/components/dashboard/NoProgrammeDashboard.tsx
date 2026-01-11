import { AlertCircle, Loader2 } from "lucide-react";

import { useGetCheckersStatsById } from "@/hooks/checkers/useGetCheckersStats";

import StatCard from "./StatCard";

interface NoProgrammeDashboardProps {
  checkerId: string;
}

export const NoProgrammeDashboard = ({ checkerId }: NoProgrammeDashboardProps) => {
  const { data, isLoading, error } = useGetCheckersStatsById(checkerId);

  if (isLoading)
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[200px] gap-3">
        <AlertCircle className="text-red-500" size={32} />
        <p className="text-red-600 text-center font-medium">
          Something went wrong loading your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <h2 className="text-xl font-semibold text-primary">In the past 30 days</h2>
      <div className="my-3 flex flex-col gap-y-4 mx-2">
        <StatCard name="messages voted on" imgSrc="/votes.png" stat={String(data.voteCount)} />
        <StatCard
          name="average accuracy rate"
          imgSrc="/accuracy.png"
          stat={data.accuracy === null ? "NA" : `${data.accuracy.toFixed(1)}%`}
        />
        <StatCard name="message reported" imgSrc="/message.png" stat={String(data.reports)} />
      </div>
    </div>
  );
};
