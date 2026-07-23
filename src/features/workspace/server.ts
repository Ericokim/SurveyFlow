import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { WorkspaceContext } from "@/server/auth/require-workspace";
import { requireWorkspace } from "@/server/auth/require-workspace";
import { requireSession } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/mongoose";
import { Membership } from "@/server/models/membership.model";

const workspaceSlugSchema = z.object({
  workspaceSlug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Invalid workspace."),
});

/**
 * Resolve and authorize the active workspace for a route guard.
 *
 * This is the only way the client learns its own `companyId`, and it is
 * re-derived from the session plus a membership lookup on every call — the
 * slug in the URL selects a candidate, membership authorizes it.
 */
export const getWorkspaceContext = createServerFn({ method: "GET" })
  .validator(workspaceSlugSchema)
  .handler(async ({ data }) =>
    Sentry.startSpan(
      { name: "getWorkspaceContext" },
      (): Promise<WorkspaceContext> => requireWorkspace(data.workspaceSlug),
    ),
  );

export interface WorkspaceSummary {
  slug: string;
  name: string;
  role: string;
}

/**
 * The workspaces the signed-in user belongs to, for the switcher.
 *
 * Scoped to the caller's own memberships — it can never enumerate workspaces
 * the user is not a member of.
 */
export const listMyWorkspaces = createServerFn({ method: "GET" }).handler(
  async () =>
    Sentry.startSpan(
      { name: "listMyWorkspaces" },
      async (): Promise<WorkspaceSummary[]> => {
        const { userId } = requireSession();

        await connectToDatabase();

        const memberships = await Membership.find({ userId })
          .select({ role: 1, companyId: 1 })
          .populate<{ companyId: { slug: string; name: string } }>(
            "companyId",
            "slug name",
          )
          .lean();

        return memberships
          .filter((membership) => membership.companyId != null)
          .map((membership) => ({
            slug: membership.companyId.slug,
            name: membership.companyId.name,
            role: membership.role,
          }));
      },
    ),
);
