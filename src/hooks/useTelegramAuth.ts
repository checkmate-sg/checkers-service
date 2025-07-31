"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  useEffect(() => {
    const runAuth = async () => {
      // Simple check to make sure it's inside Telegram
      if (typeof window === "undefined" || !window.Telegram?.WebApp) {
        setError("This app must be opened from Telegram");
        setIsLoading(false);
        router.push("/unauthorized");
        return;
      }

      const initData = window.Telegram.WebApp.initData;
      if (!initData) {
        setError("No Telegram authentication data found");
        setIsLoading(false);
        router.push("/unauthorized");
        return;
      }

      try {
        // Set signing out state
        setIsSigningOut(true);

        // Force sign out and clear all session data
        await signOut({
          redirect: false,
          callbackUrl: window.location.pathname, // Stay on current page
        });

        // Clear any cached session data
        if (typeof window !== "undefined") {
          // Clear NextAuth session cookie manually if needed
          document.cookie =
            "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie =
            "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax;";
        }

        // Wait a bit to ensure signOut completes
        await new Promise((resolve) => setTimeout(resolve, 100));

        setIsSigningOut(false);

        // Sign in with fresh data
        const result = await signIn("telegram", {
          redirect: false,
          initData,
        });

        if (!result?.ok) {
          throw new Error(result?.error || "Unknown error");
        }

        setError(null);
      } catch (err: any) {
        console.error("[Auth] Error during sign-in:", err);
        setError("Authentication failed");
        setIsLoading(false);
        setIsSigningOut(false);
        router.push("/unauthorized");
      }
    };

    // Only run auth if we're not currently signing out and don't have a session
    if (!isSigningOut && status !== "loading") {
      runAuth();
    }
  }, [router, status, isSigningOut]);

  // Once session is available, set context and mark loading as complete
  useEffect(() => {
    if (session && !isSigningOut) {
      console.log("[Auth] Session loaded:", session.user);
      setCheckerDetails((prev) => ({
        ...prev,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: (session.user as any).telegramId,
      }));

      setIsLoading(false);
    }
  }, [session, setCheckerDetails, isSigningOut]);

  return {
    isLoading: isLoading || isSigningOut,
    error,
    session,
    isAuthenticated: !!session && !isSigningOut,
  };
}
