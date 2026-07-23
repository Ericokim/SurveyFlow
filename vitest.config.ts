import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * All tests live in `tests/`:
 *   tests/unit         — pure logic, no database
 *   tests/integration  — needs MONGODB_URI, skipped without it
 *   tests/e2e          — Playwright, owned by playwright.config.ts
 */
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
  },
});
