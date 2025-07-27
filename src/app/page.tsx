"use client";

import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isLoading, error, session } = useTelegramAuth();
  const router = useRouter();

  // Separate useEffect for navigation to prevent interference
  useEffect(() => {
    if (session && !isLoading && !error) {
      console.log("[HomePage] Redirecting to dashboard");
      router.replace("/dashboard");
    }
  }, [session, isLoading, error, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2
            className="animate-spin mx-auto mb-4 text-orange-500"
            size={32}
          />
          <p className="text-gray-600">Authenticating with Telegram...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Failed
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // This should rarely be shown since we redirect when session exists
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
