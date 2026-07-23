import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { AlertProvider } from "./context/AlertContext";
import { AlertDialog } from "../components/shared/Dialog";
import { TooltipProvider } from "../components/ui/tooltip";
import { ThemeProvider } from "../components/ui/theme-provider";

/**
 * QueryClient Configuration
 * Central configuration for TanStack Query
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: false, // Don't retry failed queries to prevent 401 spam
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * getContext Utility
 * Access queryClient from outside React components
 */
export function getContext() {
  return {
    queryClient,
  };
}

/**
 * App Providers
 * Wraps the app with all necessary providers in optimal order:
 * - AlertProvider: Global confirmation dialogs
 * - QueryClientProvider: TanStack Query for data fetching
 * - TooltipProvider: Global tooltip configuration
 * - RouterProvider: TanStack Router for navigation
 */
export function AppProviders() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <AlertProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            <RouterProvider router={router} />
            {import.meta.env.DEV && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
            <AlertDialog />
          </TooltipProvider>
        </QueryClientProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

export { queryClient };
