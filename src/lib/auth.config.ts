// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyTelegramInitData } from "@/lib/verifyInitData";
import { findUserByTelegramID } from "@/lib/db";

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

        const initData = credentials?.initData;
        const botToken = process.env.TELEGRAM_BOT_TOKEN!;

        console.log(
          "[Auth Config] Received initData:",
          initData ? "present" : "missing"
        );
        console.log(
          "[Auth Config] Bot token:",
          botToken ? "present" : "missing"
        );

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
          console.error(
            "[Auth Config] Telegram initData verification failed:",
            err
          );
          console.error(
            "[Auth Config] Error details:",
            err instanceof Error ? err.message : "Unknown error"
          );
          return null;
        }

        const telegramId = telegramUser.id.toString();
        console.log(
          "[Auth Config] Looking up user with telegramId:",
          telegramId
        );

        try {
          const user = await findUserByTelegramID(telegramId);
          console.log(
            "[Auth Config] Database lookup result:",
            user ? "user found" : "user not found"
          );

          if (user) {
            console.log("[Auth Config] Found user:", {
              id: user.id,
              name: user.name,
              telegramId: user.telegramId || telegramId,
            });
          }

          if (!user) {
            console.warn(
              "[Auth Config] No user found with telegramId:",
              telegramId
            );
            return null;
          }

          console.log(
            "[Auth Config] Authorization successful, returning user data"
          );
          return {
            id: user.id,
            telegramId,
            name: user.name || telegramUser.first_name || "Unknown",
          };
        } catch (dbError) {
          console.error(
            "[Auth Config] Database error during user lookup:",
            dbError
          );
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
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
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "none", // Required for Telegram WebApp iframe
        path: "/",
        secure: true, // Always true for Telegram WebApp
        domain: process.env.AUTH_COOKIE_DOMAIN,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "none", // Required for Telegram WebApp iframe
        path: "/",
        secure: true, // Always true for Telegram WebApp
        domain: process.env.AUTH_COOKIE_DOMAIN,
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
        domain: process.env.AUTH_COOKIE_DOMAIN,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
