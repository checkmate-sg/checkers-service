// src/middleware.ts
export const runtime = "nodejs";

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const pathname = req.nextUrl.pathname;

  console.log("Middleware - pathname:", pathname);
  console.log("Middleware - session:", session ? "present" : "null");
  console.log("Middleware - user:", session?.user ? "present" : "null");
  console.log("Middleware - telegramId:", session?.user?.telegramId || "null");

  // Allow API routes and auth routes to pass through
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/unauthorized")
  ) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedRoutes = ["/leaderboard", "/my-votes", "/vote", "/dashboard"];
  const isProtected =
    protectedRoutes.some((path) => pathname.startsWith(path)) ||
    /^\/vote\/[^/]+$/.test(pathname); // match /vote/[voteId]

  // Check if request is from Telegram
  const isTelegram = req.headers.get("user-agent")?.includes("Telegram");

  if (isProtected) {
    // If no session or no telegramId, user is not authenticated
    if (!session?.user?.telegramId) {
      console.log("Middleware - blocking access to protected route");

      // Allow Telegram clients to reach frontend for login on first load
      if (isTelegram && (pathname === "/" || pathname === "/dashboard")) {
        console.log(
          "Middleware - allowing Telegram client to access login page"
        );
        return NextResponse.next();
      }

      // Redirect to unauthorized page
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  // If user is authenticated and tries to access unauthorized page, redirect to dashboard
  if (session?.user?.telegramId && pathname === "/unauthorized") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/leaderboard",
    "/my-votes",
    "/vote/:path*",
    "/dashboard",
    "/unauthorized",
    "/",
  ],
};
