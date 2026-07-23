import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const SurveyResponsePage = lazyRouteComponent(
  () => import("../pages/public/SurveyResponsePage"),
  "SurveyResponsePage"
);

/**
 * Test Survey Route
 * Test mode - responses saved with mode="test", excluded from analytics
 */

export const Route = createFileRoute("/r/$publicId/test")({
  component: TestSurveyRoute,
});

function TestSurveyRoute() {
  return <SurveyResponsePage mode="test" />;
}
