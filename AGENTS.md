# AGENTS.md

You are a **senior full-stack engineer** working on **SurveyFlow**, a multitenant survey platform.

This file is the project handbook. Read it before changing anything. Every statement here was verified against the repository. Where something is **planned but not built**, this file says so explicitly — do not describe planned architecture as if it exists, and do not assume that an installed dependency or agent skill means the feature is implemented.

---

# 1. Product

SurveyFlow is a multitenant survey platform for branded surveys, controlled distribution, analytics, CSV exports, and client workspaces.

Intended users:

- **Workspace owners / admins** — create surveys, manage users and branding, view analytics
- **Members** — build and edit surveys, review responses
- **Recipients** — receive a survey link (email or SMS) and submit responses without an account

Intended feature areas (`docs/features.md`): Auth, Workspace, Surveys, Renderer, Recipients, Responses, Analytics, Communications, Audit.

## 1.1 Current maturity — read this first

**SurveyFlow is currently a UI-first prototype.** The front end is real; the back end does not exist yet.

Verified as of this writing:

- There are **no server functions**. `createServerFn` appears nowhere in `src/`.
- There are **no API route handlers**. No route file declares `server.handlers`.
- There is **no `src/server/` directory**, no database connection, and no Mongoose models.
- There is **no authentication**. The sign-in and register forms validate with Zod and then call `navigate({ to: "/dashboard" })`. Nothing is authenticated, authorized, or persisted.
- There is **no multitenancy implementation**. Tenant fields exist only as ambient TypeScript types.
- There are **no tests** in `src/`.
- Every page renders **hardcoded mock data** exported from `src/constants/*.ts`.

Treat this as the baseline. Whoever builds the first real backend slice establishes the conventions the rest of the app will copy — follow sections 8–12 and update this file with `/sync`.

---

# 2. Technology stack

Three categories. Do not blur them.

## 2.1 Actually used by the application

| Technology | Where |
|---|---|
| TanStack Start (SSR) | `vite.config.ts` (`tanstackStart()`), `src/router.tsx` |
| TanStack Router (file-based) | `src/routes/`, `src/routeTree.gen.ts` |
| TanStack Query | `src/integrations/tanstack-query/root-provider.tsx`, SSR-wired in `src/router.tsx` |
| TanStack Table | `src/hooks/useDataTable.tsx`, `src/components/shared/Table/` |
| TanStack Form | `src/routes/auth/login.tsx`, `src/routes/auth/register.tsx` |
| React 19 + React Compiler | `@vitejs/plugin-react` + `babel-plugin-react-compiler` in `vite.config.ts` |
| TypeScript 6 (strict) | `tsconfig.json` |
| Vite 8 | `vite.config.ts` |
| Tailwind CSS v4 | `src/styles.css` (CSS-first config; there is no `tailwind.config`) |
| shadcn/ui (new-york, zinc, lucide) | `components.json`, `src/components/ui/` |
| Zod v4 | auth form schemas, `src/env.ts` |
| `@t3-oss/env-core` | `src/env.ts` |
| Radix UI | via shadcn primitives (14 files) |
| framer-motion | 4 files (auth shell, navbar) |
| lenis | smooth scroll in `src/routes/__root.tsx` |
| recharts | `src/features/dashboard/responses-over-time-chart.tsx` |
| Biome 2.4.5 | `biome.json` |
| Vitest 4 | `vitest.config.ts` (no test files yet) |
| Playwright | `playwright.config.ts`, `tests/` (seed spec only) |
| Netlify | `netlify.toml`, `@netlify/vite-plugin-tanstack-start` |

## 2.2 Installed but currently unused

Dependencies with **zero imports in `src/`**. They signal intent, not implementation:

`mongoose`, `jsonwebtoken`, `bcryptjs`, `twilio`, `papaparse`, `uuid`, `libphonenumber-js`, `@faker-js/faker`, `@tanstack/react-store`, `@tanstack/match-sorter-utils`, `date-fns`.

Sentry (`@sentry/tanstackstart-react`) is a special case: `instrument.server.mjs` exists and is preloaded by `npm run dev`, but **no `src/` file imports Sentry**. See section 21.

## 2.3 Not used at all

