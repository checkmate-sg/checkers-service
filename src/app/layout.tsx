import "./globals.css";
import BottomNavigation from "../components/BottomNavigation";
import { ReactNode } from "react";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head />
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
          onLoad={() => console.log("[RootLayout] Telegram WebApp SDK loaded")}
          onError={() =>
            console.error("[RootLayout] Failed to load Telegram SDK")
          }
        />
        <div className="min-h-screen bg-checkmate-secondary flex flex-col">
          <SessionProvider>{children}</SessionProvider>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
