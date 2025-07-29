// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

  // Always allow API routes, auth routes, and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/unauthorized"
  ) {
    return NextResponse.next();
  }

  try {
    // Get the session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log(`[Middleware] Token exists: ${!!token}`);

    // Define protected routes that require authentication
    const protectedRoutes = [
      "/dashboard",
      "/leaderboard",
      "/my-votes",
      "/vote",
    ];
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    console.log(`[Middleware] Is protected route: ${isProtectedRoute}`);

    // If accessing root path
    if (pathname === "/") {
      if (token) {
        // Authenticated user accessing root - redirect to dashboard
        console.log(
          `[Middleware] Redirecting to dashboard - user authenticated`
        );
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        // Unauthenticated user at root - allow them to stay for auth
        console.log(`[Middleware] Allowing access to root for authentication`);
        return NextResponse.next();
      }
    }

    // For protected routes
    if (isProtectedRoute) {
      if (!token) {
        // Check if this is a Telegram WebApp context
        const userAgent = request.headers.get("user-agent") || "";
        const referer = request.headers.get("referer") || "";

        // If this looks like a Telegram WebApp request, allow it through
        // so the auth hook can handle the authentication
        if (userAgent.includes("TelegramBot") || referer.includes("t.me")) {
          console.log(`[Middleware] Allowing Telegram WebApp access for auth`);
          return NextResponse.next();
        }

        console.log(`[Middleware] Redirecting to home - no valid session`);
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    console.log(`[Middleware] Allowing request to proceed`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking authentication:`, error);

    // If there's an error, be more permissive to allow auth flow
    const protectedRoutes = [
      "/dashboard",
      "/leaderboard",
      "/my-votes",
      "/vote",
    ];
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedRoute) {
      // Check if this might be a Telegram WebApp - if so, allow through
      const userAgent = request.headers.get("user-agent") || "";
      const referer = request.headers.get("referer") || "";

      if (userAgent.includes("TelegramBot") || referer.includes("t.me")) {
        console.log(
          `[Middleware] Auth error but allowing Telegram WebApp access`
        );
        return NextResponse.next();
      }

      console.log(
        `[Middleware] Error occurred, redirecting protected route to home`
      );
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
