// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  useEffect(() => {
    // Only run once when component mounts
    if (hasInitialized || status === "loading") {
      return;
    }

    const initializeAuth = async () => {
      setHasInitialized(true);

      try {
        console.log("[Auth] Starting fresh authentication flow...");

        // Step 1: Clear any existing session
        await signOut({ redirect: false });

        // Step 2: Check Telegram WebApp context
        const isTelegramWebApp =
          typeof window !== "undefined" && window.Telegram?.WebApp;

        if (!isTelegramWebApp) {
          throw new Error("This app must be opened from Telegram");
        }

        const initData = window.Telegram.WebApp.initData;

        if (!initData) {
          throw new Error("No Telegram authentication data found");
        }

        // Step 3: Sign in with Telegram
        const result = await signIn("telegram", {
          redirect: false,
          initData: initData,
        });

        if (result?.error || !result?.ok) {
          throw new Error(result?.error || "Authentication failed");
        }

        console.log(
          "[Auth] Authentication successful - forcing session refresh"
        );

        // Force session refresh to get latest data from database
        await update();
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setIsLoading(false);

        // Redirect to unauthorized page after 3 seconds
        setTimeout(() => router.push("/unauthorized"), 3000);
      }
    };

    initializeAuth();
  }, [status, hasInitialized, router]);

  // Handle successful session
  useEffect(() => {
    if (session && hasInitialized) {
      console.log("[Auth] Session established, setting user details");

      setCheckerDetails((current) => ({
        ...current,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: (session.user as any).telegramId,
      }));

      setIsLoading(false);
      setError(null);
    }
  }, [session, hasInitialized, setCheckerDetails]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session,
  };
}
