import { describe, expect, it } from "vitest";

import {
  getTenantCompanyId,
  withTenantContext,
} from "@/server/db/tenant-context";
import {
  MissingTenantContextError,
  scopeFilter,
} from "@/server/db/tenant-scope.plugin";

const COMPANY_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("scopeFilter", () => {
  it("injects the active tenant", () => {
    expect(scopeFilter({ status: "draft" }, COMPANY_A)).toEqual({
      status: "draft",
      companyId: COMPANY_A,
    });
  });

  it("overwrites a caller-supplied companyId rather than merging it", () => {
    // The whole point: a caller must not be able to read another tenant by
    // naming it, nor widen scope with an operator.
    expect(scopeFilter({ companyId: COMPANY_B }, COMPANY_A)).toEqual({
      companyId: COMPANY_A,
    });

    expect(scopeFilter({ companyId: { $ne: null } }, COMPANY_A)).toEqual({
      companyId: COMPANY_A,
    });
  });

  it("leaves other operators intact", () => {
    expect(scopeFilter({ responses: { $gt: 10 } }, COMPANY_A)).toEqual({
      responses: { $gt: 10 },
      companyId: COMPANY_A,
    });
  });

  it("hides soft-deleted rows when soft delete is enabled", () => {
    expect(scopeFilter({}, COMPANY_A, { softDelete: true })).toEqual({
      companyId: COMPANY_A,
      deletedAt: null,
    });
  });

  it("does not hide soft-deleted rows when the caller asks for them", () => {
    expect(
      scopeFilter({ deletedAt: { $ne: null } }, COMPANY_A, {
        softDelete: true,
      }),
    ).toEqual({ deletedAt: { $ne: null }, companyId: COMPANY_A });
  });

  it("leaves deletedAt alone when soft delete is off", () => {
    expect(scopeFilter({}, COMPANY_A)).toEqual({ companyId: COMPANY_A });
  });

  it("does not mutate the caller's filter", () => {
    const original = { status: "draft" };
    scopeFilter(original, COMPANY_A);
    expect(original).toEqual({ status: "draft" });
  });
});

describe("tenant context", () => {
  it("is absent outside a context", () => {
    expect(getTenantCompanyId()).toBeNull();
  });

  it("exposes the active tenant inside a context", async () => {
    await withTenantContext(COMPANY_A, async () => {
      expect(getTenantCompanyId()).toBe(COMPANY_A);
    });
  });

  it("does not leak out of the context", async () => {
    await withTenantContext(COMPANY_A, async () => undefined);
    expect(getTenantCompanyId()).toBeNull();
  });

  it("keeps concurrent tenants isolated", async () => {
    // The reason this uses AsyncLocalStorage rather than a module variable:
    // interleaved requests must not observe each other's scope.
    const seen: string[] = [];

    const slow = withTenantContext(COMPANY_A, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      seen.push(getTenantCompanyId() ?? "none");
    });

    const fast = withTenantContext(COMPANY_B, async () => {
      seen.push(getTenantCompanyId() ?? "none");
    });

    await Promise.all([slow, fast]);

    expect(seen).toEqual([COMPANY_B, COMPANY_A]);
  });

  it("nests without corrupting the outer scope", async () => {
    await withTenantContext(COMPANY_A, async () => {
      await withTenantContext(COMPANY_B, async () => {
        expect(getTenantCompanyId()).toBe(COMPANY_B);
      });

      expect(getTenantCompanyId()).toBe(COMPANY_A);
    });
  });
});

describe("MissingTenantContextError", () => {
  it("names the model and the escape hatch", () => {
    const error = new MissingTenantContextError("surveys");

    expect(error.message).toContain("surveys");
    expect(error.message).toContain("bypassTenantScope");
    expect(error.status).toBe(500);
  });
});
