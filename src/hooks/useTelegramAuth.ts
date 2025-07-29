// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  // Use refs to track authentication state without causing re-renders
  const hasAttemptedAuth = useRef(false);
  const isAuthenticating = useRef(false);
  const userDetailsSet = useRef(false);

  useEffect(() => {
    console.log(
      "[Auth] Status:",
      status,
      "Session:",
      !!session,
      "HasAttempted:",
      hasAttemptedAuth.current,
      "IsAuthenticating:",
      isAuthenticating.current
    );

    // Still loading NextAuth
    if (status === "loading") {
      return;
    }

    // We have a session - set user details once and we're done
    if (session && !userDetailsSet.current) {
      console.log("[Auth] Session found, setting user details");
      setCheckerDetails((current) => ({
        ...current,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: session.user.telegramId,
      }));
      userDetailsSet.current = true;
      setIsLoading(false);
      setError(null);
      return;
    }

    // If we already have a session and details are set, don't do anything
    if (session && userDetailsSet.current) {
      return;
    }

    // No session, but we're currently authenticating - wait
    if (!session && isAuthenticating.current) {
      console.log("[Auth] Currently authenticating, waiting...");
      return;
    }

    // No session and we haven't tried to authenticate yet
    if (!session && !hasAttemptedAuth.current && !isAuthenticating.current) {
      console.log("[Auth] No session, attempting Telegram auth");
      hasAttemptedAuth.current = true;
      isAuthenticating.current = true;

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
            isAuthenticating.current = false;

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
            isAuthenticating.current = false;
            setError("Authentication failed");
            setIsLoading(false);
            router.push("/unauthorized");
          });
      } else {
        console.error("[Auth] No Telegram WebApp context");
        isAuthenticating.current = false;
        setError("Telegram WebApp not available");
        setIsLoading(false);
        router.push("/unauthorized");
      }
      return;
    }

    // No session and we already tried - authentication failed
    if (!session && hasAttemptedAuth.current && !isAuthenticating.current) {
      console.log("[Auth] No session after auth attempt");
      setIsLoading(false);
      if (!error) {
        setError("Authentication failed");
        router.push("/unauthorized");
      }
    }
  }, [session, status]); // Removed dependencies that were causing loops

  return { isLoading, error, session };
}
