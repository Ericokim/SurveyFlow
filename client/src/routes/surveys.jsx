import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

/**
 * Surveys Route - Parent Layout
 * Parent route for survey dashboard and editor.
 * Child routes:
 * - /surveys/        → list (index route)
 * - /surveys/$id     → editor
 */

export const Route = createFileRoute("/surveys")({
  component: SurveysRoute,
});

function SurveysRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Render child routes via Outlet (index or $id)
  return <Outlet />;
}
