# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
nvm use                 # Node 22 (see .nvmrc; engines requires >=22.12.0)
npm run dev             # dev server on :3000, loads .env.local + Sentry instrumentation
npm run build           # vite build -> dist/client (+ server bundle)
npm run test            # vitest run --passWithNoTests
npm run format          # biome format --write
npm run lint            # biome lint
npm run check           # biome check (lint + format + import sorting)
npm run generate-routes # tsr generate — regenerate src/routeTree.gen.ts manually
```

Single test: `npx vitest run src/path/to/file.test.tsx -t "test name"`.
Type check: `npx tsc --noEmit` (`vite build` does not type check).

Before considering a change complete (from `AGENTS.md`): `nvm use && npm run format && npm run check && npm run build`.

Use **npm** only — do not introduce pnpm or yarn.

## Stack

TanStack Start (SSR) + React 19 (with React Compiler via Babel) + Vite 8 + TypeScript, TanStack Router/Query/Table/Form/Store, Tailwind v4, shadcn (new-york, zinc, lucide), Biome, Vitest, Sentry, Netlify. Backend deps are installed (mongoose, jsonwebtoken, bcryptjs, twilio) but **not yet wired up**.

## Architecture

### Layering (enforced — see `docs/architecture.md`, `AGENTS.md`)

- `src/routes` — pages and API endpoints **only**; keep them thin.
- `src/features/<area>` — product logic, schemas, services, server functions, feature-local components (e.g. `src/features/surveys/surveys-table.tsx`).
- `src/server` — DB connection, Mongoose models, auth primitives. **Does not exist yet**; create it when database work begins (`src/server/db/mongoose.ts`).
- `src/components/ui` — generated shadcn components only (`npx shadcn@latest add <name>`).
- `src/components/shared` — hand-written reusable app components.
- `src/constants` — currently holds the hardcoded mock data the UI renders.
- `src/integrations` — third-party setup (TanStack Query root provider, devtools).

Import with the `@/` alias. Prefer small typed modules; don't add abstractions before there are two real callers.

### Server functions vs API routes

Normal CRUD uses `createServerFn` from `@tanstack/react-start`. API routes (`server.handlers` in a route file) are reserved for health checks, Twilio webhooks, CSV exports, raw file responses, and external callbacks. Do not duplicate CRUD across both.

### Routing

File-based via `@tanstack/react-start/plugin/vite`. `src/routeTree.gen.ts` is generated — never edit it, and it is excluded from Biome. `src/router.tsx` wires the router to the Query client (`setupRouterSsrQueryIntegration`) with `defaultPreload: "intent"`. `src/routes/__root.tsx` is a `shellComponent` that renders the whole `<html>` document, wraps children in `ReactLenis` (smooth scroll) and mounts TanStack Devtools.

Note the route tree currently mixes flat and nested paths: `/dashboard` lives at `src/routes/dashboard.tsx` while surveys lives at `src/routes/app/surveys.tsx` (`/app/surveys`).

### Current state: UI-first, no backend

Every page renders static data exported from `src/constants/*.ts` (`dashboard.ts`, `surveys.ts`, `landing.ts`, `auth.ts`, `data.ts`). Auth forms validate with Zod then just `navigate({ to: "/dashboard" })`. When adding a feature, follow the existing shape (constants → feature component → route) unless you're explicitly wiring the backend.

### Types

Domain types (`Company`, `User`, `Survey`, `SurveyResponse`, `Communication`, `AuditLog`, nav/marketing shapes) are **ambient globals** declared in `type.d.ts` at the repo root — no import needed. UI-mock types live beside their data in `src/constants` and are imported normally. Be aware these overlap: `type.d.ts` declares a global `SurveyStatus` (`draft|published|archived`) while `src/constants/surveys.ts` exports a different `SurveyStatus` (`published|draft|closed`) for the mock table.

### Tables

`useDataTable` (`src/hooks/useDataTable.tsx`) owns all TanStack Table state (sorting, filters, visibility, row selection, pagination) and returns `{ table }`. Feature components define `ColumnDef[]` in a `useMemo`, use `DataTableColumnHeader` for sortable headers, and render `<DataTable table={table} />` from `@/components/shared/Table`. `DataTableConfig.tsx` augments TanStack's `ColumnMeta` with `label?: string`, used for view-options labels and header fallbacks.

### Forms

TanStack Form + Zod: `useForm({ defaultValues, validators: { onSubmit: schema } })`, fields rendered through `TanStackFormField` / `FormFieldType` from `@/components/shared/inputs/custom-form-field.tsx` (input, password with visibility toggle, checkbox). Validate user input at feature boundaries with Zod.

### Styling

Tailwind v4, CSS-first config in `src/styles.css`: oklch design tokens under `:root` / `.dark`, exposed to Tailwind via `@theme inline`. Always use semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`, `text-chart-1`…`chart-5`) rather than raw colors. Merge classes with `cn()` from `@/lib/utils`.

### Env vars

Typed through `@t3-oss/env-core` in `src/env.ts`; client vars need the `VITE_` prefix. Import via `import { env } from "@/env"`. Secrets stay server-side. See `.env.example`; `npm run dev` loads `.env.local`.

### Sentry

Error collection is configured in `src/router.tsx`; `instrument.server.mjs` is preloaded in dev via `NODE_OPTIONS`. Instrument server functions by wrapping the handler body:

```tsx
import * as Sentry from "@sentry/tanstackstart-react";
Sentry.startSpan({ name: "Loading surveys" }, async () => { /* ... */ });
```

## Code style

Biome: double quotes, space indent, organize-imports on. `verbatimModuleSyntax` is on — use `import type` for type-only imports. `noUnusedLocals` / `noUnusedParameters` are errors; use `void x` when a binding must exist but is unused (the codebase does this).

## Deployment

Netlify (`netlify.toml`): build `vite build`, publish `dist/client`, Node 22. Server functions and API routes run as Netlify Functions. Do not require optional production services (Sentry, Twilio, Mongo) for local startup.

## Docs and skills

Short project docs live in `docs/` (`architecture.md`, `database.md`, `features.md`, `production-rules.md`, `deployment.md`); feature specs and plans in `docs/agentic/` and `docs/superpowers/plans/`. Project-local skills are in `.claude/skills/` — `architect` (plan before building), `imprint` (record UI patterns after building a component), `review`, `recover`, `remember`.
