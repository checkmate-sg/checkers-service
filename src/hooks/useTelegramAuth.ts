// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  // Use refs to track authentication state without causing re-renders
  const hasAttemptedAuth = useRef(false);
  const isAuthenticating = useRef(false);
  const userDetailsSet = useRef(false);
  const redirectTimeout = useRef<NodeJS.Timeout>();
  const hasSignedOut = useRef(false);
  const isCleaningUp = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  // Reset function to clear all state and restart authentication
  const resetAndReauth = async () => {
    if (isCleaningUp.current) return;

    console.log("[Auth] Resetting authentication state");
    isCleaningUp.current = true;

    // Reset all refs
    hasAttemptedAuth.current = false;
    isAuthenticating.current = false;
    userDetailsSet.current = false;
    hasSignedOut.current = false;

    // Clear any existing session
    try {
      await signOut({
        redirect: false,
        callbackUrl: window.location.href,
      });
      console.log("[Auth] Session cleared successfully");
    } catch (err) {
      console.error("[Auth] Error clearing session:", err);
    }

    // Small delay to ensure session is cleared
    setTimeout(() => {
      isCleaningUp.current = false;
      // Force session update
      update();
    }, 100);
  };

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
      userDetailsSet.current,
      "HasSignedOut:",
      hasSignedOut.current,
      "IsCleaningUp:",
      isCleaningUp.current
    );

    // Don't proceed if we're cleaning up
    if (isCleaningUp.current) {
      console.log("[Auth] Currently cleaning up, waiting...");
      return;
    }

    // Still loading NextAuth
    if (status === "loading") {
      console.log("[Auth] NextAuth is still loading...");
      return;
    }

    // If we have a session but haven't cleared it for re-auth, clear it first
    if (session && !hasSignedOut.current && !userDetailsSet.current) {
      console.log("[Auth] Clearing existing session before re-authentication");
      resetAndReauth();
      return;
    }

    // We have a fresh session after successful authentication
    if (
      session &&
      hasSignedOut.current &&
      !userDetailsSet.current &&
      !isAuthenticating.current
    ) {
      console.log("[Auth] Fresh session found, setting user details");

      // Log session details
      console.log("[Auth] Session details:", {
        id: session.user?.id,
        name: session.user?.name,
        telegramId: (session.user as any)?.telegramId,
      });

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

    // If we already have a session and details are set, we're done
    if (session && userDetailsSet.current) {
      console.log("[Auth] Already authenticated and details set");
      setIsLoading(false);
      return;
    }

    // No session, but we're currently authenticating - wait
    if (!session && isAuthenticating.current) {
      console.log("[Auth] Currently authenticating, waiting...");
      return;
    }

    // No session and we haven't tried to authenticate yet (after clearing)
    if (
      !session &&
      hasSignedOut.current &&
      !hasAttemptedAuth.current &&
      !isAuthenticating.current
    ) {
      console.log("[Auth] Starting fresh authentication attempt");

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
      setError(null);

      signIn("telegram", {
        redirect: false,
        initData: initData,
        callbackUrl: window.location.href,
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
            // Force session update
            update();
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

    // No session and we already tried - authentication might have failed
    if (
      !session &&
      hasAttemptedAuth.current &&
      !isAuthenticating.current &&
      hasSignedOut.current
    ) {
      console.log("[Auth] No session after auth attempt, checking for failure");

      // Give it a moment for the session to potentially update
      if (!redirectTimeout.current) {
        redirectTimeout.current = setTimeout(() => {
          if (!session && !error) {
            console.log("[Auth] Authentication appears to have failed");
            setError("Authentication failed - please try again");
            setIsLoading(false);

            // Redirect to unauthorized after showing error
            setTimeout(() => {
              router.push("/unauthorized");
            }, 3000);
          }
        }, 2000); // Wait 2 seconds for session to potentially arrive
      }
    }
  }, [session, status, setCheckerDetails, router, error, update]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session && userDetailsSet.current,
    resetAuth: resetAndReauth, // Expose reset function if needed
  };
}
