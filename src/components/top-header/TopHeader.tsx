"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconMenu2 } from "@tabler/icons-react";
import { useGetCheckersProgrammeById } from "@/hooks/checkers/useGetCheckersProgramme";
import { useGetCheckersById } from "@/hooks/checkers/useGetCheckersDetails";
import TargetLoadDialog from "@/components/dashboard/TargetLoadDialog";

import classes from "./TopHeader.module.css";

type TopHeaderProps = {
  title: string;
  logoSrc?: string;
  logoLabel?: string;
};

const menuItemClass =
  "rounded-md px-2 py-2 text-md font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

export default function TopHeader({
  title = "DASHBOARD",
  logoSrc = "/logo-1.jpg",
  logoLabel = "CheckMate",
}: TopHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: programmeData } = useGetCheckersProgrammeById(session?.user?.id ?? "");
  const { data: checkerData } = useGetCheckersById(session?.user?.id ?? "");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasActiveProgramme = !!programmeData?.programme;
  const isActive = checkerData?.isActive ?? false;

  const handleToggleActive = () => {
    setShowBreakDialog(true);
  };

  const handleStartNewProgramme = () => {
    setShowConfirmDialog(true);
  };

  const startNewProgramme = async () => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/checkers/${session.user.id}/programme`, {
        method: "POST",
      });

      if (res.ok) {
        setShowConfirmDialog(false);
        // Invalidate programme query to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ["useGetCheckersProgrammeById"] });
        router.push("/dashboard");
      } else {
        console.error("Failed to start new programme");
      }
    } catch (error) {
      console.error("Error starting new programme:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="sticky p-3 top-0 bg-white/90">
        <div className="grid grid-cols-3 items-center">
          <div className="justify-self-start">
            <Button
              variant="ghost"
              size="xlIcon"
              aria-label="Go back"
              onClick={() => router.back()}
              className="hover:bg-transaprent" // overrides ghost hover
            >
              <ArrowLeft className="text-orange-600" />
            </Button>
          </div>

          <h1 className="justify-self-center select-none text-xl font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
            {title}
          </h1>

          <div className="justify-self-end flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu"
                  className="hover:bg-transparent"
                >
                  <IconMenu2 stroke={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={2}
                className="w-[180px] rounded-xl border bg-popover p-2 text-popover-foreground"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={() => setShowTargetDialog(true)}
                  >
                    Choose target load
                  </DropdownMenuItem>
                  <DropdownMenuItem className={menuItemClass} onClick={handleToggleActive}>
                    {isActive ? "Take a break" : "Resume checking"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className={menuItemClass} onClick={handleStartNewProgramme}>
                    Start new programme
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {logoSrc && (
              <img
                src={logoSrc}
                alt={logoLabel}
                className={`${classes.orangeGlow} h-[12vw] w-[12vw] rounded-full`}
              />
            )}
          </div>
        </div>
      </div>

      {session?.user?.id && (
        <TargetLoadDialog
          checkerId={session.user.id}
          currentValue={checkerData?.targetDailyVotes ?? 10}
          open={showTargetDialog}
          onOpenChange={setShowTargetDialog}
        />
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Programme?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {hasActiveProgramme ? (
                  <>
                    <p>You will lose all progress on your current programme:</p>
                    <ul className="mt-2 list-disc pl-4">
                      <li>
                        Votes: {programmeData.progress?.votes.current ?? 0}/
                        {programmeData.progress?.votes.target ?? 0}
                      </li>
                      <li>Accuracy: {programmeData.progress?.accuracy.current ?? 0}%</li>
                      <li>
                        Reports: {programmeData.progress?.reports.current ?? 0}/
                        {programmeData.progress?.reports.target ?? 0}
                      </li>
                    </ul>
                  </>
                ) : (
                  <p>This will start a new 90-day programme with fresh targets.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startNewProgramme} disabled={isSubmitting}>
              {isSubmitting ? "Starting..." : "Start New Programme"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{isActive ? "Take a break?" : "Resume checking?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isActive
                ? "To stop receiving messages, type /deactivate in the bot chat."
                : "To start receiving messages again, type /activate in the bot chat."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
