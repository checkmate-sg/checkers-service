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
  const redirectTimeout = useRef<NodeJS.Timeout>();

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

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
      setIsLoading(false);
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

              // Delay redirect to allow user to see error
              redirectTimeout.current = setTimeout(() => {
                router.push("/unauthorized");
              }, 2000);
            } else if (result?.ok) {
              console.log("[Auth] Sign in successful, session should update");
              // Don't set loading to false here - wait for session to update
            }
          })
          .catch((err) => {
            console.error("[Auth] Sign in error:", err);
            isAuthenticating.current = false;
            setError("Authentication failed");
            setIsLoading(false);

            redirectTimeout.current = setTimeout(() => {
              router.push("/unauthorized");
            }, 2000);
          });
      } else {
        console.error("[Auth] No Telegram WebApp context");
        isAuthenticating.current = false;
        setError("This app must be opened from Telegram");
        setIsLoading(false);

        redirectTimeout.current = setTimeout(() => {
          router.push("/unauthorized");
        }, 2000);
      }
      return;
    }

    // No session and we already tried - authentication failed
    if (!session && hasAttemptedAuth.current && !isAuthenticating.current) {
      console.log("[Auth] No session after auth attempt");
      setIsLoading(false);
      if (!error) {
        setError("Authentication failed - please try again");
        redirectTimeout.current = setTimeout(() => {
          router.push("/unauthorized");
        }, 2000);
      }
    }
  }, [session, status, setCheckerDetails, router]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session && userDetailsSet.current,
  };
}
