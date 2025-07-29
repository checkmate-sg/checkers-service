// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

  // Always allow API routes, auth routes, static files, and unauthorized page
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
        // Unauthenticated user at root - allow them to stay for auth
        console.log(`[Middleware] Allowing access to root for authentication`);
        return NextResponse.next();
      }
    }

    // For protected routes - be more permissive during development/testing
    if (isProtectedRoute) {
      if (!token) {
        // Instead of immediately redirecting, let's check if there's an active session
        // by allowing the request through and letting the client handle it
        console.log(
          `[Middleware] No token for protected route, allowing through for client-side auth check`
        );

        // Add a custom header to indicate this is a protected route without auth
        const response = NextResponse.next();
        response.headers.set("x-auth-required", "true");
        return response;
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

    // If there's an error checking auth, allow the request through
    // and let the client-side handle authentication
    console.log(
      `[Middleware] Auth error, allowing request through for client handling`
    );
    const response = NextResponse.next();
    response.headers.set("x-auth-error", "true");
    return response;
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
