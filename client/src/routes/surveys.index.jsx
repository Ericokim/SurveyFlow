import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

// Surveys index route - lists surveys at /surveys
export const Route = createFileRoute("/surveys/")({
  component: lazyRouteComponent(
    () => import("../pages/dashboard/DashboardPage"),
    "DashboardPage"
  ),
});
