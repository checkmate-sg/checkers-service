"use client";

import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isLoading, error, session } = useTelegramAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once when we have a session and haven't redirected yet
    if (!isLoading && !error && session && !hasRedirected.current) {
      console.log("[HomePage] Redirecting to dashboard");
      hasRedirected.current = true;
      router.replace("/dashboard");
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
        </div>
      </div>
    );
  }

  return null;
}
