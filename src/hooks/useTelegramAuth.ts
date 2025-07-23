"use client";

import { useEffect, useState } from "react";
import { useSession, getCsrfToken, signIn } from "next-auth/react";
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

            // Use NextAuth's signIn method instead of direct fetch
            const result = await signIn("telegram", {
              initData: initData,
              redirect: false, // Don't redirect automatically
            });

            console.log("[Auth] SignIn result:", result);

            if (result?.error) {
              console.error("[Auth] Authentication failed:", result.error);

              if (result.error === "CredentialsSignin") {
                setError(
                  "Invalid credentials - user not found or unauthorized"
                );
              } else {
                setError(`Authentication failed: ${result.error}`);
              }

              router.push("/unauthorized");
              return;
            }

            if (result?.ok) {
              console.log("[Auth] Authentication successful");
              // Session will be updated automatically by NextAuth
              router.push("/dashboard");
            } else {
              console.error("[Auth] Unexpected authentication result:", result);
              setError("Unexpected authentication result");
              router.push("/unauthorized");
            }
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
              "[Auth] Development mode - you can add dummy data handling here"
            );
            // In development, you might want to create dummy initData:
            // const dummyInitData = "user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%7D&hash=dummy_hash_for_dev";
            // Then call signIn with this dummy data
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
