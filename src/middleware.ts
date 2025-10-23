import { getToken } from 'next-auth/jwt';
// src/middleware.ts
import { NextResponse } from 'next/server';

import type { NextRequest } from "next/server";
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
   
    // Determine which cookie name to use based on environment
    const isPublicDomain = process.env.NEXTAUTH_URL?.includes("https://") || false;
    const useSecureCookie = isPublicDomain;

    const cookieName = useSecureCookie ? 
      "__Secure-next-auth.session-token" : 
      "next-auth.session-token";

    console.log(`[Middleware] Looking for cookie:`, cookieName);
    console.log(`[Middleware] Is public domain:`, isPublicDomain);

    // Use getToken to check authentication - no HTTP request needed 
    const token = await getToken({
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: cookieName,
      secureCookie: useSecureCookie,
    })

    console.log(`[Middleware] Token check result: `, !!token);
    if (token) {
      console.log(`[Middleware] Token Details: `, {
        telegramId: token.telegramId, 
        name: token.name
      })
    }

    // If no valid token, redirect 
    if (!token) {
      console.log(`[Middleware] No valid token, redirecting to unauthorized`);

      const response = NextResponse.redirect(
        new URL("/unauthorized", request.url)
      )

      // Clean up invalid cookies 
      response.cookies.delete("__Secure-next-auth.session-token");
      response.cookies.delete("next-auth.session-token");

      return response
    }

    // Valid token exists, allow access
    console.log(`[Middleware] Valid token found for user: `, token.telegramId);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error checking token:`, error);
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

