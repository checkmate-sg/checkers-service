
import { Outlet } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";

const Layout = () => {
  return (
    <div className="min-h-screen bg-checkmate-secondary flex flex-col">
      {/* Main content area */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      
      {/* Bottom navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Layout;
