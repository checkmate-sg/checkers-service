import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyTelegramInitData } from "@/lib/verifyInitData";
import { findUserByTelegramID } from "@/lib/db";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Telegram",
      credentials: {
        initData: { label: "initData", type: "text" },
      },
      async authorize(credentials) {
        const initData = credentials?.initData;
        const botToken = process.env.TELEGRAM_BOT_TOKEN!;

        console.log("[Auth] Received initData:", initData);

        if (!initData || typeof initData !== "string") {
          console.error("[Auth] No initData received or invalid format");
          return null;
        }

        let telegramUser;
        try {
          telegramUser = verifyTelegramInitData(initData, botToken);
          console.log("[Auth] Parsed Telegram user:", telegramUser);
        } catch (err) {
          console.error("[Auth] Telegram initData verification failed:", err);
          return null;
        }

        const telegramId = telegramUser.id.toString();
        console.log("[Auth] Looking up user with telegramId:", telegramId);

        const user = await findUserByTelegramID(telegramId);
        console.log("[Auth] User from DB:", user);

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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          telegramId: token.telegramId as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/unauthorized",
  },
  debug: process.env.NODE_ENV === "development",
};
