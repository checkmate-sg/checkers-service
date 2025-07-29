// src/auth.config.ts - Updated for NextAuth v5
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
        } catch (err) {
          console.error(
            "[Auth Config] Telegram initData verification failed:",
            err
          );
          return null;
        }

        const telegramId = telegramUser.id.toString();

        try {
          const user = await findUserByTelegramID(telegramId);

          if (!user) {
            console.warn(
              "[Auth Config] No user found with telegramId:",
              telegramId
            );
            return null;
          }

          console.log("[Auth Config] Authorization successful");
          return {
            id: user.id,
            telegramId,
            name: user.name || telegramUser.first_name || "Unknown",
            email: `${telegramId}@telegram.user`, // Required by NextAuth v5
          };
        } catch (dbError) {
          console.error("[Auth Config] Database error:", dbError);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
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
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.telegramId = token.telegramId as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after successful authentication
      console.log(
        "[Auth Config] Redirect callback - url:",
        url,
        "baseUrl:",
        baseUrl
      );

      // If the URL contains hash fragments (Telegram WebApp data), clean it
      if (url.includes("#")) {
        const cleanUrl = url.split("#")[0];
        console.log("[Auth Config] Cleaned URL:", cleanUrl);
        return cleanUrl;
      }

      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // If it's the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default to base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: "/unauthorized",
    error: "/unauthorized",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
};
