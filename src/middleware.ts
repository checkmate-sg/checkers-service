// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

async function getTokenWithFallback(request: NextRequest) {
  let token = null;

  try {
    // First try the default cookie
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // Fallback to secure cookie for production/HTTPS
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "__Secure-next-auth.session-token",
      });
    }

    // Additional fallback for development
    if (!token) {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "next-auth.session-token",
      });
    }
  } catch (error) {
    console.error("[Middleware] Error getting token:", error);
  }

  return token;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

  // Always allow API routes, auth routes, static files, and public pages
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/auth/") || // Allow auth pages
    pathname === "/" // TEMPORARILY: Always allow root for debugging
  ) {
    return NextResponse.next();
  }

  try {
    // Get the session token with fallback options
    const token = await getTokenWithFallback(request);

    console.log(`[Middleware] Token exists: ${!!token}`);
    if (token) {
      console.log(`[Middleware] Token details:`, {
        id: token.id,
        telegramId: token.telegramId,
        name: token.name,
      });
    }

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
        // Unauthenticated user at root - ALWAYS allow them to stay for auth
        // Don't redirect them away as this breaks the Telegram auth flow
        console.log(`[Middleware] Allowing access to root for authentication`);
        return NextResponse.next();
      }
    }

    // For protected routes - ACTUALLY BLOCK unauthorized access
    if (isProtectedRoute) {
      if (!token) {
        console.log(
          `[Middleware] No token for protected route, redirecting to auth`
        );

        // Redirect to your auth page or root with a return URL
        const url = new URL("/", request.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
      } else {
        console.log(
          `[Middleware] Valid token found, allowing access to protected route`
        );
      }
    }

    console.log(`[Middleware] Allowing request to proceed`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking authentication:`, error);

    // If there's an error and it's a protected route, redirect to auth
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
      console.log(
        `[Middleware] Auth error on protected route, redirecting to auth`
      );
      const url = new URL("/", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // For non-protected routes, allow through
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
