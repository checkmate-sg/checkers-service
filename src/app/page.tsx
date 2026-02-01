"use client";

import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

function HomePageContent() {
  const { isLoading, error, session } = useTelegramAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Debug logging
  console.log(
    "[HomePage] Render - isLoading:",
    isLoading,
    "error:",
    error,
    "session:",
    !!session,
    "hasRedirected:",
    hasRedirected.current,
    "callbackUrl:",
    callbackUrl
  );

  useEffect(() => {
    // Only redirect once when we have a session and haven't redirected yet
    if (!isLoading && !error && session && !hasRedirected.current) {
      console.log("[HomePage] Redirecting to", callbackUrl);
      hasRedirected.current = true;

      // Small delay to ensure everything is ready
      setTimeout(() => {
        console.log("[HomePage] Redirecting using window.location.replace");
        window.location.replace(callbackUrl);
      }, 100);
    }
  }, [isLoading, error, session, router, callbackUrl]);

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
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Redirecting...</p>
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
          <p>Redirecting...</p>
          <p className="text-sm text-gray-500 mt-2">Session: {session.user?.name || "Unknown"}</p>
          <button
            onClick={() => {
              console.log("[HomePage] Manual redirect clicked");
              window.location.href = callbackUrl;
            }}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Continue Manually
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
