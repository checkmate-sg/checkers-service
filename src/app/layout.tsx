import "./globals.css";
import BottomNavigation from "../components/BottomNavigation";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-checkmate-secondary flex flex-col">
          {/* Main content area */}
          <main className="flex-1 pb-20">{children}</main>
          {/* Bottom navigation */}
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
