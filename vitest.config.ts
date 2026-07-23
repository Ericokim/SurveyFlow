import viteReact from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Vitest owns unit/component tests under `src/`.
 * Playwright owns end-to-end specs under `tests/` — excluded here so
 * `npm run test` does not try to execute them.
 */
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [...configDefaults.exclude, "tests/**"],
  },
});
