# SurveyFlow Multitenant Foundation Prompt

Read `AGENTS.md` first. Then read the reference implementation described below. Scan SurveyFlow before writing code.

Your task is to build SurveyFlow's **multitenant foundation** and **port the proven survey schema** from the MERN predecessor — storing the survey structure correctly, without yet evaluating it.

This is a **port with one deliberate schema upgrade**, not a greenfield design. Most of the domain modelling is already solved and battle-tested. Do not reinvent it.

**Out of scope — a separate prompt covers it:** the conditional-logic *runtime* (visibility and navigation evaluation), the public survey renderer, and response submission. You will store the rule data faithfully; you will not execute it.

---

## The reference implementation

`/Users/eric/Developer/survey-application` is a **complete, shipped MERN survey platform**. SurveyFlow is its rewrite in TanStack Start; `type.d.ts` carries its domain types almost 1:1.

Read before designing anything:

| Path | Why |
|---|---|
| `backend/models/survey_version.models.js` | 502 lines — the whole survey structure: sections, typed questions, validation, visibility rules, navigation rules |
| `backend/models/survey.models.js` | The survey pointer document and its publish/version fields |
| `backend/models/response.models.js` | Response storage, resume state, progress, metadata consent |
| `backend/models/recipient.models.js` | Recipient, whitelist, E.164 phone handling |
| `backend/models/user.models.js`, `company.models.js` | The **current** tenancy model — which you are deliberately changing |
| `docs/SURVEY_LOGIC_SEMANTICS.md`, `docs/PRODUCTION_SURVEY_LOGIC_ENGINE_SPEC.md` | Rule semantics. Read for schema fidelity now; the runtime is the next prompt |

### How to use the reference

**SurveyFlow is a new, cleaner application — not a transcription.** The reference is *evidence of what the domain requires*, gathered the expensive way. It is not the target architecture.

- **Inherit the lessons.** Where the reference solves a hard domain problem — version immutability, rule semantics, resume state — adopt the substance. Re-deriving these produces worse designs.
- **Do not inherit the accretion.** It was built in a 3-day MVP sprint and grew organically. It contains superseded schemas, duplicated fields, and untyped escape hatches. These are listed below; leave them behind.
- **Never discard a lesson unknowingly.** If you diverge from the reference on domain behaviour, say so in your report and give the reason. Divergence is allowed; silent divergence is not.

### Known accretion — improve on these, do not port them

| Artifact | Problem | Do instead |
|---|---|---|
| `logic: logicSchema` (line 347) coexisting with `visibilityRules[]` (line 388) | **Two generations of conditional logic in one schema.** The per-question `visibleIf` is superseded by `visibilityRuleSchema`, which also targets sections, carries `show`/`hide`, and has `priority`. Nothing documents which wins on conflict | Port **only** `visibilityRules[]`. Drop `logic`/`visibleIf` entirely |
| Branding split across `Company` and `Survey` | `logo` and `thankYouMessage` on both; `themeColor` (Survey) vs `primaryColor`/`secondaryColor` (Company); `defaultFont` only on Company. Inconsistent names, undocumented fallback | Use one vocabulary at both levels and **state the precedence rule explicitly**: survey value overrides company default, null means inherit |
| `Response.answers` as `Map` of `Mixed` | No server-side validation is possible — any value passes for any question type | Keep the `Map` shape (it is right), but validate each answer against its question's `type` and `validation` block on write |
| Denormalized `recipientName` / `recipientPhone` / `recipientEmail` on `Response` | Duplicated PII across collections; makes right-to-erasure a multi-collection sweep | Justify per field or drop. If kept for search, document them as an erasure target |
| `Survey.isUpdated` boolean | A UI concern leaking into the schema; meaning is undocumented | Derive from `currentVersion !== publishedVersion` instead of storing it |

Tenancy is a deliberate divergence in its own right — see Phase 1.

---

## Starting state in SurveyFlow

- `/app/surveys` renders `src/constants/surveys.ts` through a client-side `useMemo`.
- `npx tsc --noEmit` fails with **15 pre-existing errors**; `npm run check` fails with **3 pre-existing errors**. That is the baseline. Do not fix them here, and do not add to them.

