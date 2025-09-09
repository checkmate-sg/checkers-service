"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import classes from './TopHeader.module.css';


type TopHeaderProps = {
    title:string;
    logoSrc?:string;
    logoLabel?:string;
}

export default function TopHeader({
    title="DASHBOARD",
    logoSrc="/logo-1.jpg",
    logoLabel="CheckMate",
}: TopHeaderProps) {
    const router = useRouter();

    return (
        <div className="p-2 sticky top-0 bg-white/90 border-b">
            <div className="grid grid-cols-3 items-center">
                <div className="justify-self-start">
                    {/* Increase the size of the button */}
                    <Button
                        variant="ghost"
                        aria-label="Go back"
                        onClick={() => router.back()}
                        className="h-12 w-12 hover:bg-orange-50"
                    >
                        <ArrowLeft className="h-12 w-12 text-orange-600" />
                    </Button>
                </div>

                <h1 className="justify-self-center select-none text-xl font-extrabold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                    {title}
                </h1>

                <div className="justify-self-end">
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
    )
}