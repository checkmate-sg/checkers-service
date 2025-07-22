// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession, getCsrfToken } from "next-auth/react";
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
        console.log("[Auth] Starting authentication process...");

        // Check if we have Telegram WebApp context
        if (
          typeof window !== "undefined" &&
          window.Telegram &&
          window.Telegram.WebApp
        ) {
          console.log("[Auth] Telegram WebApp context found");

          const initData = window.Telegram.WebApp.initData;

          if (initData) {
            console.log("[Auth] Found initData, attempting authentication...");

            // Wait for NextAuth to be fully ready
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Method 1: Let NextAuth handle CSRF automatically (recommended)
            const result = await signIn("telegram", {
              redirect: false,
              initData: initData,
              callbackUrl: "/dashboard",
              // Remove manual csrfToken - let NextAuth handle it
            });

            console.log("[Auth] SignIn result:", result);

            if (result?.error) {
              console.error("[Auth] NextAuth sign-in failed:", result.error);

              // If still CSRF error, try alternative approach
              if (result.error === "MissingCSRF" || result.error === "CSRF") {
                console.log("[Auth] Trying alternative CSRF approach...");

                // Method 2: Force refresh the page to reset CSRF state
                if (typeof window !== "undefined") {
                  window.location.reload();
                  return;
                }
              }

              setError(result.error);
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

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Auth] Development mode - proceeding without Telegram context"
            );
          } else {
            router.push("/unauthorized");
          }
        }
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        router.push("/unauthorized");
      } finally {
        setIsLoading(false);
      }
    };

    console.log(
      "[Auth] useEffect triggered - status:",
      status,
      "session:",
      !!session
    );

    // Wait for NextAuth to load
    if (status === "loading") {
      console.log("[Auth] NextAuth still loading...");
      return;
    }

    // If we don't have a session, try to authenticate
    if (!session) {
      console.log("[Auth] No session found, attempting authentication");
      authenticateWithTelegram();
    } else {
      console.log("[Auth] Session found, updating global state");
      setCheckerDetails((currentChecker) => ({
        ...currentChecker,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: session.user.telegramId,
      }));
      setIsLoading(false);
    }
  }, [session, status, router, setCheckerDetails]);

  return { isLoading, error, session };
}