- **Clerk** — not a dependency, not imported. Clerk skills are installed for *future approved* auth work only (section 20).
- **Vercel AI SDK** — not a dependency, not imported. SurveyFlow has no AI features and none are planned in `docs/`.
- **Firebase** — deliberately excluded. Do not add Firebase dependencies, skills, plugins, or MCP integrations.
- **Next.js** — never import from `next/*`. This is a TanStack Start app.

---

# 3. Repository structure

```
AGENTS.md                  this handbook
CLAUDE.md                  operational rules for coding agents (points here)
README.md                  TanStack Start starter docs (largely boilerplate)
package.json               npm only; Node >= 22.12.0
biome.json                 lint/format config; ignores .agents, .claude, .codex
tsconfig.json              strict; `@/*` -> `./src/*`
vite.config.ts             devtools, netlify, tailwind, tanstackStart, react, react-compiler
vitest.config.ts           unit tests; excludes tests/** (Playwright's dir)
playwright.config.ts       e2e; testDir ./tests, baseURL localhost:3000
tsr.config.json            TanStack Router generator target
components.json            shadcn config (new-york, zinc, lucide, cssVariables)
netlify.toml               build/publish/Node config
instrument.server.mjs      Sentry server init, preloaded by `npm run dev`
type.d.ts                  AMBIENT GLOBAL domain types (no import needed)
image.d.ts                 image module declarations
.env.example               variable names only
docs/                      architecture/feature/rule notes + agentic specs and plans
.agents/skills/            installed agent skills (source of truth)
.claude/skills/            symlinks into .agents/skills
.claude/agents/            Playwright subagents (planner, generator, healer)
.codex/                    Codex agents, commands, rules, memory, skills
.mcp.json                  playwright-test MCP server
skills-lock.json           skill provenance + content hashes
tests/                     Playwright e2e specs (seed only)
```

## 3.1 `src/` layering — enforced

- `src/routes/` — pages and API endpoints **only**. Keep them thin.
- `src/features/<area>/` — product logic, schemas, services, server functions, feature-local components.
- `src/server/` — **does not exist yet.** Create it when backend work begins: database connection, Mongoose models, auth primitives.
- `src/components/ui/` — generated shadcn components **only**. Add with `npx shadcn@latest add <name>`.
- `src/components/shared/` — hand-written reusable app components (`Navbar`, `AuthPageShell`, `Table/`, `inputs/`, `LandingPage/`, `Marquee`).
- `src/constants/` — currently the mock-data layer (`auth`, `dashboard`, `data`, `landing`, `surveys`).
- `src/hooks/` — `useDataTable`, plus `useSorting` / `useDebouncedValue` / `useStickyScrollbar` in `useHooks.tsx`.
- `src/integrations/` — third-party setup (TanStack Query provider and devtools).
- `src/lib/utils.ts` — `cn()` only.

Use `@/` for app imports. Prefer small, typed modules. Do not add a broad abstraction before there are two real callers.

---

# 4. Entry points and routing

- **Root document**: `src/routes/__root.tsx` uses `createRootRouteWithContext<{ queryClient }>` and a `shellComponent` that renders the entire `<html>` document, wraps children in `ReactLenis`, and mounts TanStack Devtools.
- **Router factory**: `src/router.tsx` — `getRouter()` builds the router with `defaultPreload: "intent"`, `scrollRestoration: true`, and calls `setupRouterSsrQueryIntegration({ router, queryClient })`.
- **Route tree**: `src/routeTree.gen.ts` is **generated**. Never edit it. Regenerate with `npm run generate-routes`; the Vite plugin also regenerates during `dev`/`build`. It is excluded from Biome.

## 4.1 Routes that actually exist

| Path | File | Protection |
|---|---|---|
| `/` | `src/routes/index.tsx` | public landing page |
| `/auth/login` | `src/routes/auth/login.tsx` | public |
| `/auth/register` | `src/routes/auth/register.tsx` | public |
| `/dashboard` | `src/routes/dashboard.tsx` | **unprotected** (should be protected) |
| `/app/surveys` | `src/routes/app/surveys.tsx` | **unprotected** (should be protected) |

There are **no protected routes** — no `beforeLoad` guard exists anywhere.

## 4.2 Routing inconsistency — known issue

`src/constants/data.ts` navigation points at routes that **do not exist**: `/app/dashboard`, `/app/templates`, `/app/contacts`, `/app/analytics`, `/app/workspace/branding`, `/app/workspace/users`, `/app/workspace/audit-logs`, `/app/profile`, `/app/support`.

The dashboard lives at `/dashboard`, not `/app/dashboard`, so the app navbar's dashboard link is dead. When building these pages, settle on the `/app/*` namespace and move `/dashboard` to `/app/dashboard`.

---

# 5. Product flows

## 5.1 Built (UI only, no persistence)

- **Landing page** — hero, features, templates, pricing, resources, marquee; section-scroll navigation.
- **Sign in / Register** — `AuthPageShell` split layout, TanStack Form + Zod, password visibility toggle, Google button (non-functional), redirect to `/dashboard` on submit.
- **Dashboard** — metric cards, recent surveys table, top performing surveys, responses-over-time chart. All data from `src/constants/dashboard.ts`.
- **Surveys list** — filter bar (search, status, owner, access, date range) plus a sortable, paginated, selectable table with row actions. Filtering is a client-side `useMemo` over `src/constants/surveys.ts`.

## 5.2 Not built

Survey creation, the survey editor, question and section configuration, conditional logic, publishing, public survey completion, response submission, response analysis, contacts, templates, settings, workspace management, exports, sharing/QR, audit logging, and communications (email/SMS).

**Do not describe any of these as existing.** There is also no legacy MERN implementation in this repository to preserve.

---

# 6. Survey logic engine

**Not implemented.** There is no renderer, no navigation engine, no visibility-rule evaluation, no required-question handling, no branching, and no response persistence.

`type.d.ts` declares the intended shapes only: `Survey` (with `questions: SurveyQuestion[]`), `SurveyQuestion` (`id`, `type`, `label`, `required`, `options?`), `SurveyAnswer` (`questionId`, `value`), and `SurveyResponse` (`answers`, `submittedAt`).

When this engine is built, record the design decision first (`/architect`), and keep rule evaluation pure and unit-testable, separate from React rendering.

---

# 7. Authentication and authorization

**Not implemented.** There is no auth provider, no session, no cookie handling, no guard, no role check, and no ownership check.

What exists:

- Zod-validated sign-in and register forms whose `onSubmit` does `void value; navigate({ to: "/dashboard" })`.
- `.env.example` placeholders for a JWT approach: `JWT_SECRET`, `JWT_EXPIRES_IN`, `AUTH_COOKIE_NAME`.
- `jsonwebtoken` and `bcryptjs` installed but unused.
- `UserRole = "owner" | "admin" | "member"` declared in `type.d.ts`.

**The provider is undecided.** `.env.example` implies self-hosted JWT; the installed Clerk skills imply Clerk. These conflict. Do not pick one unilaterally — run `/architect` and get the decision approved before writing auth code.

Non-negotiable once auth exists:

- Validate the session **server-side** in every protected server function and route handler.
- Never trust a client-supplied user id, company id, or role.
- Guard `/dashboard` and every `/app/*` route.
- Keep public survey-completion endpoints public but token-scoped and rate-limited.

---

# 8. MongoDB and Mongoose

**Not implemented.** `mongoose@9` is installed with zero imports. `docs/database.md` specifies the intended connection location: `src/server/db/mongoose.ts`.

Planned collections (`docs/database.md` + `type.d.ts`): `Company`, `User`, `Survey`, `Recipient`, `Response`, `Communication`, `AuditLog`.

Rules for when this is built:

- **One connection, reused.** Cache the connection promise on `globalThis` so Netlify Function invocations and Vite HMR do not open a new pool per request.
- **Register models once.** Use `mongoose.models.X ?? mongoose.model("X", schema)` to avoid `OverwriteModelError` on hot reload.
- **Scope every tenant-owned query by `companyId`.** Never issue an unscoped `find` on `Survey`, `Response`, `Recipient`, `Communication`, or `AuditLog`.
- Validate identifiers (`mongoose.isValidObjectId`) before querying.
- No unbounded queries — always paginate or limit list reads.
- Index at minimum `companyId`, `Survey.companyId + status`, `Recipient.token` (unique), and `Response.surveyId`.
- Handle duplicate-key (E11000) errors explicitly instead of letting them surface as 500s.
- Serialize to the ambient `type.d.ts` shapes (`id: string`, ISO date strings) at the feature boundary — never leak Mongoose documents to the client.
- Never run destructive commands against a non-local database. Schema changes that drop or rewrite data need explicit approval.

Local setup: `MONGODB_URI=mongodb://127.0.0.1:27017/surveyflow`.

---

# 9. API and server architecture

These rules predate the implementation and still stand:

- **Server functions (`createServerFn`) are the default** for normal app queries and mutations.
- **API routes are reserved** for health checks, Twilio webhooks, CSV/file responses, and external callbacks. Declare them with `server.handlers` inside a route file.
- **Never duplicate CRUD** between a server function and an API route.
- Validate every server input with Zod at the feature boundary.
- Authenticate, then authorize, then query — in that order, server-side.
- Keep secrets server-side. Anything prefixed `VITE_` ships to the browser.
- Instrument server functions with Sentry (`Sentry.startSpan({ name }, async () => { ... })`) once Sentry is actually wired into `src/`.

---

# 10. State management

| Kind of state | Where it belongs | Status |
|---|---|---|
| Server data | TanStack Query, SSR-integrated via `src/router.tsx` | provider wired, **no queries written yet** |
| Route-level data | TanStack Router loaders | none used yet |
| Table state | `useDataTable` (sorting, filters, visibility, row selection, pagination) | in use |
| Local UI state | `useState` in the route or feature component | in use (surveys filters) |
| Form state | TanStack Form | in use |
| URL state | Router search params | **not used** — surveys filters are `useState`, so they are lost on reload and unshareable |
| Global client store | `@tanstack/react-store` installed but unused | avoid until there is a real need |

There is no React Context and no Zustand in this project.

---

# 11. UI architecture

## 11.1 Components

- shadcn primitives in `src/components/ui/` are the **first choice** before any custom control.
- Reusable app components live in `src/components/shared/`.
- Feature-specific components live in `src/features/<area>/`.
- Route files stay thin: layout, composition, page-level state.

## 11.2 Tables

`useDataTable` (`src/hooks/useDataTable.tsx`) owns all TanStack Table state and returns `{ table }`. Feature components define `ColumnDef[]` in a `useMemo`, use `DataTableColumnHeader` for sortable headers, and render `<DataTable table={table} />` from `@/components/shared/Table`.

`DataTableConfig.tsx` augments TanStack's `ColumnMeta` with `label?: string`, used by the view-options dropdown and as a header fallback. `DataTable` supports `emptyMessage`, `itemLabel`, `actionBar` (rendered only when rows are selected), `pageSizeOptions`, and `showPagination`.

## 11.3 Styling

Tailwind v4 with CSS-first config in `src/styles.css`: oklch tokens under `:root` and `.dark`, exposed through `@theme inline`.

**Always use semantic tokens**, never raw colors:

```
bg-background  bg-card  bg-primary  bg-secondary  bg-muted  bg-accent
text-foreground  text-muted-foreground  text-primary  text-primary-foreground
border-border  ring-ring  text-chart-1 … text-chart-5
```

Merge classes with `cn()` from `@/lib/utils`. Do not hardcode brand hex values in TSX. Avoid nested cards. Keep radius and spacing consistent with shadcn. Icons come from `lucide-react`.

A `.dark` token set exists but **no theme toggle is implemented** — dark mode is unreachable at runtime.

## 11.4 Accessibility expectations

Enforced by `.codex/agents/accessibility-auditor.md` and the project UI skills; target WCAG 2.1 AA:

- One clear `h1` per page
- Every input has a connected label plus `id`, `name`, `type`, and appropriate `autoComplete`
- Buttons have visible text or `aria-label`
- Decorative icons are `aria-hidden="true"`
- Visible keyboard focus states; never rely on color alone
- Respect reduced motion (`useReducedMotion` with framer-motion)
- Responsive with no horizontal overflow; comfortable touch targets
- Sortable table headers expose `aria-sort` (already handled in `DataTable`)

---

# 12. Forms and validation

- **Library**: TanStack Form (`useForm`) with `validators: { onSubmit: zodSchema }`.
- **Fields**: render through `TanStackFormField` / `FormFieldType` from `@/components/shared/inputs/custom-form-field.tsx`. Supported types: `INPUT`, `PASSWORD` (with visibility toggle), `CHECKBOX`.
- **Schemas**: Zod v4, colocated with the form today. Move to `src/features/<area>/schemas.ts` and share with the server once server functions exist.
- **Client validation is not validation.** Every server function must re-validate its input with the same schema.
- Disable the submit control while `isSubmitting` to prevent duplicate submissions (not implemented anywhere yet).
- Normalize at the boundary: `.trim()` strings, lowercase emails, `libphonenumber-js` for phone numbers when recipient work begins.

---

# 13. AI features

**SurveyFlow has no AI functionality.** No AI SDK dependency, no provider keys, no prompts, no streaming.

The `ai-sdk` agent skill is installed for reference only. **Installing it does not authorize adding AI features.** If AI work is ever approved: keep provider keys server-side, never send survey responses or PII to a model without an explicit product decision, validate model output with Zod, and provide deterministic fallbacks for streaming failures.

---

# 14. Testing

## 14.1 Current state

There are **zero tests in `src/`**. `tests/seed.spec.ts` is Playwright's generated seed (navigates to `/`, asserts the title).

## 14.2 Split of responsibilities

| Runner | Owns | Config |
|---|---|---|
| Vitest + Testing Library + jsdom | unit and component tests under `src/` | `vitest.config.ts` (excludes `tests/**`) |
| Playwright | end-to-end browser specs under `tests/` | `playwright.config.ts` (`testDir: ./tests`) |

The exclusion matters: without it Vitest collects Playwright specs and the suite fails.

## 14.3 Playwright agents

`npx playwright init-agents --loop=claude` generated three Claude subagents in `.claude/agents/` — `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer` — backed by the `playwright-test` MCP server declared in `.mcp.json`. The planner explores the running app and saves a plan, the generator drives the browser and writes specs, the healer debugs failures.

Browsers are **not downloaded yet**. Run `npx playwright install chromium` before the first real e2e run. `playwright.config.ts` starts `npm run dev` on port 3000 automatically via `webServer`.

## 14.4 Expectations for new work

- New pure logic (survey rule evaluation, serialization, filtering) ships with Vitest tests.
- New user-facing flows get a Playwright spec covering the happy path plus one failure path.
- Prefer accessible roles and labels as selectors; avoid brittle CSS selectors.
- Never delete or skip a failing test to obtain a green run.

---

# 15. Development commands

Verified from `package.json` and configs:

```bash
nvm use                    # Node 22 (.nvmrc); engines requires >= 22.12.0
npm install                # npm only — never pnpm or yarn

npm run dev                # dev server on :3000, loads .env.local + Sentry preload
npm run build              # vite build -> dist/client + dist/server
npm run preview            # preview the production build (alias: npm start)

npm run check              # biome check (lint + format + import sorting)
npm run lint               # biome lint
npm run format             # biome format --write

npm run test               # vitest run --passWithNoTests
npm run generate-routes    # tsr generate (rewrites src/routeTree.gen.ts)
```

There is no `typecheck` script, and `vite build` does **not** type check. Use:

```bash
npx tsc --noEmit            # type check
npx playwright test         # e2e (needs `npx playwright install chromium` first)
npx playwright test --list  # validate Playwright config without browsers
npx shadcn@latest add <c>   # add a shadcn primitive
```

**Verification gate before calling work complete:**

```bash
nvm use && npm run format && npm run check && npx tsc --noEmit && npm run test && npm run build
```

`npm run check` and `npx tsc --noEmit` currently fail on pre-existing issues (section 21, items 2–3). Compare against that baseline; never let your change add new failures.

---

# 16. Environment variables

Names only — never commit or print values. `.env.local` is git-ignored through the `*.local` pattern.

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `VITE_APP_TITLE` | client | no | validated in `src/env.ts` |
| `SERVER_URL` | server | no | validated in `src/env.ts`; URL format |
| `VITE_SENTRY_DSN` | client | no | read by `instrument.server.mjs`; Sentry warns and stays off if absent |
| `VITE_SENTRY_ORG` | client | no | not currently read by any code |
| `VITE_SENTRY_PROJECT` | client | no | not currently read by any code |
| `SENTRY_AUTH_TOKEN` | server | no | build-time source-map upload; **secret** |
| `MONGODB_URI` | server | future | **secret**; not yet read by any code |
| `JWT_SECRET` | server | future | **secret**; not yet read by any code |
| `JWT_EXPIRES_IN` | server | future | e.g. `7d` |
| `AUTH_COOKIE_NAME` | server | future | e.g. `surveyflow_session` |
| `TWILIO_ACCOUNT_SID` | server | future | **secret** |
| `TWILIO_AUTH_TOKEN` | server | future | **secret** |
| `TWILIO_PHONE_NUMBER` | server | future | E.164 format |

Only `SERVER_URL` and `VITE_APP_TITLE` are declared in `src/env.ts`. **Add each new variable to `src/env.ts`** so it is typed and validated, then import it via `import { env } from "@/env"`. The `VITE_` prefix is enforced for client variables at both type and runtime level.

Never require an optional production service (Sentry, Mongo, Twilio) for local startup.

---

# 17. Deployment

Target: **Netlify** (`netlify.toml`).

- Build command: `vite build`
- Publish directory: `dist/client`
- Node version: `22`
- Local Netlify dev proxies port 3000 on port 8888
- Server functions and API routes run as **Netlify Functions** — assume cold starts, which is exactly why the Mongo connection must be cached (section 8)
- Production environment variables live in Netlify → Site settings → Environment variables

Before a production deploy: run the full verification gate, confirm every required variable is set in Netlify, and confirm no secret is exposed under a `VITE_` prefix.

---

# 18. Security rules

- **Secrets are server-only.** Never prefix a secret with `VITE_`. Never read `.env*` files from application code — go through `src/env.ts`.
- **Never trust the client** for identity, role, tenant, or ownership. Re-derive all of them from the server-side session.
- **Scope every tenant query by `companyId`.** A missing scope is a data breach, not a bug.
- **Validate every server input with Zod**, including path and search params.
- **Validate ObjectIds** before they reach a query. Never interpolate user input into a query object shape (NoSQL injection through untyped `$` operators).
- **Public survey endpoints** (recipient token → survey render → response submit) are the largest attack surface: rate-limited, token-scoped, single-purpose, and never exposing workspace or other-recipient data.
- **Do not store tokens or passwords in `localStorage`.** Use httpOnly cookies.
- **Hash passwords with bcrypt** if the JWT approach is chosen. Never log credentials, tokens, response payloads, or PII.
- **Exports** (CSV) must be authorized and tenant-scoped before a single row is written.
- **AI prompts** must never carry private survey or response data without an explicit approved product decision.

---

# 19. Git workflow

- Branches: `master` (default), `develop`, `docunentation` (the typo is pre-existing and is the active branch — do not rename it as a side effect of unrelated work).
- Remote: `origin` → `github.com/Ericokim/SurveyFlow`.
- Commit style in history: `feat: <lowercase summary>`. Keep each commit scoped to one concern.
- **Never** merge, rebase, cherry-pick, reset, force-push, delete branches, or rewrite history unless explicitly asked.
- Inspect other branches read-only: `git show <branch>:<path>`, `git diff <branch>..HEAD --name-status`.
- Do not commit unless explicitly instructed. Review `git status` and `git diff` before reporting completion.
- If the working tree holds unrelated local changes, leave them alone and say so in your report.

---

# 20. Agent skills and configuration

`.agents/skills/` is the source of truth; `.claude/skills/` holds symlinks into it. `skills-lock.json` records provenance and content hashes. **Never delete an existing skill, agent, command, rule, or hook.**

## 20.1 Workflow skills (JavaScript-Mastery-Pro)

`architect`, `imprint`, `recover`, `remember`, `review` came from `JavaScript-Mastery-Pro/jsm-agent-skill`.
`audit`, `check`, `debug`, `develop`, `document`, `scope`, `sync`, `test` came from the newer `JavaScript-Mastery-Pro/skills`.

Typical loop: `/scope` (what) → `/architect` (how; writes `docs/specs/`) → `/develop` (build) → `/test` → `/check` → `/document` → `/sync`.

**Known conflict:** both repos ship an `architect` skill. The older one is installed and was intentionally kept; the newer suite's `/develop` and `/check` expect the newer `architect` that writes specs to `docs/specs/`. To upgrade deliberately: `npx skills add JavaScript-Mastery-Pro/skills --skill architect -y`.

## 20.2 Stack-aligned reference skills

| Skill group | Use for | Do **not** use for |
|---|---|---|
| `clerk`, `clerk-setup`, `clerk-tanstack-patterns`, `clerk-orgs`, `clerk-custom-ui`, `clerk-billing`, `clerk-webhooks`, `clerk-testing`, `clerk-cli`, `clerk-backend-api` | *future approved* auth work; `clerk-tanstack-patterns` is the correct one for this stack | describing current auth — there is none. Clerk skills for Next/Nuxt/Vue/React-Router/Expo/Swift/Android/Astro/Chrome were deliberately not installed |
| `mongodb-connection`, `mongodb-schema-design`, `mongodb-query-optimizer`, `mongodb-natural-language-querying`, `mongodb-search-and-ai`, `mongodb-mcp-setup` | designing the persistence layer, connection lifecycle, indexes | claiming the database exists. Several require the MongoDB MCP server, which is not configured |
| `ai-sdk` | reference only, if AI work is ever approved | adding AI features on your own initiative |

A skill's recommendations are generic. **Always verify them against this repository** before applying, and prefer existing project patterns over a skill's default scaffolding.

## 20.3 Codex configuration (`.codex/`) — preserve

- **Agents**: `accessibility-auditor`, `auth-ui-implementer`, `code-reviewer`
- **Commands**: `01-scan-auth-codebase` … `09-build-shared-inputs`
- **Rules** (path-scoped): `auth-ui.md`, `design-system.md`, `frontend.md`
- **Memory**: `surveyflow-auth-memory.md`
- **Skills**: `surveyflow-auth-ui`, `surveyflow-ui-ux`, plus `brand`, `design`, `design-system`, `slides`, `banner-design`, `ui-styling`, `ui-ux-pro-max`

The path-scoped rules in `.codex/rules/` apply to `src/**` and are binding: React function components, no `any`, TanStack Router `Link` for internal navigation, shadcn before custom controls, `@/` imports, no Next.js imports, no external image URLs for core product UI, thin route files, no hardcoded brand hex in TSX, no duplicate login routes, no `.env` reads.

## 20.4 Playwright agents

`.claude/agents/playwright-test-{planner,generator,healer}.md` plus `.mcp.json`. See section 14.3.

---

# 21. Known technical debt and risks

Documented, not fixed. Do not fix these as a side effect of unrelated work.

1. **Three conflicting `SurveyStatus` types.** `type.d.ts` (global) says `draft | published | archived`; `src/constants/surveys.ts` says `published | draft | closed`; `src/constants/dashboard.ts` says `active | draft | closed`. Reconcile before persistence work.
2. **15 pre-existing TypeScript errors** across `AuthPageShell.tsx` (2), `Navbar.tsx` (5), `custom-form-field.tsx` (1), `auth/login.tsx` (4), `auth/register.tsx` (3) — mostly framer-motion rejecting `ease: string` where `Easing` is required. `npx tsc --noEmit` has never been clean.
3. **3 pre-existing Biome errors** in `src/components/shared/Table/DataTableConfig.tsx` (import sorting, `noArrayIndexKey` at line 260) and `src/features/surveys/surveys-table.tsx` (import sorting, `useImportType`).
4. **Sentry is documented but not wired.** `.cursorrules` claims error collection is "configured in `src/router.tsx`" — it is not; no `src/` file imports Sentry. Only `instrument.server.mjs` initializes it, and only when `VITE_SENTRY_DSN` is set.
5. **Dead navigation links** — nine `/app/*` destinations in `src/constants/data.ts` have no route (section 4.2).
6. **`/dashboard` and `/app/surveys` are unprotected** and will stay that way until auth exists.
7. **Surveys filter state is not in the URL** — not shareable, lost on reload.
8. **Dark-mode tokens exist with no theme toggle.**
9. **Unused dependencies** (section 2.2) inflate the install and imply features that do not exist.
10. **Auth provider undecided** — `.env.example` (JWT) versus the installed Clerk skills. Unresolved.
11. **`README.md` is largely unmodified TanStack Start boilerplate**, including instructions to delete `src/routes/demo/`, which does not exist.
12. **Branch name typo** — `docunentation`.

---

# 22. Definition of done

A task is not complete until you have:

1. Inspected the relevant architecture before editing.
2. Reused existing components, hooks, schemas, constants, and utilities instead of duplicating them.
3. Followed the existing naming and layering conventions (section 3.1).
4. Kept client and server concerns separated, validating and authorizing server-side.
5. Preserved tenant scoping on every query you touched.
6. Added or updated tests for changed behaviour (Vitest for logic, Playwright for flows).
7. Run the verification gate and **read the output**: `npm run format`, `npm run check`, `npx tsc --noEmit`, `npm run test`, `npm run build`.
8. Verified responsive behaviour and accessibility for UI work.
9. Reviewed `git status` and `git diff` — only intended files changed.
10. Reported exactly what changed, what you ran, what passed, what failed, and what remains unresolved — including pre-existing failures you did not introduce.

Never claim a check passed unless you ran it and saw it pass.