---

## Build order and status

**The phase numbers below are topic labels, not execution order.** The original numbering had a dependency inversion — tenant resolution (Phase 2) and the isolation boundary (Phase 3) both need the models and connection defined in Phase 4, and tenant resolution additionally needs a session that no phase owned. Build in this order instead:

| # | Step | Phase | Status |
|---|---|---|---|
| 1 | Decisions → `docs/specs/2026-07-23-multitenant-foundation.md` | 1 | ✅ Accepted |
| 2 | Connection + `Company`, `User`, `Membership` models | 4 | ✅ Done |
| 3 | Session primitives (JWT + cookie) | — | ✅ Done |
| 4 | `requireWorkspace()` chokepoint | 2 | ✅ Done |
| 5 | Registration, login, workspace creation | 6 (part) | ✅ Done |
| 6 | `/app/:workspaceSlug/*` routing move + guard | 2 | ✅ Done |
| 7 | Isolation boundary (Mongoose plugin, fail-closed) | 3 | ✅ Done |
| 8 | Remaining models + versioning rules | 4, 5 | ✅ Done |
| 9 | **Invitations, switching, last-owner + escalation guards, audit** | 6 | ⬅ **next** |
| 10 | `listSurveys` read path | 7 | Ready |
| 11 | Cross-tenant leak tests | 8 | Blocked on 7 |

### Already built (do not rebuild)

**Server:** `src/server/db/mongoose.ts` · `src/server/models/{_shared,company,user,membership,audit-log}.*` · `src/server/auth/{session,password,require-workspace}.ts` · `src/server/workspace/create-workspace.ts`

**Features:** `src/features/workspace/{permissions,slug,server}.ts` (+ tests) · `src/features/auth/{schemas,server}.ts`

**Routes:** `src/routes/app/$workspaceSlug.tsx` (guard layout) · `src/routes/app/$workspaceSlug/{dashboard,surveys}.tsx` · auth routes wired to `registerUser` / `loginUser`

**Config:** `src/env.ts` server vars · `type.d.ts` (`User` without `companyId`/`role`, `Membership` added, `UserRole` → 4 values, `AppNavItem.pending`) · `src/constants/data.ts` (`getAppNavItems(slug)`)

### Constraints established (respect these)

- `requireWorkspace()` is the only source of `companyId`. It is reached from routes via the `getWorkspaceContext` server function in the `$workspaceSlug` layout's `beforeLoad`.
- Workspace creation uses a **compensating cleanup**, not a transaction — standalone `mongod` has no transactions. `createWorkspaceWithOwner` is the single place to swap in a real transaction on a replica set.
- Nav items for routes that do not exist yet carry `pending: true` and are filtered out of the navbar.
- **Every tenant-owned schema must call `.plugin(tenantScopePlugin)`.** It fails closed: querying one outside a tenant context throws `MissingTenantContextError`. Establish scope with `withWorkspace(slug, fn)` (authorize + scope together) or `withTenantContext(companyId, fn)`. The only escape hatch is `.setOptions({ bypassTenantScope: true })` — greppable on purpose.
- Pass `{ softDelete: true }` to the plugin for models carrying `deletedAt`.

---

## Phase 1 — Tenancy decisions (blocking)

### 1a. Multi-workspace membership — decided, implement it

The reference app is **one user, one company**: `User.companyId` is a single required ObjectId, and there is no membership, team-invitation, or workspace-switching concept anywhere in it.

SurveyFlow's mocked UI commits to the opposite, and **that is the intended product**:

| Evidence | File |
|---|---|
| `workspaceOptions` — Acme Health (Owner), CareOps East (Admin), Northstar Clinics (Analyst) | `src/constants/data.ts` |
| `WorkspaceAccountMenu` with "Switch workspace" | `src/components/shared/Navbar.tsx:622` |
| "Surveys are specific to the Acme Health workspace." | `src/routes/app/surveys.tsx:92` |
| "Workspace invite accepted — Maya joined CareOps East as an analyst" | `src/constants/data.ts` |

Introduce a **`Membership`** collection — `userId × companyId × role`, unique on the pair — and remove `companyId` and `role` from `User`. Update `type.d.ts`.

