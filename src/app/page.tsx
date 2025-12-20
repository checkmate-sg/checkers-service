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
    // Only redirect once when we have a session and haven't redirected yet
    if (!isLoading && !error && session && !hasRedirected.current) {
      console.log("[HomePage] Redirecting to dashboard");
      hasRedirected.current = true;

      // Try multiple redirect methods to ensure it works
      const redirect = () => {
        console.log("[HomePage] Redirecting using window.location.replace");
        window.location.replace("/dashboard");
      };

      // Small delay to ensure everything is ready
      setTimeout(redirect, 100);
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
          <p className="text-sm text-gray-500 mt-2">Session: {session.user?.name || "Unknown"}</p>
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
