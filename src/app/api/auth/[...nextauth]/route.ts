export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/authConfig";

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
