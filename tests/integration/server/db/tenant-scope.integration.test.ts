// @vitest-environment node
//
// Server code must run under the node environment: `vitest.config.ts` defaults
// to jsdom for component tests, and under jsdom `typeof window !== "undefined"`
// makes @t3-oss/env-core treat this as the client and refuse to read
// server-only variables like MONGODB_URI.

import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWorkspaceWithOwner } from "@/features/workspace/create-workspace";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "@/server/db/mongoose";
import { withTenantContext } from "@/server/db/tenant-context";
import { MissingTenantContextError } from "@/server/db/tenant-scope.plugin";
import { AuditLog } from "@/server/models/audit-log.model";
import { Company } from "@/server/models/company.model";
import { Membership } from "@/server/models/membership.model";
import { User } from "@/server/models/user.model";

/**
 * Integration coverage against a real MongoDB.
 *
 * Skipped unless MONGODB_URI is present, so `npm run test` stays offline and
 * deterministic. Run explicitly with:
 *
 *   npx dotenv -e .env.local -- npx vitest run src/server/db/tenant-isolation.integration.test.ts
 *
 * Everything it creates is namespaced with a unique suffix and removed in
 * afterAll, so it is safe against a shared database.
 */
const hasDatabase = Boolean(process.env.MONGODB_URI);

const RUN_ID = `it-${Math.floor(Number(process.hrtime.bigint() % 1_000_000n))}`;

describe.skipIf(!hasDatabase)("tenant isolation (integration)", () => {
  const created = {
    userIds: [] as mongoose.Types.ObjectId[],
    companyIds: [] as mongoose.Types.ObjectId[],
  };

  let alphaCompanyId: string;
  let betaCompanyId: string;

  beforeAll(async () => {
    await connectToDatabase();

    const alphaOwner = await User.create({
      name: "Alpha Owner",
      email: `${RUN_ID}-alpha@example.test`,
      passwordHash: "x".repeat(60),
    });
    const betaOwner = await User.create({
      name: "Beta Owner",
      email: `${RUN_ID}-beta@example.test`,
      passwordHash: "x".repeat(60),
    });

    created.userIds.push(alphaOwner._id, betaOwner._id);

    const alpha = await createWorkspaceWithOwner({
      ownerId: alphaOwner._id,
      workspaceName: `${RUN_ID} Alpha`,
    });
    const beta = await createWorkspaceWithOwner({
      ownerId: betaOwner._id,
      workspaceName: `${RUN_ID} Beta`,
    });

    created.companyIds.push(alpha.companyId, beta.companyId);
    alphaCompanyId = String(alpha.companyId);
    betaCompanyId = String(beta.companyId);
  }, 60_000);

  afterAll(async () => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) return;

    await AuditLog.deleteMany({
      companyId: { $in: created.companyIds },
    }).setOptions({ bypassTenantScope: true });
    await Membership.deleteMany({ companyId: { $in: created.companyIds } });
    await Company.deleteMany({ _id: { $in: created.companyIds } });
    await User.deleteMany({ _id: { $in: created.userIds } });

    await disconnectFromDatabase();
  }, 60_000);

  it("connects to the configured database", () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toBe("surveyflow");
  });

  it("creates workspace, owner membership and audit row together", async () => {
    const membership = await Membership.findOne({
      companyId: alphaCompanyId,
    }).lean();

    expect(membership?.role).toBe("owner");

    const audits = await withTenantContext(alphaCompanyId, () =>
      AuditLog.find({ action: "workspace.created" }).lean(),
    );

    expect(audits).toHaveLength(1);
  });

  it("derives distinct slugs for distinct workspaces", async () => {
    const companies = await Company.find({
      _id: { $in: created.companyIds },
    }).lean();

    const slugs = companies.map((company) => company.slug);

    expect(new Set(slugs).size).toBe(2);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  // The point of the whole boundary.
  it("does not leak workspace B's rows into workspace A's context", async () => {
    const fromAlpha = await withTenantContext(alphaCompanyId, () =>
      AuditLog.find({}).lean(),
    );

    expect(fromAlpha.length).toBeGreaterThan(0);
    for (const row of fromAlpha) {
      expect(String(row.companyId)).toBe(alphaCompanyId);
    }
  });

  it("ignores a caller-supplied companyId that names another tenant", async () => {
    // Attempting to read Beta's rows from inside Alpha's context.
    const smuggled = await withTenantContext(alphaCompanyId, () =>
      AuditLog.find({ companyId: betaCompanyId }).lean(),
    );

    for (const row of smuggled) {
      expect(String(row.companyId)).toBe(alphaCompanyId);
    }
  });

  it("scopes aggregations too", async () => {
    const rows = await withTenantContext(alphaCompanyId, () =>
      AuditLog.aggregate([{ $group: { _id: "$companyId", n: { $sum: 1 } } }]),
    );

    expect(rows).toHaveLength(1);
    expect(String(rows[0]._id)).toBe(alphaCompanyId);
  });

  it("refuses to write a document belonging to another tenant", async () => {
    await expect(
      withTenantContext(alphaCompanyId, () =>
        AuditLog.create({
          companyId: new mongoose.Types.ObjectId(betaCompanyId),
          action: "member.invited",
          targetType: "Membership",
        }),
      ),
    ).rejects.toThrow(/does not match the active tenant/);
  });

  it("fails closed when queried with no tenant context", async () => {
    await expect(AuditLog.find({}).lean()).rejects.toThrow(
      MissingTenantContextError,
    );
  });

  it("allows an explicit, greppable bypass", async () => {
    const rows = await AuditLog.find({
      companyId: { $in: created.companyIds },
    })
      .setOptions({ bypassTenantScope: true })
      .lean();

    const tenants = new Set(rows.map((row) => String(row.companyId)));

    expect(tenants.size).toBe(2);
  });
});
