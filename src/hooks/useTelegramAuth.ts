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

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const authenticate = async () => {
      // Not in Telegram WebApp context
      if (typeof window === "undefined" || !window.Telegram?.WebApp) {
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
        console.error("[Auth] No initData found");
        setError("Missing Telegram data");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
        return;
      }

      // Start sign-in
      console.log("[Auth] Triggering signIn with initData...");
      hasStartedAuth.current = true;

      const result = await signIn("telegram", {
        redirect: false,
        initData,
      });

      if (!result?.ok) {
        console.error("[Auth] signIn failed:", result?.error);
        setError("Authentication failed");
        setIsLoading(false);
        redirectTimeout.current = setTimeout(
          () => router.push("/unauthorized"),
          3000
        );
      } else {
        console.log("[Auth] signIn succeeded, forcing session update");
        setTimeout(() => update(), 500);
      }
    };

    // Start sign-in immediately once
    if (!hasStartedAuth.current) {
      authenticate();
    }

    // Once session is available, set context
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
  }, [session, setCheckerDetails, router, update]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session,
  };
}
