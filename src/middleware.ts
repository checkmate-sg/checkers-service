// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking path: ${pathname}`);

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/leaderboard",
    "/my-votes",
    "/vote",
    "/votepage",
  ];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  console.log(`[Middleware] Protected route detected: ${pathname}`);

  try {
    // Get the session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "__Secure-next-auth.session-token",
    });

    console.log(`[Middleware] Token exists: ${!!token}`);

    // If no token, redirect to unauthorized
    if (!token) {
      console.log(`[Middleware] No token, redirecting to unauthorized`);
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Token exists, allow access
    console.log(`[Middleware] Token found, allowing access`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking authentication:`, error);
    return NextResponse.redirect(new URL("/unauthorized", request.url));
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
