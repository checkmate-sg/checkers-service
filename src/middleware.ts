// src/middleware.ts - Updated for NextAuth v5
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth"; // Import from the new auth.ts file

export default auth((req) => {
  const { pathname } = req.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);
  console.log(`[Middleware] Has auth: ${!!req.auth}`);

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = !!req.auth;

  // Define protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/leaderboard", "/my-votes", "/vote"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  console.log(`[Middleware] Is protected route: ${isProtectedRoute}`);
  console.log(`[Middleware] Is authenticated: ${isAuthenticated}`);

  // If accessing a protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    console.log(`[Middleware] Redirecting to home - not authenticated`);
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If accessing root with authentication, redirect to dashboard
  if (pathname === "/" && isAuthenticated) {
    console.log(`[Middleware] Redirecting to dashboard - user authenticated`);
    const dashboardUrl = new URL("/dashboard", req.url);
    const response = NextResponse.redirect(dashboardUrl);

    // Add headers to prevent caching of this redirect
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  }

  // Allow access to unauthorized page regardless of auth status
  if (pathname === "/unauthorized") {
    console.log(`[Middleware] Allowing access to unauthorized page`);
    return NextResponse.next();
  }

  console.log(`[Middleware] Allowing request to proceed`);
  return NextResponse.next();
});

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
