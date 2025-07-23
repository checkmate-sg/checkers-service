// src/auth.ts
import NextAuth from "next-auth";
import { authConfig } from "./lib/authConfig";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