This is a deliberate upgrade over the reference, so record in the spec: what it costs, and what a future migration from single-company data would look like.

### 1b. Role vocabulary — three-way conflict, settle it

| Source | Values |
|---|---|
| Reference app (shipped) | `admin \| viewer` |
| `type.d.ts` | `owner \| admin \| member` |
| Mock UI | `Owner \| Admin \| Analyst` |

Pick one canonical set. Roles now live on `Membership`, not `User` — a user may be Owner in one workspace and Analyst in another. Produce a **permission matrix** stating for each role whether it may: create/edit surveys, publish, view responses, export CSV, invite users, change roles, edit branding, read audit logs.

### 1c. Auth provider

`.env.example` implies self-hosted JWT (`JWT_SECRET`, `JWT_EXPIRES_IN`, `AUTH_COOKIE_NAME`); the reference app uses bcrypt + JWT with a `passwordHash` field and `select: false`. The installed Clerk skills imply Clerk, whose Organizations feature would supply memberships and invitations directly.

Decide, and state explicitly whether `Membership` remains yours to own or is delegated to Clerk Organizations.

### 1d. Data sensitivity

The mock data is insistently healthcare (Acme Health, Patient Intake Form). State in the spec whether health/regulated data is a target. If yes, note the consequences now — response-level encryption, retention and erasure, access logging — even if you defer building them. If no, say so and move on.

**Run `/architect`, write the spec to `docs/specs/`, and stop for approval before Phase 2.**

---

## Phase 2 — Tenant resolution

**Commit to URL-scoped tenancy: `/app/:workspaceSlug/surveys`.** `Company.slug` already exists in `type.d.ts`. This makes links shareable, keeps the tenant explicit on every request, removes hidden session state, and eliminates a class of "wrong workspace" bugs. Note the cost honestly: every `/app/*` route moves and `src/constants/data.ts` navigation becomes slug-aware.

Requirements:

- The workspace **must never be read from a request body or any client-supplied field.** A client that can name its own `companyId` has no isolation at all.
- Resolve the slug, then **verify the caller's membership on every request** — never trust the URL alone.
- Switching workspaces re-verifies membership server-side, not just in client state.
- Document what happens when a membership is revoked mid-session.

Write one function — `requireWorkspace(request)` — returning `{ userId, companyId, role }` or throwing. **Every authenticated server function calls it. No server function derives `companyId` any other way.**

---

## Phase 3 — Isolation at a chokepoint

Do not rely on remembering `{ companyId }` in every query. That discipline fails silently and the failure is a cross-tenant leak.

Build one enforced boundary — preferred order:

1. A Mongoose plugin applying a `companyId` filter to every `find`/`update`/`delete` on tenant-owned models, from an explicit per-request context.
2. A repository layer where tenant-owned models are reachable only through functions taking `companyId` as a required first argument.

Make the unsafe path hard to take: a raw model export that bypasses the boundary should be impossible or obviously named as such.

**Tenant-owned (auto-scoped):** `Survey`, `SurveyVersion`, `Recipient`, `Response`, `Communication`, `AuditLog`.

**Not auto-scoped:** `Company` (it *is* the tenant), `User` (a person exists across workspaces), and — **corrected during implementation** — `Membership`.

