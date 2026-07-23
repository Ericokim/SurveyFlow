import type { HydratedDocument, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

import {
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from "@/features/workspace/permissions";

import { baseSchemaOptions } from "./_shared";

/**
 * Membership is the join between a person and a workspace, and the sole
 * authority on which workspaces a user may act in.
 *
 * It exists locally (rather than in an external identity provider) precisely
 * because the tenant isolation boundary filters Mongo queries on `companyId`
 * — that check must consult data this database owns and can trust. See
 * docs/specs/2026-07-23-multitenant-foundation.md (Decisions 1 and 3).
 */
export interface MembershipAttrs {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  role: WorkspaceRole;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipDocument = HydratedDocument<MembershipAttrs>;

const membershipSchema = new Schema<MembershipAttrs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      required: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  baseSchemaOptions,
);

/** One membership per person per workspace. */
membershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });

/** Supports "list the members of this workspace, owners first". */
membershipSchema.index({ companyId: 1, role: 1 });

export const Membership: Model<MembershipAttrs> =
  (mongoose.models.Membership as Model<MembershipAttrs> | undefined) ??
  mongoose.model<MembershipAttrs>("Membership", membershipSchema);
