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
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
          onLoad={() => {
            console.log("Telegram Web App script loaded successfully");
            console.log("Telegram object:", window.Telegram);
          }}
          onError={(error) => {
            console.error("Failed to load Telegram Web App script:", error);
          }}
        />

        <div className="min-h-screen bg-checkmate-secondary flex flex-col">
          <SessionProvider>{children}</SessionProvider>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
