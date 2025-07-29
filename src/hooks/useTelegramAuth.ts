// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  useEffect(() => {
    console.log(
      "[Auth] Status:",
      status,
      "Session:",
      !!session,
      "HasAttempted:",
      hasAttemptedAuth
    );

    // Still loading NextAuth
    if (status === "loading") {
      return;
    }

    // We have a session - set user details and we're done
    if (session) {
      console.log("[Auth] Session found, setting user details");
      setCheckerDetails((current) => ({
        ...current,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: session.user.telegramId,
      }));
      setIsLoading(false);
      setError(null);
      return;
    }

    // No session and we haven't tried to authenticate yet
    if (!session && !hasAttemptedAuth) {
      console.log("[Auth] No session, attempting Telegram auth");
      setHasAttemptedAuth(true);

      // Check for Telegram WebApp
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        console.log("[Auth] Found Telegram initData, signing in...");

        signIn("telegram", {
          redirect: false,
          initData: initData,
        })
          .then((result) => {
            console.log("[Auth] Sign in result:", result);
            if (result?.error) {
              console.error("[Auth] Sign in failed:", result.error);
              setError(`Authentication failed: ${result.error}`);
              setIsLoading(false);
              router.push("/unauthorized");
            }
            // If successful, the session will update and trigger this useEffect again
          })
          .catch((err) => {
            console.error("[Auth] Sign in error:", err);
            setError("Authentication failed");
            setIsLoading(false);
            router.push("/unauthorized");
          });
      } else {
        console.error("[Auth] No Telegram WebApp context");
        setError("Telegram WebApp not available");
        setIsLoading(false);
        router.push("/unauthorized");
      }
      return;
    }

    // No session and we already tried - authentication failed
    if (!session && hasAttemptedAuth) {
      console.log("[Auth] No session after auth attempt");
      setIsLoading(false);
      if (!error) {
        setError("Authentication failed");
        router.push("/unauthorized");
      }
    }
  }, [session, status, hasAttemptedAuth, router, setCheckerDetails, error]);

  return { isLoading, error, session };
}
