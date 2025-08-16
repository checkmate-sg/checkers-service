// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<
    "initial" | "signed-out" | "authenticating" | "complete"
  >("initial");

  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { setCheckerDetails, clearCheckerDetails } = useUser();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const handleAuth = async () => {
      try {
        // Step 1: Initial state - sign out existing session
        if (authStep === "initial") {
          console.log("[Auth] Starting fresh authentication - signing out...");
          clearCheckerDetails(); // Clear user context immediately
          setAuthStep("signed-out");
          await signOut({ redirect: false });
          return;
        }

        // Step 2: After sign out, start fresh authentication
        if (authStep === "signed-out" && !session) {
          console.log("[Auth] Session cleared, starting auth...");

          // LOCAL DEVELOPMENT BYPASS
          const isLocalEnv = process.env.NEXT_PUBLIC_ENVIRONMENT === "local";
          
          if (isLocalEnv) {
            console.log("[Auth] LOCAL ENVIRONMENT - Bypassing Telegram WebApp check");
            
            setAuthStep("authenticating");

            // Sign in with mock data for local development
            const result = await signIn("telegram", {
              redirect: false,
              initData: "mock-local-data", // This will trigger the server-side bypass
            });

            if (result?.error || !result?.ok) {
              throw new Error(result?.error || "Authentication failed");
            }

            console.log("[Auth] Sign in successful (local mode), waiting for session...");
            return;
          }

          // PRODUCTION: Check Telegram WebApp context
          const isTelegramWebApp =
            typeof window !== "undefined" && window.Telegram?.WebApp;

          if (!isTelegramWebApp) {
            throw new Error("This app must be opened from Telegram");
          }

          const initData = window.Telegram.WebApp.initData;

          if (!initData) {
            throw new Error("No Telegram authentication data found");
          }

          setAuthStep("authenticating");

          // Sign in with Telegram
          const result = await signIn("telegram", {
            redirect: false,
            initData: initData,
          });

          if (result?.error || !result?.ok) {
            throw new Error(result?.error || "Authentication failed");
          }

          console.log("[Auth] Sign in successful, waiting for session...");
          return;
        }

        // Step 3: Session established after authentication
        if (authStep === "authenticating" && session) {
          console.log("[Auth] New session established, updating user details");

          // Force a fresh session update to ensure we have latest DB data
          await update();

          setAuthStep("complete");
          return;
        }

        // Step 4: Complete - set user details
        if (authStep === "complete" && session) {
          console.log("[Auth] Setting user details from fresh session");

          setCheckerDetails((current) => ({
            ...current,
            checkerId: session.user.id,
            checkerName: session.user.name || "Unknown",
            telegramId: (session.user as any).telegramId,
          }));

          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setIsLoading(false);

        // Redirect to unauthorized page after 3 seconds
        setTimeout(() => router.push("/unauthorized"), 3000);
      }
    };

    handleAuth();
  }, [
    session,
    status,
    authStep,
    setCheckerDetails,
    clearCheckerDetails,
    router,
    update,
  ]);

  // Debug logging
  useEffect(() => {
    console.log(
      "[Auth Debug] Step:",
      authStep,
      "Session:",
      !!session,
      "Status:",
      status
    );
    if (session) {
      console.log("[Auth Debug] Session details:", {
        id: session.user?.id,
        name: session.user?.name,
        telegramId: (session.user as any)?.telegramId,
      });
    }
  }, [authStep, session, status]);

  return {
    isLoading,
    error,
    session,
    isAuthenticated: !!session && authStep === "complete",
  };
}
