import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const SurveyResponsePage = lazyRouteComponent(
  () => import("../pages/public/SurveyResponsePage"),
  "SurveyResponsePage"
);

/**
 * Public Survey Route
 * Respondent flow - no auth required
 */

export const Route = createFileRoute("/r/$publicId")({
  component: SurveyResponseRoute,
});

function SurveyResponseRoute() {
  return <SurveyResponsePage />;
}
