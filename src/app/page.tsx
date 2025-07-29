"use client";

import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { isLoading, error, session } = useTelegramAuth();

  // Debug logging
  console.log(
    "[HomePage] Render - isLoading:",
    isLoading,
    "error:",
    error,
    "session:",
    !!session
  );

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

  // If we have a session, middleware will handle the redirect
  // Just show a loading state briefly
  if (session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Welcome, {session.user?.name || "Unknown"}!</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // No session and not loading - show generic message
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome</h1>
        <p className="text-gray-600 mb-4">
          Please open this app through Telegram to continue.
        </p>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export const runtime = "nodejs";
