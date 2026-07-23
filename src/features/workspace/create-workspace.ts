import type mongoose from "mongoose";

import { slugCandidates } from "@/features/workspace/slug";
import { withTenantContext } from "@/server/db/tenant-context";
import { AuditLog } from "@/server/models/audit-log.model";
import { Company } from "@/server/models/company.model";
import { Membership } from "@/server/models/membership.model";

/** MongoDB duplicate-key error. */
const DUPLICATE_KEY = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === DUPLICATE_KEY
  );
}

/**
 * Create a workspace and make `ownerId` its owner.
 *
 * **Atomicity:** MongoDB transactions require a replica set, and local
 * development runs a standalone `mongod` where they are unavailable. Rather
 * than make local setup harder, this uses a compensating cleanup — if the
 * membership write fails, the company just created is removed, so a workspace
 * can never exist without an owner.
 *
 * If the deployment target moves to a replica set (Atlas does this by
 * default), replace the cleanup with a real transaction; the boundary is
 * already in one place.
 */
export async function createWorkspaceWithOwner(options: {
  ownerId: mongoose.Types.ObjectId;
  workspaceName: string;
}): Promise<{ companyId: mongoose.Types.ObjectId; slug: string }> {
  const { ownerId, workspaceName } = options;

  const company = await createCompanyWithUniqueSlug(workspaceName);

  try {
    await Membership.create({
      userId: ownerId,
      companyId: company._id,
      role: "owner",
    });

    // AuditLog is tenant-owned, so it needs an ambient tenant. The workspace
    // being created is that tenant — this is the moment it starts existing.
    await withTenantContext(String(company._id), () =>
      AuditLog.create({
        companyId: company._id,
        userId: ownerId,
        action: "workspace.created",
        targetType: "Company",
        targetId: String(company._id),
        metadata: { slug: company.slug },
      }),
    );
  } catch (error) {
    // Compensating cleanup: never leave an owner-less workspace behind.
    await Company.deleteOne({ _id: company._id }).catch(() => undefined);
    await Membership.deleteOne({
      userId: ownerId,
      companyId: company._id,
    }).catch(() => undefined);
    throw error;
  }

  return { companyId: company._id, slug: company.slug };
}

/**
 * Insert a company, retrying against the unique index until a free slug is
 * found. The index is the authority — checking availability first and then
 * inserting would race between two concurrent signups.
 */
async function createCompanyWithUniqueSlug(name: string) {
  const candidates = slugCandidates(name);

  for (const slug of candidates) {
    try {
      return await Company.create({ name, slug });
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      throw error;
    }
  }

  throw new Error(
    `Could not derive an available workspace slug for "${name}" after ${candidates.length} attempts.`,
  );
}
