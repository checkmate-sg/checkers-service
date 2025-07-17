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
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <div className="min-h-screen bg-checkmate-secondary flex flex-col">
          {/* Main content area */}
          <SessionProvider>{children}</SessionProvider>
          {/* Bottom navigation */}
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
