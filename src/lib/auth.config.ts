// src/auth.config.ts - Updated cookie configuration
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

        // LOCAL DEVELOPMENT BYPASS
        if (process.env.ENVIRONMENT === "local") {
          console.log("[Auth Config] LOCAL ENVIRONMENT - Using development bypass");
          
          // You can customize this mock user or fetch a real test user from DB
          const mockTelegramId = process.env.LOCAL_DEV_TELEGRAM_ID || "123456789";
          
          try {
            // Try to find a real user for testing
            const user = await findUserByTelegramID(mockTelegramId);
            
            if (user) {
              console.log("[Auth Config] LOCAL: Found test user:", {
                id: user.id,
                name: user.name,
                telegramId: user.telegramId || mockTelegramId,
              });
              
              return {
                id: user.id,
                telegramId: mockTelegramId,
                name: user.name || "Local Dev User",
              };
            } else {
              // Return a mock user if no real user exists
              console.log("[Auth Config] LOCAL: Using mock user");
              return {
                id: "local-dev-user",
                telegramId: mockTelegramId,
                name: "Local Dev User",
              };
            }
          } catch (error) {
            console.error("[Auth Config] LOCAL: Error during bypass:", error);
            // Still return mock user even if DB is unavailable
            return {
              id: "local-dev-user",
              telegramId: mockTelegramId,
              name: "Local Dev User",
            };
          }
        }

        const initData = credentials?.initData;
        const botToken = process.env.TELEGRAM_BOT_TOKEN!;

        console.log("[Auth Config] Environment check:", {
          hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          hasMongoUri: !!process.env.MONGODB_URI,
        });

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
