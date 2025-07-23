// src/middleware.ts - Temporary debug version
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    console.log("Middleware running for:", request.nextUrl.pathname);

    // Just let everything through for now
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

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
