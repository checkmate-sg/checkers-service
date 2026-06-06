// src/auth.config.ts - Updated cookie configuration
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyTelegramInitData } from "@/lib/verifyInitData";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        initData: { label: "initData", type: "text" },
      },
      async authorize(credentials) {
        console.log("[Auth Config] Starting authorization process");

        // LOCAL DEVELOPMENT BYPASS
        // Skips Telegram initData verification and instead signs in as a real
        // checker from the (shared) dev DB, matched by LOCAL_DEV_TELEGRAM_ID.
        // We deliberately require a real checker — a synthetic fallback id is
        // not a valid Mongo ObjectId, so it would 500 every checker API call
        // the moment the strict DB-service ObjectId boundary tries to convert it.
        if (process.env.ENVIRONMENT === "local") {
          console.log("[Auth Config] LOCAL ENVIRONMENT - Using development bypass");

          const mockTelegramId = process.env.LOCAL_DEV_TELEGRAM_ID;
          if (!mockTelegramId) {
            console.error(
              "[Auth Config] LOCAL: LOCAL_DEV_TELEGRAM_ID is not set. " +
                "Set it (in .env.development.local) to the telegramId of an existing checker " +
                "in the dev DB so local dev can sign you in."
            );
            return null;
          }

          let checker;
          try {
            const { env } = getCloudflareContext();
            checker = (
              await env.CHECKERS_DB_SERVICE.findOneChecker({
                telegramId: mockTelegramId,
              })
            ).data;
          } catch (error) {
            console.error("[Auth Config] LOCAL: Error looking up dev checker:", error);
            return null;
          }

          if (!checker?._id) {
            console.error(
              `[Auth Config] LOCAL: No checker found for LOCAL_DEV_TELEGRAM_ID="${mockTelegramId}". ` +
                `Local dev signs in as a real checker from the dev DB, so one must exist. ` +
                `Fix: set LOCAL_DEV_TELEGRAM_ID (in .env.development.local) to the telegramId of an ` +
                `existing checker in the dev DB, or onboard one via the Telegram bot. ` +
                `(The previous "local-dev-user" fallback was removed because its id is not a valid ` +
                `Mongo ObjectId and 500s every checker API call.)`
            );
            return null;
          }

          console.log("[Auth Config] LOCAL: Signed in as dev checker:", {
            id: checker._id.toString(),
            name: checker.name || "Local Dev User",
            telegramId: mockTelegramId,
          });

          return {
            id: checker._id.toString(),
            telegramId: mockTelegramId,
            name: checker.name || "Local Dev User",
          };
        }

        const initData = credentials?.initData;
        const botToken = process.env.TELEGRAM_BOT_TOKEN!;

        console.log("[Auth Config] Environment check:", {
          hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          hasMongoUri: !!process.env.MONGODB_CONNECTION_STRING,
        });

        console.log("[Auth Config] Received initData:", initData ? "present" : "missing");
        console.log("[Auth Config] Bot token:", botToken ? "present" : "missing");

        if (!initData || typeof initData !== "string") {
          console.error("[Auth Config] No initData received or invalid format");
          return null;
        }

        if (!botToken) {
          console.error("[Auth Config] Missing TELEGRAM_BOT_TOKEN");
          return null;
        }

        let telegramUser;
        try {
          console.log("[Auth Config] Attempting to verify Telegram initData");
          telegramUser = verifyTelegramInitData(initData, botToken);
          console.log("[Auth Config] Telegram verification successful");
          console.log("[Auth Config] Parsed Telegram user:", {
            id: telegramUser.id,
            first_name: telegramUser.first_name,
            username: telegramUser.username,
          });
        } catch (err) {
          console.error("[Auth Config] Telegram initData verification failed:", err);
          console.error(
            "[Auth Config] Error details:",
            err instanceof Error ? err.message : "Unknown error"
          );
          return null;
        }

        const telegramId = telegramUser.id.toString();
        console.log("[Auth Config] Looking up user with telegramId:", telegramId);

        try {
          const { env } = getCloudflareContext();
          const user = (
            await env.CHECKERS_DB_SERVICE.findOneChecker({
              telegramId: telegramId,
            })
          ).data;

          console.log(
            "[Auth Config] Database lookup result:",
            user ? "user found" : "user not found"
          );

          if (user) {
            console.log("[Auth Config] Found user:", {
              id: user._id?.toString() || "",
              name: user.name,
              telegramId: user.telegramId || telegramId,
            });
          }

          if (!user) {
            console.warn("[Auth Config] No user found with telegramId:", telegramId);
            return null;
          }

          if (!user.isOnboardingComplete) {
            console.warn("[Auth Config] User has not completed onboarding:", telegramId);
            return null;
          }

          console.log("[Auth Config] Authorization successful, returning user data");
          return {
            id: user._id?.toString() || "",
            telegramId,
            name: user.name || telegramUser.first_name || "Unknown",
          };
        } catch (dbError) {
          console.error("[Auth Config] Database error during user lookup:", dbError);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.telegramId = (user as any).telegramId;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          telegramId: token.telegramId as string,
          name: token.name as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/unauthorized",
    error: "/unauthorized",
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true, // Always true for Telegram WebApp (even in dev)
        // Don't set domain - let the browser handle it
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true, // Always true for Telegram WebApp
      },
    },
    pkceCodeVerifier: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.pkce.code_verifier"
          : "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true, // Always true for Telegram WebApp
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
