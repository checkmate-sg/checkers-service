"use client";

import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { IconMenu2 } from "@tabler/icons-react";

import classes from "./TopHeader.module.css";

type TopHeaderProps = {
  title: string;
  logoSrc?: string;
  logoLabel?: string;
};

export default function TopHeader({
  title = "DASHBOARD",
  logoSrc = "/logo-1.jpg",
  logoLabel = "CheckMate",
}: TopHeaderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    console.log("User is authenticated:", session.user);
  }

  const handleTakeBreak = () => {
    console.log("Taking a break");
  };

  const handleRestartProgram = () => {
    console.log("Restarting program");
  };

  return (
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
                  className="rounded-md px-2 py-2 text-md font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={handleTakeBreak}
                >
                  Take a break
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-md px-2 py-2 text-md font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={handleRestartProgram}
                >
                  Restart Program
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
  );
}
