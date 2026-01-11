"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { useGetCheckersById } from "@/hooks/checkers/useGetCheckersDetails";
import { useGetCheckersProgrammeById } from "@/hooks/checkers/useGetCheckersProgramme";

import { NoProgrammeDashboard } from "./NoProgrammeDashboard";
import { ProgrammeDashboard } from "./ProgrammeDashboard";

interface CheckersDashboardProps {
  checkerId: string;
}

export const CheckersDashboard = ({ checkerId }: CheckersDashboardProps) => {
  const isProd = process.env.NODE_ENV === "production";

  const {
    data: checker,
    isLoading: checkerLoading,
    error: checkerError,
  } = useGetCheckersById(checkerId);

  const {
    data: programme,
    isLoading: programmeLoading,
    error: programmeError,
  } = useGetCheckersProgrammeById(checkerId);

  if (checkerLoading || programmeLoading)
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );

  if (checkerError || programmeError) {
    return (
      <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[200px] gap-3">
        <AlertCircle className="text-red-500" size={32} />
        <p className="text-red-600 text-center font-medium">
          Something went wrong loading your dashboard.
        </p>
        <p className="text-gray-500 text-sm text-center">
          {checkerError?.message || programmeError?.message || "Please try again later."}
        </p>
      </div>
    );
  }

  if (!programme?.programme) {
    return <NoProgrammeDashboard checkerId={checkerId} />;
  }

  return <ProgrammeDashboard checker={checker} programme={programme} />;
};
