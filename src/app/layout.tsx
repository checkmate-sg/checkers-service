import "./globals.css";
import BottomNavigation from "../components/BottomNavigation";
import { ReactNode } from "react";
import Script from "next/script";
import { UserProvider } from "@/contexts/UserContext";
import { Providers } from "./providers";

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

        <div className="min-h-screen bg-checkmate-secondary flex flex-col">
          <Providers>
            <UserProvider>{children}</UserProvider>
          </Providers>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
