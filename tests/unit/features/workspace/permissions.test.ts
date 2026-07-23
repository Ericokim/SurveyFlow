import { describe, expect, it } from "vitest";

import {
  assertCan,
  can,
  canAssignRole,
  WORKSPACE_CAPABILITIES,
  WORKSPACE_ROLES,
  WorkspacePermissionError,
} from "@/features/workspace/permissions";

describe("permission matrix", () => {
  it("gives owner every capability", () => {
    for (const capability of WORKSPACE_CAPABILITIES) {
      expect(can("owner", capability)).toBe(true);
    }
  });

  it("reserves workspace deletion and owner promotion to owner alone", () => {
    for (const role of WORKSPACE_ROLES) {
      const expected = role === "owner";
      expect(can(role, "workspace:delete")).toBe(expected);
      expect(can(role, "member:promoteOwner")).toBe(expected);
    }
  });

  it("lets editors manage surveys end to end, including deletion", () => {
    expect(can("editor", "survey:create")).toBe(true);
    expect(can("editor", "survey:publish")).toBe(true);
    expect(can("editor", "survey:delete")).toBe(true);
  });

  it("keeps editors out of workspace administration", () => {
    expect(can("editor", "member:invite")).toBe(false);
    expect(can("editor", "member:changeRole")).toBe(false);
    expect(can("editor", "workspace:branding")).toBe(false);
    expect(can("editor", "workspace:auditLog")).toBe(false);
  });

  it("limits viewers to reading and exporting responses", () => {
    const allowed = WORKSPACE_CAPABILITIES.filter((c) => can("viewer", c));
    expect(allowed).toEqual(["response:view", "response:export"]);
  });

  it("lets every role view responses", () => {
    for (const role of WORKSPACE_ROLES) {
      expect(can(role, "response:view")).toBe(true);
    }
  });
});

describe("assertCan", () => {
  it("throws a 403-carrying error when the role lacks the capability", () => {
    expect(() => assertCan("viewer", "survey:delete")).toThrow(
      WorkspacePermissionError,
    );

    try {
      assertCan("viewer", "survey:delete");
    } catch (error) {
      expect((error as WorkspacePermissionError).status).toBe(403);
    }
  });

  it("does not throw when the role holds the capability", () => {
    expect(() => assertCan("admin", "member:invite")).not.toThrow();
  });
});

describe("canAssignRole — privilege escalation guards", () => {
  it("stops an admin from creating another owner", () => {
    expect(canAssignRole("admin", "owner")).toBe(false);
  });

  it("lets an owner create another owner", () => {
    expect(canAssignRole("owner", "owner")).toBe(true);
  });

  it("lets an admin assign non-owner roles", () => {
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("admin", "editor")).toBe(true);
    expect(canAssignRole("admin", "viewer")).toBe(true);
  });

  it("stops roles without member:changeRole from assigning anything", () => {
    for (const target of WORKSPACE_ROLES) {
      expect(canAssignRole("editor", target)).toBe(false);
      expect(canAssignRole("viewer", target)).toBe(false);
    }
  });
});
