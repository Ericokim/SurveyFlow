import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

const DraftPreviewPage = lazyRouteComponent(
  () => import("../pages/public/DraftPreviewPage"),
  "DraftPreviewPage"
);

export const Route = createFileRoute("/preview/draft")({
  component: DraftPreviewPage,
});
