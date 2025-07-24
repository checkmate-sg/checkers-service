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
        const initData = credentials?.initData;
        const botToken = process.env.TELEGRAM_BOT_TOKEN!;

        console.log(
          "[Auth] Received initData:",
          initData ? "present" : "missing"
        );

        if (!initData || typeof initData !== "string") {
          console.error("[Auth] No initData received or invalid format");
          return null;
        }

        let telegramUser;
        try {
          // Production verification only
          telegramUser = verifyTelegramInitData(initData, botToken);

          console.log("[Auth] Parsed Telegram user:", {
            id: telegramUser.id,
            first_name: telegramUser.first_name,
          });
        } catch (err) {
          console.error("[Auth] Telegram initData verification failed:", err);
          return null;
        }

        const telegramId = telegramUser.id.toString();
        console.log("[Auth] Looking up user with telegramId:", telegramId);

        const user = await findUserByTelegramID(telegramId);
        console.log("[Auth] User from DB:", user ? "found" : "not found");

        if (!user) {
          console.warn("[Auth] No user found with telegramId:", telegramId);
          return null;
        }

        return {
          id: user.id,
          telegramId,
          name: user.name,
        };
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
