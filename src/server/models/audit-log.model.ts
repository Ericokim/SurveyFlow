import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import { tenantScopePlugin } from "@/server/db/tenant-scope.plugin";

import { baseSchemaOptions } from "./_shared";

/**
 * Tenant-scoped audit trail. Every membership change, role change, and
 * invitation writes a row scoped to the workspace it happened in.
 *
 * Never write survey answer values into `metadata` — the audit log must stay
 * outside the blast radius of a right-to-erasure request. Log the event and
 * the identifiers, nothing more. See
 * docs/specs/2026-07-23-multitenant-foundation.md (Decision 4).
 */
export const AUDIT_ACTIONS = [
  "workspace.created",
  "member.invited",
  "member.joined",
  "member.roleChanged",
  "member.removed",
  "survey.deleted",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogAttrs {
  companyId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLogAttrs>;

const auditLogSchema = new Schema<AuditLogAttrs>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, required: true },
    targetId: String,
    metadata: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions,
);

/** Supports "show this workspace's activity, newest first". */
auditLogSchema.index({ companyId: 1, createdAt: -1 });

// Tenant-owned: every read and write is scoped to the active workspace, and
// querying it outside a tenant context throws rather than spanning workspaces.
// Audit rows are never soft-deleted — the trail must not be erasable.
auditLogSchema.plugin(tenantScopePlugin);

export const AuditLog: Model<AuditLogAttrs> =
  (mongoose.models.AuditLog as Model<AuditLogAttrs> | undefined) ??
  mongoose.model<AuditLogAttrs>("AuditLog", auditLogSchema);
