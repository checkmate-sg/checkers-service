"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  useEffect(() => {
    const authenticateWithTelegram = async () => {
      try {
        // Development mode: sign out first
        if (process.env.NODE_ENV === "development") {
          await signOut({ redirect: false });
          console.log("Signed out for dev mode");
        }

        // Check if we have Telegram WebApp context
        if (
          typeof window !== "undefined" &&
          window.Telegram &&
          window.Telegram.WebApp
        ) {
          // Set dark mode if needed
          //   if (window.Telegram.WebApp.colorScheme === "dark") {
          //     document.documentElement.classList.add("dark");
          //   }

          let initData = window.Telegram.WebApp.initData;

          // Dev fallback
          if (!initData && process.env.NODE_ENV === "development") {
            initData = "devdummy";
          }

          if (initData) {
            console.log("[Auth] Found initData, authenticating...");

            // Try to sign in with NextAuth using Telegram data
            const result = await signIn("credentials", {
              redirect: false,
              initData: initData,
            });

            if (!result?.ok) {
              console.error("[Auth] NextAuth sign-in failed:", result?.error);

              // If NextAuth fails, the user might not exist in DB
              // Redirect to unauthorized
              router.push("/unauthorized");
              return;
            }

            console.log("[Auth] NextAuth sign-in successful");
          } else {
            console.error("[Auth] No initData found");
            setError("No Telegram data found");
            router.push("/unauthorized");
          }
        } else {
          console.error("[Auth] No Telegram WebApp context found");
          setError("Telegram WebApp not available");
          router.push("/unauthorized");
        }
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        router.push("/unauthorized");
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for NextAuth to load
    if (status === "loading") {
      return;
    }

    // If we don't have a session, try to authenticate
    if (!session) {
      authenticateWithTelegram();
    } else {
      // We have a session, update global checker details
      setCheckerDetails((currentChecker) => ({
        ...currentChecker,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: (session.user as any).telegramId,
      }));
      setIsLoading(false);
    }
  }, [session, status, router, setCheckerDetails]);

  return { isLoading, error, session };
}
