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
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    telegramId: string;
    name?: string;
  }
}

// For middleware - NextAuth v5 uses a different session structure in middleware
declare module "@auth/core" {
  interface Session {
    user?: {
      id?: string;
      telegramId?: string;
      name?: string;
    };
  }
}
