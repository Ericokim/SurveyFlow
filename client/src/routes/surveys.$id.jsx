import {
  createFileRoute,
  Navigate,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

const SurveyEditorPage = lazyRouteComponent(
  () => import("../pages/surveys/SurveyEditorPage.jsx"),
  "SurveyEditorPage"
);

/**
 * Survey Editor Route
 * Edit individual survey with drag-drop questions
 */

export const Route = createFileRoute("/surveys/$id")({
  component: SurveyEditorRoute,
});

function SurveyEditorRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <SurveyEditorPage />;
}
