import { describe, expect, it } from "vitest";

import { toSafeRedirect } from "@/features/auth/redirect";

describe("toSafeRedirect", () => {
  it("accepts same-origin absolute paths", () => {
    expect(toSafeRedirect("/app/acme/dashboard")).toBe("/app/acme/dashboard");
    expect(toSafeRedirect("/app/acme/surveys?status=draft")).toBe(
      "/app/acme/surveys?status=draft",
    );
    expect(toSafeRedirect("/")).toBe("/");
  });

  it("rejects absent values", () => {
    expect(toSafeRedirect(undefined)).toBeNull();
    expect(toSafeRedirect(null)).toBeNull();
    expect(toSafeRedirect("")).toBeNull();
  });

  it("rejects absolute URLs to another origin", () => {
    expect(toSafeRedirect("https://evil.com")).toBeNull();
    expect(toSafeRedirect("http://evil.com/app")).toBeNull();
    expect(toSafeRedirect("javascript:alert(1)")).toBeNull();
    expect(toSafeRedirect("data:text/html,<script>")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(toSafeRedirect("//evil.com")).toBeNull();
    expect(toSafeRedirect("//evil.com/app/acme/dashboard")).toBeNull();
  });

  it("rejects backslash variants browsers normalise off-origin", () => {
    expect(toSafeRedirect("/\\evil.com")).toBeNull();
    expect(toSafeRedirect("/\\/evil.com")).toBeNull();
  });

  it("rejects control characters used to smuggle a scheme", () => {
    expect(toSafeRedirect("/\tapp")).toBeNull();
    expect(toSafeRedirect("/\napp")).toBeNull();
    expect(toSafeRedirect("/\r\nSet-Cookie: x=1")).toBeNull();
    expect(toSafeRedirect("java\tscript:alert(1)")).toBeNull();
  });

  it("rejects relative paths that are not origin-absolute", () => {
    expect(toSafeRedirect("app/acme/dashboard")).toBeNull();
    expect(toSafeRedirect("../admin")).toBeNull();
  });

  it("rejects absurdly long values", () => {
    expect(toSafeRedirect(`/${"a".repeat(4000)}`)).toBeNull();
  });
});
