import { toPng } from "html-to-image";

/**
 * Copies a DOM element as a high-resolution PNG to clipboard
 * @param {HTMLElement} element - The DOM element to copy
 * @param {Object} options - Options for the copy operation
 * @param {number} options.pixelRatio - Pixel ratio for crispness (default: 2)
 * @param {string} options.backgroundColor - Background color (default: "#fff")
 * @param {string} options.fileName - Fallback filename for download
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function copyElementAsPngToClipboard(element, options = {}) {
  const {
    pixelRatio = 2,
    backgroundColor = "#fff",
    fileName = "chart.png",
  } = options;

  if (!element) {
    return { ok: false, error: "No element provided" };
  }

  try {
    // Convert element to PNG blob
    const dataUrl = await toPng(element, {
      pixelRatio,
      backgroundColor,
      quality: 1,
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.write) {
      const clipboardItem = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([clipboardItem]);
      return { ok: true };
    } else {
      // Fallback: download the PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        ok: false,
        error: "Clipboard not supported, downloaded instead",
      };
    }
  } catch (error) {
    console.error("Failed to copy chart:", error);

    // Fallback: try to download
    try {
      const dataUrl = await toPng(element, {
        pixelRatio,
        backgroundColor,
        quality: 1,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { ok: false, error: "Copy failed, downloaded instead" };
    } catch {
      return { ok: false, error: "Failed to generate image" };
    }
  }
}
