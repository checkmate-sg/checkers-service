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

  const hasSignedOut = useRef(false);
  const isAuthenticating = useRef(false);
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
      "HasSignedOut:",
      hasSignedOut.current,
      "IsAuthenticating:",
      isAuthenticating.current
    );

    // Still loading NextAuth
    if (status === "loading") {
      console.log("[Auth] NextAuth is still loading...");
      return;
    }

    // Step 1: Always sign out first (clear any existing session)
    if (!hasSignedOut.current) {
      console.log("[Auth] Signing out any existing session...");
      hasSignedOut.current = true;
      signOut({ redirect: false });
      return;
    }

    // Step 2: After successful authentication, set user details
    if (session && hasSignedOut.current && !isAuthenticating.current) {
      console.log("[Auth] New session found, setting user details");
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

      setIsLoading(false);
      setError(null);
      return;
    }

    // Step 3: No session after sign out - start fresh authentication
    if (!session && hasSignedOut.current && !isAuthenticating.current) {
      console.log("[Auth] Starting fresh Telegram authentication...");

      // Check Telegram WebApp context
      const isTelegramWebApp =
        typeof window !== "undefined" && window.Telegram?.WebApp;

      if (!isTelegramWebApp) {
        console.error("[Auth] Not in Telegram WebApp context");
        setError("This app must be opened from Telegram");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
        return;
      }

      const initData = window.Telegram.WebApp.initData;

      if (!initData) {
        console.error("[Auth] No Telegram initData available");
        setError("No Telegram authentication data found");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
        return;
      }

      // Start authentication
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
            redirectTimeout.current = setTimeout(
              () => router.push("/unauthorized"),
              3000
            );
          } else if (!result?.ok) {
            console.warn("[Auth] Unexpected sign in result:", result);
            setError("Unexpected authentication result");
            setIsLoading(false);
            redirectTimeout.current = setTimeout(
              () => router.push("/unauthorized"),
              3000
            );
          } else {
            // Force session refresh after successful sign in
            console.log("[Auth] Sign in successful, forcing session update");
            setTimeout(() => {
              update();
            }, 500);
          }
        })
        .catch((err) => {
          console.error("[Auth] Sign in error:", err);
          isAuthenticating.current = false;
          setError("Authentication failed");
          setIsLoading(false);
          redirectTimeout.current = setTimeout(
            () => router.push("/unauthorized"),
            3000
          );
        });

      return;
    }

    // Step 4: If we're still authenticating, wait
    if (isAuthenticating.current) {
      console.log("[Auth] Currently authenticating, waiting...");
      return;
    }
  }, [session, status, setCheckerDetails, router]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session,
  };
}
