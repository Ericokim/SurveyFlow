/**
 * Derives readable foreground colours for an arbitrary survey brand colour.
 *
 * Survey owners pick `themeColor` freely — the schema validates only
 * `^#[0-9A-Fa-f]{6}$`, so nothing stops a pale yellow. The respondent form used
 * to paint white text on that colour unconditionally, which measures:
 *
 *   #FFD400 → 1.43:1   #10B981 → 2.54:1   #FF5A36 → 3.10:1   #2563EB → 5.17:1
 *
 * i.e. the shipped default already failed AA for 14px text, and a light brand
 * made the header and the submit button effectively invisible. These helpers
 * pick the readable ink instead of assuming white, and produce a darkened
 * variant of the brand for anything that must read against a white card.
 */

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** #rgb / #rrggbb -> [r, g, b] in 0..255. Returns null if unparseable. */
export function parseHex(hex) {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const toLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0..1. */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two [r,g,b] triples. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const WHITE = [255, 255, 255];
/** Matches --foreground/--background dark end, so ink reads as "the app's black". */
const INK = [23, 23, 23];

/**
 * Readable text colour to sit *on* `hex`.
 *
 * Biased toward white rather than simply picking the higher ratio: the product
 * deliberately accepts white-on-coral at ~3.1:1 for its own brand, so flipping a
 * similarly-saturated survey brand to dark ink would look inconsistent with the
 * rest of the app. White is kept while it stays at or above `minWhite`, and only
 * genuinely unreadable brands (pale yellows, mints, cyans) get dark ink.
 */
export function readableOn(hex, { minWhite = 3, fallback = "#ffffff" } = {}) {
  const rgb = parseHex(hex);
  if (!rgb) return fallback;
  if (contrastRatio(rgb, WHITE) >= minWhite) return "#ffffff";
  return contrastRatio(rgb, INK) > contrastRatio(rgb, WHITE) ? "#171717" : "#ffffff";
}

const toHex = (rgb) =>
  "#" + rgb.map((c) => Math.round(clamp01(c / 255) * 255).toString(16).padStart(2, "0")).join("");

/**
 * A darkened variant of `hex` that clears `target` contrast against white.
 *
 * For links, focus rings, progress fills and filled rating stars — anything
 * that must be legible on the white card rather than used as a large fill.
 * Blends toward black in small steps so the hue is preserved.
 */
export function inkOn(hex, target = 4.5) {
  const rgb = parseHex(hex);
  if (!rgb) return "#171717";
  let current = rgb;
  for (let step = 0; step <= 20; step += 1) {
    if (contrastRatio(current, WHITE) >= target) break;
    const t = (step + 1) / 20;
    current = rgb.map((c) => c * (1 - t));
  }
  return toHex(current);
}

/**
 * Everything the respondent form needs, as CSS custom properties.
 * Spread into a style object alongside `--primary`.
 */
export function brandContrastVars(hex) {
  if (!parseHex(hex)) return {};
  return {
    "--primary": hex,
    "--primary-foreground": readableOn(hex),
    "--brand-ink": inkOn(hex),
    // Focus rings must clear 3:1 against the white card, which the raw brand
    // often does not — reuse the darkened ink rather than the brand itself.
    "--ring": inkOn(hex, 3),
  };
}