> `Membership` was originally listed as tenant-owned. It cannot be: it is the collection that *establishes* the scope, so scoping it by the scope it produces is circular. `requireWorkspace` must read it before any tenant context exists, and `listMyWorkspaces` deliberately spans workspaces. Its invariant is instead: **always queried by `userId` (the caller's own, taken from the session) or an explicit `companyId`** — never unfiltered.

---

## Phase 4 — Connection and models

Create `src/server/db/mongoose.ts` per `docs/database.md`:

- **Cache the connection promise on `globalThis`.** Netlify Functions cold-start and Vite HMR re-evaluates modules; a naive `mongoose.connect()` per call exhausts the pool.
- Read `MONGODB_URI` through `src/env.ts` (add it to the `server` block with Zod validation). Never touch `process.env` or `.env` directly.
- Fail loudly at call time if missing, but **not** at import time — local startup must work without a database (`docs/production-rules.md`).

Create models under `src/server/models/`. **Guard registration** with `mongoose.models.X ?? mongoose.model("X", schema)` or HMR throws `OverwriteModelError`.

### Port these faithfully from the reference

**`Survey`** — the pointer document, not the content:
`companyId`, `title`, `description`, `status: draft|published|closed`, `publicId` (unique, URL-safe), `logo`, `themeColor`, `thankYouMessage`, `showProgress`, `oneResponsePerRecipient`, `captureMetadata`, **`currentVersion`**, **`publishedVersion`**.

Two deliberate changes from the reference here:

- **`access` replaces `isWhitelistEnabled`** — `access: "open" | "whitelist"`, default `"open"`. An enum rather than the reference's boolean: it reads better at call sites, maps directly to the UI's per-mode label, and stays additive if a third mode ever returns. Migrating reference data is trivial: `false → "open"`, `true → "whitelist"`.
  **`"Passcode"` is dropped** (spec Decision 6) — it was invented by the mock UI, exists nowhere in the reference, and a shared secret is strictly worse than the per-recipient tokens below. Remove it from four places: `src/constants/surveys.ts` lines 12 (union), 88 (mock row), 153 (filter option), and `src/features/surveys/surveys-table.tsx` line 52 (`accessIcon` map).
- **Drop `isUpdated`** — derive it from `currentVersion !== publishedVersion`.
- **Add `deletedAt`** to `Survey` and `Recipient` for soft delete. The Phase 3 boundary must filter `deletedAt: null` by default so deleted rows are invisible without an explicit opt-in. A survey deletion never hard-deletes its responses.

**`SurveyVersion`** — the **immutable content snapshot**. This is the single most important thing you are porting. It carries:

- `sections[]` — `id`, `title`, `description`, `order`, `questionIds[]`, `required`, `randomizeQuestions`, `pageBreak`
- `questions[]` — `id`, `type` (`short_text | long_text | single_choice | multiple_choice | dropdown | rating | date`), `title`, `helpText`, `required`, `sectionId`, `order`, `options[]`, `allowOther` (valid only for the three choice types)
- `validation` — `minLength`, `maxLength`, `minSelections`, `maxSelections`, `pattern` (regex-validated), `predefinedPattern` (`email|phone|url|numeric|integer|alphanumeric`), `customMessage`
- `visibilityRules[]` — `id`, `targetType: section|question`, `targetId`, `effect: show|hide`, `when { questionId, operator, value }`, `priority`
- `navigationRules[]` — `id`, `fromSectionId` (null = any), `when` (supports `all`/`any`/`not` groups and `always`), `action { type: jump|terminate|skip|jump_to_question, targetSectionId, targetQuestionId, skipCount }`, `priority`

Store and validate these. **Do not implement the evaluator.**

Port `visibilityRules[]` **only** — the reference's legacy per-question `logic.visibleIf` is superseded and must not come across. Replace the reference's `Mixed`-typed `navigationRule.when` with a properly typed condition schema (Zod at the boundary, a discriminated shape in Mongoose); the custom validator function it uses today is a workaround for the missing type.

**`Response`** — `surveyId`, **`surveyVersion`** (stamped, required), `companyId`, optional `recipientId`, `respondentIdentifier` (hashed phone/email for whitelisted surveys), `answers` as a **`Map` keyed by questionId** (not an array), `responseStatus: in_progress|completed`, `lastSavedAt`, `progress { answeredCount, totalQuestions, percentComplete }`, `navigation { currentSectionIndex, history[], jumpChain[], currentQuestionId, questionFlowHistory[], sectionEntryQuestionId }`, `metadata { ip, userAgent, locale, geo, consented }`, denormalized `recipientName/Phone/Email`, `startedAt`, `submittedAt`, `completionTime`, `device`.

**`Recipient`** — `surveyId`, `companyId`, `name`, `phone` (E.164-validated), `email`, `status: pending|invited|in_progress|completed|failed`, `isBlacklisted`, `invitedAt`, `completedAt`, `createdBy`. Uniqueness is enforced as compound partial indexes on `(surveyId, phone)` and `(surveyId, email)` — not on a token.

> **Resolved in the spec (Decision 5) — implement both, they are orthogonal.** The reference has no per-recipient token: public access runs through `Survey.publicId` and the respondent self-identifies by phone or email against the whitelist, which is why `Response.respondentIdentifier` stores a *hashed* identifier. That whitelist is a **deliberate, specced access-control feature** (`docs/WHITELIST_WORKFLOW.md`, `validateAccess(survey, identifier)`), not an expedient — do not discard it.
>
> A token is not an alternative to a whitelist. The whitelist answers *may this person answer?* (authorization); the token answers *how do they reach the survey?* (delivery). Add `Recipient.token` for targeted sends: it resolves to exactly one `Recipient`, satisfies the whitelist check implicitly, keeps PII out of the URL, and spares the respondent re-entering it. **Port `validateAccess` as the fallback** for a lost or forwarded link.
>
> Add `token` (unique, with an expiry policy) to `Recipient` and keep `type.d.ts` in step.

**`Company`** — `name`, **`slug` (unique — required for Phase 2)**, `logo`, `primaryColor`, `secondaryColor`, `defaultFont`, `thankYouMessage`.

**`User`** — `name`, `email` (unique), `passwordHash` (`select: false`), `isActive`, `preferences`, `lastLoginAt`, verification/reset token fields. **No `companyId`, no `role`** — those move to `Membership`.

**New in SurveyFlow:** `Membership` (Phase 1a) and `AuditLog` (`docs/database.md`; absent from the reference).

Indexes at minimum: `companyId` on every tenant-owned model; `Survey.companyId + status`; `Survey.publicId` (unique); `Company.slug` (unique); `Membership.userId + companyId` (unique); `Recipient` compound partial-unique on `(surveyId, phone)` and `(surveyId, email)`; `Response.surveyId`; `Response.responseStatus`.

Add a `toJSON` transform mapping `_id` → `id` with ISO date strings so documents serialize to the ambient `type.d.ts` shapes.

**Reconcile `SurveyStatus`** — SurveyFlow currently holds three conflicting definitions: `type.d.ts` (`draft|published|archived`), `src/constants/surveys.ts` (`published|draft|closed`), `src/constants/dashboard.ts` (`active|draft|closed`). The reference ships `draft|published|closed`. Adopt it unless the spec argues otherwise, and update all three call sites.

---

## Phase 5 — Versioning rules

Getting this wrong corrupts historical data irreversibly.

- Editing a **draft** survey mutates the current `SurveyVersion` in place.
- **Publishing** freezes the version and sets `publishedVersion`.
- Editing an **already-published** survey creates a **new** version; it does not mutate the published one.
- Every `Response` stamps the `surveyVersion` it was answered against, and analytics and exports must read questions from **that** version, never from the current one.
- Public respondents are always served `publishedVersion`, never a draft.

Write Vitest coverage for these transitions. They are pure logic and need no database.

---

## Phase 6 — Tenant lifecycle

- **Registration creates a workspace**: a new user with no invitation gets a `Company` (with a unique slug) plus an owner `Membership`, atomically. A half-created tenant must be unreachable — use a transaction or a compensating cleanup, and say which.
- **Invitations**: invite by email with a role, scoped to exactly one workspace, expiring.
- **Workspace switching**: server-verified against membership.
- **Guards**: the last owner of a workspace cannot be removed or demoted; no member may escalate their own role.
- **Audit log**: every membership change, role change, and invitation writes an `AuditLog` row scoped to its workspace.

---

## Phase 7 — First tenant-scoped read path

Create `src/features/surveys/server.ts` with `listSurveys`.

- Take `{ userId, companyId, role }` from `requireWorkspace` — never from input.
- **Validate input with Zod**, mirroring `SurveyFiltersState` in `src/features/surveys/surveys-filters.tsx`.
- **Never return an unbounded list.** Paginate with a hard maximum page size.
- Validate ids with `mongoose.isValidObjectId`.
- Wrap the handler in `Sentry.startSpan({ name: "listSurveys" }, ...)` per `.cursorrules`.

### The shape mismatch you must solve

`SurveyRow` (what the table renders) is not `Survey` (what the database stores):

| `SurveyRow` field | Source |
|---|---|
| `name`, `status`, `updatedAt` | direct from `Survey` (`title` → `name`) |
| `responses`, `completionRate` | **aggregate** over `Response` — tenant-scoped, and read from the stamped version |
| `owner.name`, `owner.initials` | **join** to `User` via `createdBy`, constrained to workspace members |
| `access` | `Survey.access` enum — **not** derivable from the reference's boolean; see below |
| `icon` | a `LucideIcon` React component — **cannot come from the database** |

Resolve `icon` client-side by mapping `category` → icon. Never store or serialize a component.

**Do not recompute counts on every list render.** Denormalize response counters onto `Survey`, updated on submit, following the reference's `Response.progress` precedent.

Then wire `src/routes/app/surveys.tsx` (now `/app/:workspaceSlug/surveys`) to this function instead of `src/constants/surveys.ts`: use a Router `loader` or Query `queryOptions` (the Query client is already SSR-integrated in `src/router.tsx`), move filter state into **URL search params**, and delete the redundant `useMemo`. Leave `src/constants/surveys.ts` on disk — the dashboard still imports its own mock data.

---

## Phase 8 — Prove isolation

Isolation that is not tested does not exist.

**Vitest** (no database): the permission matrix, the Zod filter schema, the version-transition rules from Phase 5, the `Survey` → `SurveyRow` mapper, the `toJSON` transform.

**Cross-tenant leak tests — required.** Seed two workspaces with overlapping data. For **every** tenant-owned model, assert a member of workspace A cannot read, update, or delete a workspace B record — by id, by filter, or through pagination. Include a user who is a member of **both**, and assert they see only the active workspace's data.

**Playwright**: sign in, land in a workspace, switch workspaces, confirm the surveys list changes and the URL slug changes with it. Run `npx playwright install chromium` first.

If a test needs live MongoDB, add reproducible setup or mock at the model boundary — and say which.

---

## Do not

- Implement the visibility or navigation **evaluator** — schema only; the runtime is the next prompt.
- Build the public survey renderer or response submission.
- Read `companyId`, `userId`, or `role` from client input, ever.
- Add a tenant-owned collection that bypasses the Phase 3 boundary.
- Mutate a published `SurveyVersion`.
- Create an API route for any of this — `AGENTS.md` §9 reserves those for webhooks, health checks, and file responses.
- Read `.env` directly; go through `src/env.ts`.
- Delete `src/constants/*.ts` — other pages still depend on them.
- Edit `src/routeTree.gen.ts`. Import from `next/*`.
- Fix the 15 TypeScript or 3 Biome pre-existing errors as a side effect.
- Reformat files you did not otherwise change.

---

## Verify

```bash
nvm use
npm run format
npm run check          # expect the SAME 3 pre-existing errors, no more
npx tsc --noEmit       # expect the SAME 15 pre-existing errors, no more
npm run test
npm run build
```

Then run `/check verify` and review `git status` and `git diff`.

---

## Definition of done

- `docs/specs/` holds the approved decisions: membership model and migration cost, role vocabulary and permission matrix, auth provider, data-sensitivity stance.
- `User` no longer carries `companyId`/`role`; `Membership` expresses one user in many workspaces with per-workspace roles.
- One canonical `UserRole` and one canonical `SurveyStatus` across `type.d.ts` and `src/constants/*`.
- `requireWorkspace` is the **only** source of `companyId`; routes are `/app/:workspaceSlug/*`.
- Tenant-owned queries are scoped by an enforced boundary, not per-query discipline.
- `SurveyVersion` stores sections, typed questions, validation, visibility rules, and navigation rules faithfully; published versions are immutable; every `Response` stamps its version.
- Registration creates workspace + owner membership atomically; invitations, switching, last-owner and escalation guards work and are audit-logged.
- `/app/:workspaceSlug/surveys` renders database rows for the active workspace with filters in the URL.
- **Cross-tenant leak tests pass for every tenant-owned model.**
- The verification gate shows **no new** failures against the recorded baseline.
- Your report states what changed, what you ran, what passed, what failed, and every assumption made — especially anything decided because this prompt did not specify it.
