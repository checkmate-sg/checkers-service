// src/hooks/useTelegramAuth.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, signOut, useSession, getCsrfToken } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setCheckerDetails } = useUser();

  // Use ref to track if authentication has been attempted
  const authAttempted = useRef(false);
  const userDetailsSet = useRef(false);

  useEffect(() => {
    const authenticateWithTelegram = async () => {
      // Prevent multiple authentication attempts
      if (authAttempted.current) {
        console.log("[Auth] Authentication already attempted, skipping");
        return;
      }

      authAttempted.current = true;

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
          console.log(
            "[Auth] Real initData from Telegram:",
            initData ? "present" : "missing"
          );

          // Log the real Telegram data for debugging
          if (initData) {
            console.log("[Auth] Real Telegram initData received:");
            console.log(
              "[Auth] InitData preview:",
              initData.substring(0, 100) + "..."
            );

            // Parse and log the real user data from Telegram
            try {
              const params = new URLSearchParams(initData);
              const userParam = params.get("user");
              if (userParam) {
                const telegramUser = JSON.parse(userParam);
                console.log("[Auth] Real Telegram user ID:", telegramUser.id);
                console.log("[Auth] Real Telegram user data:", telegramUser);
                console.log(
                  "[Auth] Telegram user ID type:",
                  typeof telegramUser.id
                );
              } else {
                console.warn("[Auth] No 'user' parameter found in initData");
              }

              // Log other parameters for debugging
              console.log("[Auth] Auth date:", params.get("auth_date"));
              console.log(
                "[Auth] Hash:",
                params.get("hash") ? "present" : "missing"
              );
            } catch (parseError) {
              console.error("[Auth] Error parsing initData:", parseError);
            }
          } else {
            console.log(
              "[Auth] No initData found - user needs to access via Telegram WebApp"
            );
          }

          if (initData) {
            console.log(
              "[Auth] Found initData, attempting authentication...",
              initData
            );
            console.log("[Auth] InitData length:", initData.length);

            // Wait a bit more for NextAuth to be ready
            await new Promise((resolve) => setTimeout(resolve, 500));

            console.log("[Auth] Commencing sign in");

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
                console.log("[Auth] Credentials sign-in failed");
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
      !!session,
      "authAttempted:",
      authAttempted.current,
      "userDetailsSet:",
      userDetailsSet.current
    );

    // Wait for NextAuth to load
    if (status === "loading") {
      console.log("[Auth] NextAuth still loading...");
      return;
    }

    // If we have a session and haven't set user details yet
    if (session && !userDetailsSet.current) {
      console.log("[Auth] Session found, updating global state");
      console.log("[Auth] Session user:", session.user);

      setCheckerDetails((currentChecker) => ({
        ...currentChecker,
        checkerId: session.user.id,
        checkerName: session.user.name || "Unknown",
        telegramId: session.user.telegramId,
      }));

      userDetailsSet.current = true;
      setIsLoading(false);
      return;
    }

    // If we don't have a session and haven't attempted auth yet
    if (!session && !authAttempted.current) {
      console.log("[Auth] No session found, attempting authentication");
      authenticateWithTelegram();
      return;
    }

    // If we have session but already set details, just ensure loading is false
    if (session && userDetailsSet.current) {
      setIsLoading(false);
      return;
    }

    // If no session and auth was attempted, loading should be false
    if (!session && authAttempted.current) {
      setIsLoading(false);
      return;
    }
  }, [session, status, router, setCheckerDetails]);

  // Reset refs when session changes from truthy to falsy (logout)
  useEffect(() => {
    if (!session && userDetailsSet.current) {
      console.log("[Auth] Session lost, resetting auth state");
      authAttempted.current = false;
      userDetailsSet.current = false;
    }
  }, [session]);

  return { isLoading, error, session };
}
