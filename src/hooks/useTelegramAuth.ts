"use client";

import { useEffect, useState } from "react";
import { useSession, getCsrfToken } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  useEffect(() => {
    const authenticateWithTelegram = async () => {
      try {
        console.log("[Auth] Starting authentication process...");

        // Wait for CSRF token to be available
        console.log("[Auth] Getting CSRF token...");
        const csrfToken = await getCsrfToken();
        console.log("[Auth] CSRF token obtained:", !!csrfToken);

        if (!csrfToken) {
          console.error("[Auth] No CSRF token available");
          setError("CSRF token not available");
          return;
        }

        // Check if we have Telegram WebApp context
        if (
          typeof window !== "undefined" &&
          window.Telegram &&
          window.Telegram.WebApp
        ) {
          console.log("[Auth] Telegram WebApp context found");

          let initData = window.Telegram.WebApp.initData;

          if (initData) {
            console.log("[Auth] Found initData, attempting authentication...");

            // Wait a bit more for NextAuth to be ready
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Use fetch API directly to call the NextAuth API endpoint
            const response = await fetch("/api/auth/signin/telegram", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                initData: initData,
                csrfToken: csrfToken,
                callbackUrl: "/dashboard",
              }),
            });

            console.log("[Auth] Auth response status:", response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Auth] Authentication failed:", errorText);

              if (response.status === 401 || response.status === 403) {
                setError("Authentication failed - invalid credentials");
                router.push("/unauthorized");
                return;
              }

              setError(`Authentication failed: ${response.status}`);
              router.push("/unauthorized");
              return;
            }

            // If successful, redirect to dashboard
            const result = await response.json();
            console.log("[Auth] Authentication successful:", result);

            // Force a session update
            window.location.href = "/dashboard";
          } else {
            console.error("[Auth] No initData found");
            setError("No Telegram data found");
            router.push("/unauthorized");
          }
        } else {
          console.error("[Auth] No Telegram WebApp context found");
          setError("Telegram WebApp not available");

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Auth] Development mode - proceeding without Telegram context"
            );
            // In development, you might want to handle this differently
          } else {
            router.push("/unauthorized");
          }
        }
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        router.push("/unauthorized");
      } finally {
        setIsLoading(false);
      }
    };

    console.log(
      "[Auth] useEffect triggered - status:",
      status,
      "session:",
      !!session
    );

    // Wait for NextAuth to load
    if (status === "loading") {
      console.log("[Auth] NextAuth still loading...");
      return;
    }

    // If we don't have a session, try to authenticate
    if (!session) {
      console.log("[Auth] No session found, attempting authentication");
      authenticateWithTelegram();
    } else {
      console.log("[Auth] Session found, updating global state");
      setCheckerDetails((currentChecker) => ({
        ...currentChecker,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: session.user.telegramId,
      }));
      setIsLoading(false);
    }
  }, [session, status, router, setCheckerDetails]);

  return { isLoading, error, session };
}
