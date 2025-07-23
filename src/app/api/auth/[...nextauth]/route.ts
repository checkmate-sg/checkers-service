export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
