"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
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
        // Always sign out first (no redirect)
        await signOut({ redirect: false });

        // Sign in immediately after
        const result = await signIn("telegram", {
          redirect: false,
          initData,
        });

        if (!result?.ok) {
          throw new Error(result?.error || "Unknown error");
        }

        // Session will update naturally
        setError(null);
      } catch (err: any) {
        console.error("[Auth] Error during sign-in:", err);
        setError("Authentication failed");
        setIsLoading(false);
        router.push("/unauthorized");
      }
    };

    runAuth();
  }, [router]);

  // Once session is available, set context and mark loading as complete
  useEffect(() => {
    if (session) {
      console.log("[Auth] Session loaded:", session.user);
      setCheckerDetails((prev) => ({
        ...prev,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: (session.user as any).telegramId,
      }));

      setIsLoading(false);
    }
  }, [session, setCheckerDetails]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session,
  };
}
