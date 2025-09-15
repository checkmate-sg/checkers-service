import "./globals.css";
import BottomNavigation from "../components/BottomNavigation";
import { ReactNode } from "react";
import Script from "next/script";
import { UserProvider } from "@/contexts/UserContext";
import { Providers } from "./providers";
import TopHeaderShell from "@/components/top-header/TopHeaderShell";

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
        />
      <Providers>
        <UserProvider>
          <div className="min-h-screen flex flex-col">
            {/* Add Nav bar at the top*/}
            <div>
              <TopHeaderShell />
            </div>

            {/* Main content area with bottom padding to prevent overlap */}
            <main className="flex-1 pb-20 overflow-y-auto">
              {children}
            </main>

            {/* Fixed bottom navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
              <BottomNavigation />
            </div>
          </div>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}
