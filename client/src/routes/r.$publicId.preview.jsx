import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const SurveyResponsePage = lazyRouteComponent(
  () => import("../pages/public/SurveyResponsePage"),
  "SurveyResponsePage"
);

/**
 * Preview Survey Route
 * Preview mode - no auth, no whitelist, no data persistence
 */

export const Route = createFileRoute("/r/$publicId/preview")({
  component: PreviewSurveyRoute,
});

function PreviewSurveyRoute() {
  return <SurveyResponsePage mode="preview" />;
}
