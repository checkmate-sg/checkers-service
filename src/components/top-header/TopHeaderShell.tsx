"use client";

import { usePathname } from "next/navigation";
import TopHeader from "./TopHeader";

export default function TopHeaderShell() {
    const pathname = usePathname();

    const title = 
        pathname?.startsWith("/dashboard") ? "DASHBOARD":
        pathname?.startsWith("/leaderboard") ? "LEADERBOARD":
        pathname?.startsWith("/my-votes") ? "MY VOTES":
        pathname?.startsWith("/vote") ? "VOTE":
        "CHECKMATE";

    return (
        <TopHeader title={title}/>
    )
}