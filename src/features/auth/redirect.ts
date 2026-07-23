/**
 * Post-authentication redirect validation.
 *
 * The `?redirect=` parameter on the sign-in page is attacker-controllable: a
 * phishing link can set it to any value and the victim lands there *after*
 * authenticating, when they are most likely to trust the destination. Only
 * same-origin absolute paths are ever safe to navigate to.
 *
 * Pure logic, so the hostile cases below are directly unit-testable.
 */

/**
 * Control characters can smuggle a scheme past a naive prefix check, and CR/LF
 * enable response-splitting. Scanned by char code rather than a regex so the
 * intent stays explicit and no control character is embedded in source.
 */
function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 0x20 || code === 0x7f) return true;
  }

  return false;
}

const MAX_REDIRECT_LENGTH = 2048;

/**
 * Returns the value only when it is a safe same-origin path, otherwise null.
 *
 * Rejects, in particular:
 * - absolute URLs (`https://evil.com`)
 * - protocol-relative URLs (`//evil.com`), which browsers resolve off-origin
 * - backslash variants (`/\evil.com`), which several browsers normalise to `//`
 * - anything containing control characters, including encoded newlines
 */
export function toSafeRedirect(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  if (value.length > MAX_REDIRECT_LENGTH) return null;
  if (hasControlCharacters(value)) return null;

  // Must be an absolute path on this origin.
  if (!value.startsWith("/")) return null;

  // `//host` and `/\host` both escape the origin.
  const second = value[1];
  if (second === "/" || second === "\\") return null;

  return value;
}
