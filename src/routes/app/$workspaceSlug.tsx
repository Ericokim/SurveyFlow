import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getWorkspaceContext } from "@/features/workspace/server";

/**
 * Workspace layout route — the guard every `/app/:workspaceSlug/*` page
 * inherits.
 *
 * `beforeLoad` resolves the workspace server-side on every navigation, so the
 * slug in the URL is only ever a *candidate*: membership is what authorizes
 * access, and revoking it takes effect on the next request rather than at
 * token expiry.
 *
 * The resolved context is placed on the router context, so child routes and
 * components read the active workspace without re-deriving (or trusting) it.
 */
export const Route = createFileRoute("/app/$workspaceSlug")({
  beforeLoad: async ({ params, location }) => {
    try {
      const workspace = await getWorkspaceContext({
        data: { workspaceSlug: params.workspaceSlug },
      });

      return { workspace };
    } catch {
      // Unauthenticated, not a member, or no such workspace — all
      // indistinguishable by design, so none of them leak whether the
      // workspace exists.
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return <Outlet />;
}
