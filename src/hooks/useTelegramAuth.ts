// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  // Effect to handle authentication
  useEffect(() => {
    console.log("[Auth] Status:", status, "Session:", !!session);

    // Still loading NextAuth
    if (status === "loading") {
      console.log("[Auth] NextAuth is still loading...");
      return;
    }

    // Always start authentication (ignore existing session)
    console.log("[Auth] Starting Telegram authentication...");

    // Check Telegram WebApp context
    const isTelegramWebApp =
      typeof window !== "undefined" && window.Telegram?.WebApp;

    if (!isTelegramWebApp) {
      console.error("[Auth] Not in Telegram WebApp context");
      setError("This app must be opened from Telegram");
      setIsLoading(false);
      setTimeout(() => router.push("/unauthorized"), 3000);
      return;
    }

    const initData = window.Telegram.WebApp.initData;

    if (!initData) {
      console.error("[Auth] No Telegram initData available");
      setError("No Telegram authentication data found");
      setIsLoading(false);
      setTimeout(() => router.push("/unauthorized"), 3000);
      return;
    }

    // Sign in with Telegram
    console.log("[Auth] Signing in with Telegram...");
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
          setTimeout(() => router.push("/unauthorized"), 3000);
        } else if (!result?.ok) {
          console.warn("[Auth] Unexpected sign in result:", result);
          setError("Unexpected authentication result");
          setIsLoading(false);
          setTimeout(() => router.push("/unauthorized"), 3000);
        } else {
          // Successful sign in - set user details from the new session
          console.log(
            "[Auth] Sign in successful, waiting for session update..."
          );
        }
      })
      .catch((err) => {
        console.error("[Auth] Sign in error:", err);
        setError("Authentication failed");
        setIsLoading(false);
        setTimeout(() => router.push("/unauthorized"), 3000);
      });
  }, [status, setCheckerDetails, router]); // Removed session from dependency array

  // Separate effect to handle session updates after successful auth
  useEffect(() => {
    if (session) {
      console.log("[Auth] Session updated, setting user details");
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
    }
  }, [session, setCheckerDetails]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session,
  };
}
