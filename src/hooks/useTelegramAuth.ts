// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
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
      isAuthenticating.current,
      "UserDetailsSet:",
      userDetailsSet.current
    );

    console.log("[Auth] forced sign out");

    signOut({ redirect: false }); // Clear any existing session

    // Log session details if available
    if (session) {
      console.log("[Auth] Session details:", {
        id: session.user?.id,
        name: session.user?.name,
        telegramId: (session.user as any)?.telegramId,
      });
    }

    // Still loading NextAuth
    if (status === "loading") {
      console.log("[Auth] NextAuth is still loading...");
      return;
    }

    // We have a session - set user details once and we're done
    if (session && !userDetailsSet.current) {
      console.log("[Auth] Session found, setting user details");
      setCheckerDetails((current) => ({
        ...current,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: (session.user as any).telegramId,
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
      console.log("[Auth] No session, checking for Telegram WebApp context");

      // Check if we're in a Telegram WebApp environment
      const isTelegramWebApp =
        typeof window !== "undefined" && window.Telegram?.WebApp;

      console.log("[Auth] Telegram WebApp context:", {
        hasTelegram: !!window.Telegram,
        hasWebApp: !!window.Telegram?.WebApp,
        hasInitData: !!window.Telegram?.WebApp?.initData,
        initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
      });

      if (!isTelegramWebApp) {
        console.error("[Auth] Not running in Telegram WebApp context");
        setError("This app must be opened from Telegram");
        setIsLoading(false);
        hasAttemptedAuth.current = true;

        redirectTimeout.current = setTimeout(() => {
          router.push("/unauthorized");
        }, 3000);
        return;
      }

      const initData = window.Telegram.WebApp.initData;

      if (!initData) {
        console.error("[Auth] No Telegram initData available");
        setError("No Telegram authentication data found");
        setIsLoading(false);
        hasAttemptedAuth.current = true;

        redirectTimeout.current = setTimeout(() => {
          router.push("/unauthorized");
        }, 3000);
        return;
      }

      console.log("[Auth] Starting Telegram authentication...");
      hasAttemptedAuth.current = true;
      isAuthenticating.current = true;

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

            redirectTimeout.current = setTimeout(() => {
              router.push("/unauthorized");
            }, 3000);
          } else if (result?.ok) {
            console.log(
              "[Auth] Sign in successful, waiting for session update"
            );
            // Don't set loading to false here - wait for session to update
          } else {
            console.warn("[Auth] Unexpected sign in result:", result);
            setError("Unexpected authentication result");
            setIsLoading(false);

            redirectTimeout.current = setTimeout(() => {
              router.push("/unauthorized");
            }, 3000);
          }
        })
        .catch((err) => {
          console.error("[Auth] Sign in error:", err);
          isAuthenticating.current = false;
          setError("Authentication failed");
          setIsLoading(false);

          redirectTimeout.current = setTimeout(() => {
            router.push("/unauthorized");
          }, 3000);
        });

      return;
    }

    // No session and we already tried - authentication failed
    if (!session && hasAttemptedAuth.current && !isAuthenticating.current) {
      console.log("[Auth] No session after auth attempt");
      if (!error) {
        setError("Authentication failed - please try again");
        setIsLoading(false);

        redirectTimeout.current = setTimeout(() => {
          router.push("/unauthorized");
        }, 3000);
      }
    }
  }, [session, status, setCheckerDetails, router, error]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session && userDetailsSet.current,
  };
}
