// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession, getCsrfToken } from "next-auth/react";
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
        // if (process.env.NODE_ENV === "development") {
        //   console.log("[Auth] Development mode - signing out first");
        //   await signOut({ redirect: false });
        // }

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

          // Dev fallback
          //   if (!initData && process.env.NODE_ENV === "development") {
          //     console.log("[Auth] No initData in dev mode, using dummy data");
          //     const dummyData = {
          //       user: JSON.stringify({
          //         id: 123456789,
          //         first_name: "Test",
          //         last_name: "User",
          //         username: "testuser",
          //       }),
          //       chat_instance: "test_instance",
          //       chat_type: "private",
          //       auth_date: Math.floor(Date.now() / 1000).toString(),
          //     };

          //     const params = new URLSearchParams(dummyData);
          //     params.set("hash", "dummy_hash_for_dev");
          //     initData = params.toString();
          //   }

          if (initData) {
            console.log("[Auth] Found initData, attempting authentication...");

            // Wait a bit more for NextAuth to be ready
            await new Promise((resolve) => setTimeout(resolve, 500));

            const result = await signIn("telegram", {
              redirect: false,
              initData: initData,
              callbackUrl: "/dashboard",
              csrfToken: csrfToken, // Explicitly pass CSRF token
            });

            console.log("[Auth] SignIn result:", result);

            if (result?.error) {
              console.error("[Auth] NextAuth sign-in failed:", result.error);

              if (result.error === "MissingCSRF" || result.error === "CSRF") {
                console.log(
                  "[Auth] CSRF error, getting fresh token and retrying..."
                );

                // Get a fresh CSRF token and try once more
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const freshCsrfToken = await getCsrfToken();

                if (freshCsrfToken) {
                  const retryResult = await signIn("telegram", {
                    redirect: false,
                    initData: initData,
                    callbackUrl: "/dashboard",
                    csrfToken: freshCsrfToken,
                  });

                  if (retryResult?.error) {
                    console.error(
                      "[Auth] Retry also failed:",
                      retryResult.error
                    );
                    setError(
                      `Authentication failed after retry: ${retryResult.error}`
                    );
                    router.push("/unauthorized");
                    return;
                  }
                } else {
                  setError("Could not get fresh CSRF token");
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

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Auth] Development mode - proceeding without Telegram context"
            );
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
