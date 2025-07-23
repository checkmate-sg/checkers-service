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

          // Dev fallback - uncomment for development testing
          if (!initData && process.env.NODE_ENV === "development") {
            console.log("[Auth] No initData in dev mode, using dummy data");
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
            params.set("hash", "dummy_hash_for_dev");
            initData = params.toString();
          }

          if (initData) {
            console.log("[Auth] Found initData, attempting authentication...");
            console.log("[Auth] InitData length:", initData.length);

            // Wait a bit more for NextAuth to be ready
            await new Promise((resolve) => setTimeout(resolve, 500));

            const result = await signIn("telegram", {
              redirect: false,
              initData: initData,
              callbackUrl: "/dashboard",
            });

            console.log("[Auth] SignIn result:", result);

            if (result?.error) {
              console.error("[Auth] NextAuth sign-in failed:", result.error);

              // Handle specific error types
              if (result.error === "CredentialsSignin") {
                console.log(
                  "[Auth] Credentials sign-in failed - possible issues:"
                );
                console.log("- User not found in database");
                console.log("- Telegram initData verification failed");
                console.log("- Bot token invalid or missing");
                setError(
                  "Authentication failed: Invalid credentials or user not found"
                );
              } else if (result.error === "Configuration") {
                console.log(
                  "[Auth] Configuration error - check NEXTAUTH_SECRET and other env vars"
                );
                setError("Authentication configuration error");
              } else if (result.error === "AccessDenied") {
                console.log("[Auth] Access denied - user not authorized");
                setError("Access denied - user not authorized");
              } else {
                setError(`Authentication failed: ${result.error}`);
              }

              router.push("/unauthorized");
              return;
            }

            if (result?.ok) {
              console.log("[Auth] NextAuth sign-in successful");
              // Session will be updated automatically, useEffect will handle the rest
            } else {
              console.warn("[Auth] Sign-in result unclear:", result);
              setError("Authentication result unclear");
              router.push("/unauthorized");
            }
          } else {
            console.error("[Auth] No initData found");
            setError("No Telegram data found");
            router.push("/unauthorized");
          }
        } else {
          console.error("[Auth] No Telegram WebApp context found");
          console.log(
            "[Auth] Available window properties:",
            Object.keys(window)
          );
          setError("Telegram WebApp not available");

          if (process.env.NODE_ENV === "development") {
            console.log(
              "[Auth] Development mode - you may need to test in Telegram WebApp context"
            );
            // Don't redirect in development, let developer handle it
          } else {
            router.push("/unauthorized");
          }
        }
      } catch (err) {
        console.error("[Auth] Authentication error:", err);
        console.error(
          "[Auth] Error stack:",
          err instanceof Error ? err.stack : "No stack trace"
        );
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
      console.log("[Auth] Session user:", session.user);
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
