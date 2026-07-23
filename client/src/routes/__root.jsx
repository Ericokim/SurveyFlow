import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "../components/ui/sonner";
import { ErrorPage } from "../components/shared/ErrorPage";

/**
 * Root Route - Layout wrapper for all routes
 *
 * Provides:
 * - Toaster for global notifications
 * - Outlet for child routes
 */

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors limit={1} duration={12000} />
    </>
  );
}

function RootError({ error }) {
  return (
    <ErrorPage
      error={error}
      title="Something went wrong"
      description="We hit an unexpected error while loading this page."
      homeTo="/"
      secondaryLabel="Go home"
    />
  );
}

function RootNotFound() {
  return (
    <ErrorPage
      statusCode={404}
      title="Page not found"
      description="We couldn’t find the page you’re looking for."
      homeTo="/"
      secondaryLabel="Go home"
      showRetry={false}
    />
  );
}
