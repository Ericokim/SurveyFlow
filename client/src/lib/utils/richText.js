const HTML_TAG_PATTERN = /<([a-z][\w-]*)\b[^>]*>/i;
const SAFE_COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgb(a)?\([\d\s,.%]+\)|hsl(a)?\([\d\s,.%]+\)|[a-z]+)$/i;
const SAFE_FONT_SIZE_PATTERN =
  /^(\d+(\.\d+)?(px|rem|em|%)?|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i;
const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "font",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "u",
  "ul",
]);

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeUrl(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value, window.location.origin);
    if (
      ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ||
      value.startsWith("/")
    ) {
      return value;
    }
  } catch {
    return "";
  }

  return "";
}

function markdownInlineToHtml(value = "") {
  let html = escapeHtml(value);

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+|\/[^\s)]+)\)/g,
    (_match, label, href) =>
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*(.+?)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[\s(])_(.+?)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  html = html.replace(/<u>(.+?)<\/u>/g, "<u>$1</u>");

  return html.replace(/\n/g, "<br />");
}

export function looksLikeHtml(value = "") {
  return HTML_TAG_PATTERN.test(String(value || ""));
}

export function markdownToRichHtml(value = "") {
  const source = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!source) return "";

  const lines = source.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(
        `<blockquote>${quoteLines
          .map((item) => `<p>${markdownInlineToHtml(item)}</p>`)
          .join("")}</blockquote>`,
      );
      continue;
    }

    const unorderedMatch = /^[-*]\s+/.test(trimmed);
    const orderedMatch = /^\d+\.\s+/.test(trimmed);

    if (unorderedMatch || orderedMatch) {
      const tag = unorderedMatch ? "ul" : "ol";
      const items = [];

      while (index < lines.length) {
        const candidate = lines[index].trim();
        const matchesTag = unorderedMatch
          ? /^[-*]\s+/.test(candidate)
          : /^\d+\.\s+/.test(candidate);
        if (!matchesTag) break;

        items.push(
          candidate.replace(unorderedMatch ? /^[-*]\s+/ : /^\d+\.\s+/, ""),
        );
        index += 1;
      }

      blocks.push(
        `<${tag}>${items
          .map((item) => `<li>${markdownInlineToHtml(item)}</li>`)
          .join("")}</${tag}>`,
      );
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(`<p>${markdownInlineToHtml(paragraphLines.join("\n"))}</p>`);
  }

  return blocks.join("");
}

export function sanitizeRichTextHtml(value = "") {
  if (!value || typeof window === "undefined") return String(value || "");

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(
    `<div>${value}</div>`,
    "text/html",
  );
  const root = documentFragment.body.firstElementChild;
  if (!root) return "";

  const cleanNode = (node, documentRef) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return documentRef.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return documentRef.createDocumentFragment();
    }

    const tagName = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      const fragment = documentRef.createDocumentFragment();
      [...node.childNodes].forEach((child) => {
        fragment.appendChild(cleanNode(child, documentRef));
      });
      return fragment;
    }

    const normalizedTag =
      tagName === "b" ? "strong" : tagName === "i" ? "em" : tagName;
    const element = documentRef.createElement(normalizedTag);

    if (normalizedTag === "a") {
      const safeHref = sanitizeUrl(node.getAttribute("href"));
      if (safeHref) {
        element.setAttribute("href", safeHref);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (normalizedTag === "font") {
      const color = node.getAttribute("color");
      const size = node.getAttribute("size");
      if (color && SAFE_COLOR_PATTERN.test(color)) {
        element.setAttribute("color", color);
      }
      if (size && /^[1-7]$/.test(size)) {
        element.setAttribute("size", size);
      }
    }

    if (normalizedTag === "div" && node.getAttribute("data-editor-root") === "true") {
      element.setAttribute("data-editor-root", "true");
    }

    if (normalizedTag === "span" || normalizedTag === "div") {
      const style = node.getAttribute("style") || "";
      const fontSizeMatch = style.match(/font-size\s*:\s*([^;]+)/i);
      const textDecorationMatch = style.match(
        /text-decoration\s*:\s*([^;]+)/i,
      );
      const styles = [];

      if (
        fontSizeMatch?.[1] &&
        SAFE_FONT_SIZE_PATTERN.test(fontSizeMatch[1].trim())
      ) {
        styles.push(`font-size: ${fontSizeMatch[1].trim()}`);
      }
      if (
        normalizedTag === "span" &&
        textDecorationMatch?.[1] &&
        textDecorationMatch[1].toLowerCase().includes("underline")
      ) {
        styles.push("text-decoration: underline");
      }

      if (styles.length > 0) {
        element.setAttribute("style", styles.join("; "));
      }
    }

    [...node.childNodes].forEach((child) => {
      element.appendChild(cleanNode(child, documentRef));
    });

    return element;
  };

  const cleanRoot = documentFragment.createElement("div");
  [...root.childNodes].forEach((child) => {
    cleanRoot.appendChild(cleanNode(child, documentFragment));
  });

  return cleanRoot.innerHTML;
}

export function normalizeRichTextValue(value = "") {
  const source = String(value || "");
  if (!source.trim()) return "";
  return looksLikeHtml(source)
    ? sanitizeRichTextHtml(source)
    : markdownToRichHtml(source);
}

export function getRichTextPlainText(value = "") {
  const source = String(value || "");
  if (!source.trim()) return "";

  if (typeof window === "undefined") {
    return source.replace(/<[^>]+>/g, "");
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(
    `<div>${normalizeRichTextValue(source)}</div>`,
    "text/html",
  );

  return (documentFragment.body.textContent || "").replace(/\u00a0/g, " ");
}

export function getRichTextFontSize(value = "") {
  const source = String(value || "");
  if (!source.trim() || !looksLikeHtml(source) || typeof window === "undefined") {
    return "1rem";
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(source, "text/html");
  const root = documentFragment.body.firstElementChild;

  if (
    root?.tagName?.toLowerCase() === "div" &&
    root.getAttribute("data-editor-root") === "true"
  ) {
    const fontSize = root.style.fontSize?.trim();
    if (fontSize && SAFE_FONT_SIZE_PATTERN.test(fontSize)) {
      return fontSize;
    }
  }

  return "1rem";
}

export function getRichTextEditorBody(value = "") {
  const source = String(value || "");
  if (!source.trim()) return "";

  if (!looksLikeHtml(source) || typeof window === "undefined") {
    return normalizeRichTextValue(source);
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(source, "text/html");
  const root = documentFragment.body.firstElementChild;

  if (
    root?.tagName?.toLowerCase() === "div" &&
    root.getAttribute("data-editor-root") === "true"
  ) {
    return root.innerHTML;
  }

  return normalizeRichTextValue(source);
}
