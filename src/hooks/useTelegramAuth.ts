"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, update } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  const hasStartedAuth = useRef(false);
  const redirectTimeout = useRef<NodeJS.Timeout>();

  // Clear redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  // 🚀 Authenticate ONCE on mount
  useEffect(() => {
    if (hasStartedAuth.current) return;
    hasStartedAuth.current = true;

    const authenticate = async () => {
      if (typeof window === "undefined" || !window.Telegram?.WebApp) {
        console.error("[Auth] Not in Telegram WebApp");
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
        console.error("[Auth] Missing initData");
        setError("Missing Telegram data");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
        return;
      }

      const result = await signIn("telegram", {
        redirect: false,
        initData,
      });

      if (!result?.ok) {
        console.error("[Auth] Sign in failed:", result?.error);
        setError("Authentication failed");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
      } else {
        console.log("[Auth] Sign in successful");
        // No need to call update(), let session naturally appear
      }
    };

    authenticate();
  }, [router]);

  // ✅ When session becomes available, set user and stop loading
  useEffect(() => {
    if (session) {
      console.log("[Auth] Session available:", session.user);
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
