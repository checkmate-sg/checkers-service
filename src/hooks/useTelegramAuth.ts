// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
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

        // Development mode: sign out first
        if (process.env.NODE_ENV === "development") {
          console.log("[Auth] Development mode - signing out first");
          await signOut({ redirect: false });
        }

        // Check if we have Telegram WebApp context
        if (
          typeof window !== "undefined" &&
          window.Telegram &&
          window.Telegram.WebApp
        ) {
          console.log("[Auth] Telegram WebApp context found");

          // Set dark mode if needed
          //   if (window.Telegram.WebApp.colorScheme === "dark") {
          //     document.documentElement.classList.add("dark");
          //   }

          let initData = window.Telegram.WebApp.initData;

          // Dev fallback
          if (!initData && process.env.NODE_ENV === "development") {
            console.log("[Auth] No initData in dev mode, using dummy data");
            // Create a more realistic dummy initData for development
            const dummyData = {
              user: JSON.stringify({
                id: 123456789,
                first_name: "Test",
                last_name: "User",
                username: "testuser",
              }),
              chat_instance: "test_instance",
              chat_type: "private",
              auth_date: Math.floor(Date.now() / 1000).toString(),
            };

            const params = new URLSearchParams(dummyData);
            // Add a dummy hash (in real scenario, this would be HMAC)
            params.set("hash", "dummy_hash_for_dev");
            initData = params.toString();
          }

          if (initData) {
            console.log("[Auth] Found initData, attempting authentication...");

            // Wait a bit for NextAuth to be ready
            await new Promise((resolve) => setTimeout(resolve, 100));

            const result = await signIn("telegram", {
              redirect: false,
              initData: initData,
              callbackUrl: "/dashboard",
            });

            console.log("[Auth] SignIn result:", result);

            if (result?.error) {
              console.error("[Auth] NextAuth sign-in failed:", result.error);

              // Handle specific errors
              if (result.error === "MissingCSRF") {
                console.log("[Auth] CSRF error, retrying...");
                // Try once more after a short delay
                await new Promise((resolve) => setTimeout(resolve, 500));
                const retryResult = await signIn("telegram", {
                  redirect: false,
                  initData: initData,
                  callbackUrl: "/dashboard",
                });

                if (retryResult?.error) {
                  setError(`Authentication failed: ${retryResult.error}`);
                  router.push("/unauthorized");
                  return;
                }
              } else {
                setError(result.error);
                router.push("/unauthorized");
                return;
              }
            }

            console.log("[Auth] NextAuth sign-in successful");
          } else {
            console.error("[Auth] No initData found");
            setError("No Telegram data found");
            router.push("/unauthorized");
          }
        } else {
          console.error("[Auth] No Telegram WebApp context found");
          setError("Telegram WebApp not available");

          // In development, you might want to allow this
          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Auth] Development mode - proceeding without Telegram context"
            );
            // You could still try to authenticate here with dummy data
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
      // We have a session, update global checker details
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
