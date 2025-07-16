import NextAuth, { NextAuthConfig } from "next-auth";
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

        if (!initData || typeof initData !== "string") return null;

        let telegramUser;
        try {
          telegramUser = verifyTelegramInitData(initData, botToken);
        } catch (err) {
          console.error("Telegram initData verification failed", err);
          return null;
        }

        const telegramId = telegramUser.id.toString();
        const user = await findUserByTelegramID(telegramId);

        if (!user) return null;

        return {
          id: user.id,
          telegramId,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // <-- must be literal 'jwt'
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
};

const handler = NextAuth(authConfig);

// ✅ Re-export the handler directly — NextAuth returns a Response
export { handler as GET, handler as POST };
