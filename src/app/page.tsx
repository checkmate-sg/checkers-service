"use client";

import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isLoading, error, session } = useTelegramAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Debug logging
  console.log(
    "[HomePage] Render - isLoading:",
    isLoading,
    "error:",
    error,
    "session:",
    !!session,
    "hasRedirected:",
    hasRedirected.current
  );

  useEffect(() => {
    if (!isLoading && !hasRedirected.current) {
      if (session) {
        console.log("[HomePage] Redirecting to dashboard");
        hasRedirected.current = true;
        setTimeout(() => {
          router.replace("/dashboard");
        }, 0); // slight delay ensures router hydration
      } else if (error) {
        console.log("[HomePage] Redirecting to unauthorized");
        hasRedirected.current = true;
        setTimeout(() => {
          router.replace("/unauthorized");
        }, 0);
      }
    }
  }, [isLoading, error, session, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Authenticating with Telegram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">Authentication failed: {error}</p>
          <button
            onClick={() => {
              // Reset the redirect flag and reload
              hasRedirected.current = false;
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading while waiting for redirect
  if (session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Redirecting to dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">
            Session: {session.user?.name || "Unknown"}
          </p>
          <button
            onClick={() => {
              console.log("[HomePage] Manual redirect clicked");
              window.location.href = "/dashboard";
            }}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Dashboard Manually
          </button>
        </div>
      </div>
    );
  }

  return null;
}
