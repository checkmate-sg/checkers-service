export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

console.log("[In Path]");

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
