import './globals.css';

import Script from 'next/script';
import { ReactNode } from 'react';

import { UseQueryProvider } from '@/components/common/UseQueryProvider';
import TopHeaderShell from '@/components/top-header/TopHeaderShell';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/contexts/UserContext';

import BottomNavigation from '../components/BottomNavigation';
import { SessionProviders } from './providers';

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
      <SessionProviders>
        <UserProvider>
          <UseQueryProvider>
            <div className="min-h-screen flex flex-col">
              {/* Add Nav bar at the top*/}
              <div>
                <TopHeaderShell />
              </div>

              {/* Main content area with bottom padding to prevent overlap */}
              <main className="flex-1 pb-20 overflow-y-auto">
                <TooltipProvider>
                  {children}
                </TooltipProvider>
                
              </main>

              {/* Fixed bottom navigation */}
              <div className="fixed bottom-0 left-0 right-0 z-50">
                <BottomNavigation />
              </div>
            </div>
          </UseQueryProvider>
          </UserProvider>
        </SessionProviders>
      </body>
    </html>
  );
}
