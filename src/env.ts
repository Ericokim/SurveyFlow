import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Vite only exposes `VITE_`-prefixed variables through `import.meta.env`.
 * Server-only variables (MONGODB_URI, JWT_SECRET, …) live on `process.env`,
 * which exists during SSR and inside Netlify Functions but not in the browser
 * bundle — hence the guard.
 */
const runtimeEnv: Record<string, string | undefined> = {
  ...import.meta.env,
  ...(typeof process !== "undefined" ? process.env : {}),
};

export const env = createEnv({
  server: {
    SERVER_URL: z.url().optional(),

    /**
     * Optional at import time so the app still boots locally without a
     * database (docs/production-rules.md). `connectToDatabase()` throws a
     * clear error if it is missing when a query is actually attempted.
     */
    MONGODB_URI: z.string().min(1).optional(),

    /** Optional at import time; session helpers throw if it is missing. */
    JWT_SECRET: z.string().min(32).optional(),
    JWT_EXPIRES_IN: z.string().default("7d"),
    AUTH_COOKIE_NAME: z.string().default("surveyflow_session"),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: "VITE_",

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  runtimeEnv,

  /**
   * Treat `FOO=` as undefined so optional variables fall back to their
   * defaults instead of failing validation on an empty string.
   */
  emptyStringAsUndefined: true,
});
