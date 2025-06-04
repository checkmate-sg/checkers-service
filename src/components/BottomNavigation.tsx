"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Trophy } from "lucide-react";

const BottomNavigation = () => {
  const pathname = usePathname();

  const navItems = [
    {
      path: "/dashboard",
      icon: Home,
      label: "Dashboard",
    },
    {
      path: "/my-votes",
      icon: BarChart3,
      label: "My Votes",
    },
    {
      path: "/leaderboard",
      icon: Trophy,
      label: "Leaderboard",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path === "/dashboard" && pathname === "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive
                  ? "bg-checkmate-primary text-white"
                  : "text-gray-600 hover:text-checkmate-primary"
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
