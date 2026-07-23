import React from "react";
import Header from "./Header";
import { Footer } from "./Footer";
import { ScreenLoader } from "../shared/Loading";

/**
 * Dashboard Layout - Shared layout for authenticated pages
 *
 * Features:
 * - Top navigation with user info
 * - Logout button
 * - Role badge
 * - Footer with branding
 */

export function RouteTransition({ children }) {
  return (
    <div className="transition-opacity duration-200 ease-in-out">
      <React.Suspense fallback={<ScreenLoader message="Loading page..." />}>
        {children}
      </React.Suspense>
    </div>
  );
}

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background w-full flex flex-col">
      {/* Top Navigation */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-4 w-full">
        <RouteTransition>{children}</RouteTransition>
      </main>

      {/* Footer */}
      <Footer variant="default" />
    </div>
  );
}
