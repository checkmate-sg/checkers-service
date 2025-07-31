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
    // Make a request to your session API to get the current session
    // This will go through NextAuth's session callback which validates against DB
    const sessionResponse = await fetch(
      new URL("/api/auth/session", request.url),
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    const session = await sessionResponse.json();

    console.log(`[Middleware] Session check result:`, !!session?.user);

    // If no valid session (NextAuth returns empty object if invalid), redirect
    if (!session?.user) {
      console.log(`[Middleware] No valid session, redirecting to unauthorized`);

      // Clear cookies and redirect
      const response = NextResponse.redirect(
        new URL("/unauthorized", request.url)
      );
      response.cookies.delete("__Secure-next-auth.session-token");
      response.cookies.delete("next-auth.session-token");

      return response;
    }

    // Valid session exists, allow access
    console.log(`[Middleware] Valid session found, allowing access`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking session:`, error);
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
