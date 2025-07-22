// src/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      telegramId: string;
      name?: string;
    };
  }

  interface User {
    id: string;
    telegramId: string;
    name?: string;
  }

  interface JWT {
    id: string;
    telegramId: string;
  }
}
