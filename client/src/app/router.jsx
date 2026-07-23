import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen.js";
import { ScreenLoader } from "../components/shared/Loading.jsx";

/**
 * TanStack Router Instance
 * File-based routing with code-splitting and loaders
 */
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingMinMs: 0,
  defaultPendingMs: 1000,
  defaultPendingComponent: () => <ScreenLoader message="Loading..." />,
});
