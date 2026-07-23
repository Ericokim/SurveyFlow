/**
 * Workspace slug generation.
 *
 * The slug addresses a workspace in the URL (`/app/:workspaceSlug/…`) and is
 * therefore the entry point for tenant resolution. Pure logic — no database —
 * so it is directly unit-testable; uniqueness is resolved separately against
 * the collection.
 */

const MAX_SLUG_LENGTH = 60;

/** Reserved because they would collide with real or planned route segments. */
const RESERVED_SLUGS = new Set([
  "api",
  "app",
  "auth",
  "admin",
  "login",
  "logout",
  "register",
  "new",
  "settings",
  "workspace",
  "surveys",
  "dashboard",
]);

/**
 * Convert a workspace name into a URL-safe slug.
 *
 * Returns an empty string when the name contains nothing sluggable (for
 * example "…" or a purely non-Latin name); callers must handle that by
 * falling back to a generated value rather than persisting an empty slug.
 */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      // Strip combining marks so "Café" becomes "cafe" rather than "caf".
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG_LENGTH)
      .replace(/-+$/g, "")
  );
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * Produce the candidate slugs to try, in order, for a given name.
 *
 * The first candidate is the plain slug; subsequent ones append `-2`, `-3`, …
 * so a second "Acme Health" becomes `acme-health-2`. Truncation keeps the
 * suffix intact rather than the stem, so candidates never collide by being cut
 * to the same string.
 */
export function slugCandidates(name: string, attempts = 25): string[] {
  const base = slugify(name);
  const stem = base === "" || isReservedSlug(base) ? "workspace" : base;

  const candidates: string[] = [];

  for (let index = 0; index < attempts; index += 1) {
    if (index === 0 && stem === base && !isReservedSlug(base)) {
      candidates.push(stem);
      continue;
    }

    const suffix = `-${index + 1}`;
    candidates.push(stem.slice(0, MAX_SLUG_LENGTH - suffix.length) + suffix);
  }

  return candidates;
}
