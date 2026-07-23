import {
  createFileRoute,
  Navigate,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

const WorkspaceSettings = lazyRouteComponent(
  () => import("../pages/settings/WorkspaceSettings"),
  "WorkspaceSettings"
);

/**
 * Workspace Settings Route
 * Configure company branding and defaults
 */

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <WorkspaceSettings />;
}
