// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

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

    // If accessing a protected route without a valid session
    if (isProtectedRoute && !token) {
      console.log(`[Middleware] Redirecting to home - no valid session`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // If accessing root with a valid session, redirect to dashboard
    if (pathname === "/" && token) {
      console.log(`[Middleware] Redirecting to dashboard - user authenticated`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Allow access to unauthorized page regardless of auth status
    if (pathname === "/unauthorized") {
      console.log(`[Middleware] Allowing access to unauthorized page`);
      return NextResponse.next();
    }

    console.log(`[Middleware] Allowing request to proceed`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking authentication:`, error);

    // If there's an error checking auth and it's a protected route, redirect to home
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
