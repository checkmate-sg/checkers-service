import BottomNavigation from "./BottomNavigation";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-checkmate-secondary flex flex-col">
      {/* Main content area */}
      <main className="flex-1 pb-20">{children}</main>
      {/* Bottom navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Layout;
