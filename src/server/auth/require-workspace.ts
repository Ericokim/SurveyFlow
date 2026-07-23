import mongoose from "mongoose";

import type { WorkspaceRole } from "@/features/workspace/permissions";
import { AppError } from "@/lib/errors";
import { connectToDatabase } from "@/server/db/mongoose";
import { withTenantContext } from "@/server/db/tenant-context";
import { Company } from "@/server/models/company.model";
import { Membership } from "@/server/models/membership.model";
import { User } from "@/server/models/user.model";

import { requireSession } from "./session";

/**
 * The single source of `companyId` in the application.
 *
 * Every authenticated server function calls this. No server function may
 * derive a workspace any other way, and the workspace is never read from a
 * request body or any other client-supplied field — a client that can name its
 * own `companyId` has no tenant isolation at all.
 *
 * See docs/specs/2026-07-23-multitenant-foundation.md (Decision 3) and
 * docs/agentic/backend-foundation-prompt.md Phase 2.
 */
export interface WorkspaceContext {
  userId: string;
  companyId: string;
  companySlug: string;
  role: WorkspaceRole;
}

/**
 * Authorize the workspace, then run `fn` with it as the ambient tenant.
 *
 * This is the entry point every workspace-scoped server function should use:
 * it pairs the authorization check with the query scope, so the two cannot
 * drift apart. Calling `requireWorkspace` alone authorizes but does *not*
 * establish scope — tenant-owned models will then refuse to run.
 */
export async function withWorkspace<TResult>(
  workspaceSlug: string,
  fn: (context: WorkspaceContext) => Promise<TResult>,
): Promise<TResult> {
  const context = await requireWorkspace(workspaceSlug);

  return withTenantContext(context.companyId, () => fn(context));
}

export class WorkspaceAccessError extends AppError {
  /**
   * 404, not 403, and deliberately so: a member of workspace A must not be
   * able to learn whether workspace B exists by probing slugs.
   */
  constructor(message = "Workspace not found.") {
    super(message, 404);
  }
}

/**
 * Resolve and authorize the active workspace from a URL slug.
 *
 * The slug is untrusted input. It selects a candidate workspace; membership is
 * what authorizes access to it. Both are checked against the database on every
 * request, so a revoked membership stops working on the next call rather than
 * when a token happens to expire.
 */
export async function requireWorkspace(
  workspaceSlug: string,
): Promise<WorkspaceContext> {
  const { userId } = requireSession();

  if (!mongoose.isValidObjectId(userId)) throw new WorkspaceAccessError();

  await connectToDatabase();

  const company = await Company.findOne({ slug: workspaceSlug })
    .select({ _id: 1, slug: 1 })
    .lean();

  if (!company) throw new WorkspaceAccessError();

  const [membership, user] = await Promise.all([
    Membership.findOne({ userId, companyId: company._id })
      .select({ role: 1 })
      .lean(),
    User.findById(userId).select({ isActive: 1 }).lean(),
  ]);

  // A deactivated account loses access everywhere, immediately.
  if (!membership || !user?.isActive) throw new WorkspaceAccessError();

  return {
    userId: String(userId),
    companyId: String(company._id),
    companySlug: company.slug,
    role: membership.role,
  };
}
