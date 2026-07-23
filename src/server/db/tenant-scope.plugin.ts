import type { Aggregate, Query, Schema } from "mongoose";
import { Types } from "mongoose";

import { AppError } from "@/lib/errors";

import { getTenantCompanyId } from "./tenant-context";

/** Thrown when a workspace-owned model is used without a workspace set. */
export class MissingTenantContextError extends AppError {
  constructor(operation: string) {
    super(
      `"${operation}" was called on a workspace-owned model without a workspace. ` +
        "Wrap it in withWorkspace() or withTenantContext(), or pass " +
        ".setOptions({ bypassTenantScope: true }) if it really is cross-workspace.",
      500,
    );
  }
}

/**
 * Tenant isolation, enforced structurally.
 *
 * Remembering to write `{ companyId }` in every query is a discipline that
 * fails silently, and the failure mode is a cross-tenant data leak. This
 * plugin injects the scope into every read, write, and delete on the models it
 * is applied to, and **fails closed**: a tenant-owned model queried with no
 * ambient tenant throws rather than returning everyone's rows.
 *
 * Deliberately NOT applied to:
 * - `Company` — it *is* the tenant.
 * - `User` — a person exists across workspaces.
 * - `Membership` — it establishes the scope, so scoping it by the scope it
 *   produces is circular. It is instead always queried by `userId` (the
 *   caller's own) or an explicit `companyId`.
 */

/** Queries that read or mutate existing documents. */
const QUERY_HOOKS = [
  "count",
  "countDocuments",
  "deleteMany",
  "deleteOne",
  "distinct",
  "find",
  "findOne",
  "findOneAndDelete",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
] as const;

export interface TenantScopeOptions {
  /** Also hide soft-deleted rows unless explicitly asked for. */
  softDelete?: boolean;
}

/**
 * Build the filter a tenant-owned query must run with.
 *
 * Pure, so the interesting cases are unit-testable without a database.
 * An explicit `companyId` in the caller's filter is *overwritten*, never
 * merged — otherwise a caller could widen their own scope by passing
 * `{ companyId: { $ne: null } }`.
 */
export function scopeFilter(
  filter: Record<string, unknown>,
  companyId: string | Types.ObjectId,
  options: TenantScopeOptions = {},
): Record<string, unknown> {
  const scoped: Record<string, unknown> = { ...filter, companyId };

  // Soft-deleted rows are invisible unless the caller names deletedAt itself.
  if (options.softDelete && !("deletedAt" in filter)) {
    scoped.deletedAt = null;
  }

  return scoped;
}

type TenantQuery = Query<unknown, unknown> & {
  getOptions(): { bypassTenantScope?: boolean };
};

type TenantAggregate = Aggregate<unknown[]> & {
  options?: { bypassTenantScope?: boolean };
};

/**
 * Apply to every tenant-owned schema.
 *
 * The escape hatch is `.setOptions({ bypassTenantScope: true })` — verbose and
 * greppable on purpose, so an unscoped query is a deliberate, reviewable act
 * rather than an oversight.
 */
export function tenantScopePlugin(
  schema: Schema,
  options: TenantScopeOptions = {},
): void {
  for (const hook of QUERY_HOOKS) {
    // Cast narrows a union of hook names to one overload; Mongoose dispatches
    // on the string at runtime, so behaviour is identical for each.
    schema.pre(hook as "find", function applyScope(this: TenantQuery) {
      if (this.getOptions().bypassTenantScope) return;

      const companyId = getTenantCompanyId();
      if (!companyId) throw new MissingTenantContextError(hook);

      this.setQuery(scopeFilter(this.getFilter(), companyId, options));
    });
  }

  // Creating a document: stamp the tenant, and refuse a mismatched one.
  schema.pre("save", function stampTenant(this: Record<string, unknown>) {
    const companyId = getTenantCompanyId();
    if (!companyId) throw new MissingTenantContextError("save");

    const existing = this.companyId;

    if (existing == null) {
      this.companyId = companyId;
      return;
    }

    if (String(existing) !== companyId) {
      throw new Error(
        "Refusing to write a document whose companyId does not match the active tenant.",
      );
    }
  });

  // Aggregations bypass query middleware entirely, so scope the pipeline head.
  schema.pre("aggregate", function scopePipeline(this: TenantAggregate) {
    if (this.options?.bypassTenantScope) return;

    const companyId = getTenantCompanyId();
    if (!companyId) throw new MissingTenantContextError("aggregate");

    // Mongoose casts query filters against the schema, but aggregation
    // pipelines are passed through verbatim — a string would never match a
    // stored ObjectId, silently returning nothing.
    this.pipeline().unshift({
      $match: scopeFilter({}, new Types.ObjectId(companyId), options),
    });
  });
}
