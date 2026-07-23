import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

/**
 * Index Route - Landing page
 *
 * Logic:
 * - If authenticated → redirect to /surveys
 * - If not authenticated → redirect to /login
 */

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/surveys" />;
  }

  return <Navigate to="/login" />;
}
