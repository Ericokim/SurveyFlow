/**
 * Workspace role vocabulary and permission matrix.
 *
 * Source of truth for both the Mongoose `Membership` enum and any UI that
 * hides controls a role cannot use. Pure logic — no database, no request
 * context — so it is directly unit-testable.
 *
 * Decided in docs/specs/2026-07-23-multitenant-foundation.md (Decision 2).
 */

import { AppError } from "@/lib/errors";

export const WORKSPACE_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_CAPABILITIES = [
  "survey:create",
  "survey:publish",
  "survey:delete",
  "response:view",
  "response:export",
  "recipient:manage",
  "member:invite",
  "member:changeRole",
  "member:remove",
  "member:promoteOwner",
  "workspace:branding",
  "workspace:auditLog",
  "workspace:delete",
] as const;

export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

/**
 * The line is drawn at *workspace* administration, not *survey* lifecycle:
 * an editor owns surveys end to end (including deletion, which is a soft
 * delete and audit-logged) but cannot administer the workspace itself.
 */
const MATRIX: Record<WorkspaceRole, ReadonlySet<WorkspaceCapability>> = {
  owner: new Set(WORKSPACE_CAPABILITIES),
  admin: new Set<WorkspaceCapability>([
    "survey:create",
    "survey:publish",
    "survey:delete",
    "response:view",
    "response:export",
    "recipient:manage",
    "member:invite",
    "member:changeRole",
    "member:remove",
    "workspace:branding",
    "workspace:auditLog",
  ]),
  editor: new Set<WorkspaceCapability>([
    "survey:create",
    "survey:publish",
    "survey:delete",
    "response:view",
    "response:export",
    "recipient:manage",
  ]),
  viewer: new Set<WorkspaceCapability>(["response:view", "response:export"]),
};

/** Does this role hold this capability? */
export function can(
  role: WorkspaceRole,
  capability: WorkspaceCapability,
): boolean {
  return MATRIX[role].has(capability);
}

/**
 * Throwing variant for server functions. Check authorization *after* the
 * session and workspace are resolved, never from client-supplied input.
 */
export function assertCan(
  role: WorkspaceRole,
  capability: WorkspaceCapability,
): void {
  if (!can(role, capability)) {
    throw new WorkspacePermissionError(role, capability);
  }
}

export class WorkspacePermissionError extends AppError {
  constructor(
    readonly role: WorkspaceRole,
    readonly capability: WorkspaceCapability,
  ) {
    super(`Role "${role}" is not permitted to perform "${capability}".`, 403);
  }
}

/**
 * Only an owner may create another owner — an admin must not be able to
 * escalate someone (including themselves) to the role that can delete the
 * workspace.
 */
export function canAssignRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (!can(actorRole, "member:changeRole")) return false;
  if (targetRole === "owner") return can(actorRole, "member:promoteOwner");
  return true;
}
