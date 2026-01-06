"use client";

import BottomNav from "./BottomNav";

interface PageLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  title?: string;
}

export default function PageLayout({
  children,
  showNav = true,
  title,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {title && (
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40 safe-top">
          <div className="max-w-lg mx-auto px-4 py-3">
            <h1 className="text-lg font-semibold text-center text-gray-900">
              {title}
            </h1>
          </div>
        </header>
      )}
      <main className={`page-container max-w-lg mx-auto ${showNav ? "pb-20" : ""} animate-fade-in`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
