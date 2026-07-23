import { describe, expect, it } from "vitest";

import {
  isReservedSlug,
  slugCandidates,
  slugify,
} from "@/features/workspace/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Health")).toBe("acme-health");
    expect(slugify("CareOps East")).toBe("careops-east");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(slugify("Café Nord")).toBe("cafe-nord");
  });

  it("collapses runs of punctuation into a single hyphen", () => {
    expect(slugify("Northstar   Clinics!!! & Co.")).toBe(
      "northstar-clinics-co",
    );
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Acme--  ")).toBe("acme");
  });

  it("returns an empty string when nothing is sluggable", () => {
    expect(slugify("…")).toBe("");
    expect(slugify("！！")).toBe("");
  });

  it("never exceeds the length limit or ends in a hyphen", () => {
    const slug = slugify("A".repeat(80));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugCandidates", () => {
  it("offers the plain slug first", () => {
    expect(slugCandidates("Acme Health")[0]).toBe("acme-health");
  });

  it("suffixes subsequent candidates so collisions resolve", () => {
    const [first, second, third] = slugCandidates("Acme Health");
    expect(first).toBe("acme-health");
    expect(second).toBe("acme-health-2");
    expect(third).toBe("acme-health-3");
  });

  it("produces only distinct candidates", () => {
    const candidates = slugCandidates("Acme Health");
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it("stays within the length limit even when suffixed", () => {
    for (const candidate of slugCandidates("A".repeat(80))) {
      expect(candidate.length).toBeLessThanOrEqual(60);
    }
  });

  it("keeps long names distinct rather than truncating them together", () => {
    const candidates = slugCandidates("B".repeat(80));
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it("falls back to a generic stem when the name is not sluggable", () => {
    expect(slugCandidates("…")[0]).toBe("workspace-1");
  });

  it("never proposes a reserved slug unsuffixed", () => {
    const [first] = slugCandidates("Admin");
    expect(first).not.toBe("admin");
    expect(isReservedSlug(first)).toBe(false);
  });
});
