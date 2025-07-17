import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  const protectedRoutes = ["/dashboard", "/leaderboard", "/my-votes", "/vote"];
  const pathname = req.nextUrl.pathname;

  const isProtected =
    protectedRoutes.some((path) => pathname.startsWith(path)) ||
    /^\/vote\/[^/]+$/.test(pathname); // match /vote/[voteId]

  if (isProtected && (!token || !token.telegramId)) {
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// This must be in the same file
export const config = {
  matcher: ["/dashboard", "/leaderboard", "/my-votes", "/vote/:path*"],
};
