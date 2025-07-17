import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log("Token in middleware:", token); // <-- Log token

  const protectedRoutes = ["/leaderboard", "/my-votes", "/vote"];
  const pathname = req.nextUrl.pathname;

  const isProtected =
    protectedRoutes.some((path) => pathname.startsWith(path)) ||
    /^\/vote\/[^/]+$/.test(pathname); // match /vote/[voteId]

  const isTelegram = req.headers.get("user-agent")?.includes("Telegram");

  if (isProtected && (!token || !token.telegramId)) {
    // ✅ Allow Telegram clients to reach frontend for login on first load
    if (isTelegram) {
      return NextResponse.next(); // Let the page load and signIn() happen
    }

    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/leaderboard", "/my-votes", "/vote/:path*"],
};
