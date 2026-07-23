# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**`AGENTS.md` is the project handbook — read it first.** It holds the verified architecture, stack, routes, conventions, environment variables, security rules, technical debt, and definition of done. This file covers *how to operate* inside SurveyFlow; it does not repeat the handbook.

---

## 1. The one thing to internalize

SurveyFlow is a **UI-first prototype**. There are no server functions, no API handlers, no `src/server/`, no database, no authentication, no multitenancy enforcement, and no tests in `src/`. Every page renders hardcoded mock data from `src/constants/*.ts`.

Installed dependencies and installed agent skills are **not** evidence a feature exists. `mongoose`, `jsonwebtoken`, `bcryptjs`, and `twilio` have zero imports. Clerk and the AI SDK are not dependencies at all. Verify in the code before you describe or build on anything.

---

## 2. Before editing

1. Read `AGENTS.md`.
2. Read the feature files you are about to touch, in full.
3. Check `package.json` for what is actually installed.
4. Check the route tree (`src/routeTree.gen.ts`, `src/routes/`) for what actually exists.
5. Search for an existing implementation before writing a new one (`Grep` for the component, hook, schema, or constant name).
6. Read the relevant tests — and note when there are none.
7. Run `git status` to see what is already modified.
8. Inspect relevant history: `git log --oneline -- <path>`, `git show <commit>`.
9. Identify the client/server boundary the change sits on.
10. Confirm the real implementation path rather than the one you assumed.

---

## 3. Implementation behaviour

- Think like a senior product engineer: understand the workflow before changing code.
- Prefer minimal, surgical changes. Preserve working architecture.
- Reuse existing components, hooks, services, models, schemas, and utilities.
- Follow the existing naming and layering conventions (`AGENTS.md` §3.1).
- Keep client and server concerns separated.
- Preserve tenant isolation; validate every server input; authorize server-side.
- Avoid speculative abstractions — no broad abstraction before two real callers.
- Avoid unrelated cleanup. If you spot a problem outside your scope, document it instead of fixing it.
- Add tests for behaviour you change.

## 3.1 Project-specific constraints

- **npm only.** Never introduce pnpm or yarn.
- **Never edit `src/routeTree.gen.ts`** — it is generated (`npm run generate-routes`).
- **Never import from `next/*`.** This is TanStack Start.
- Generated shadcn components belong in `src/components/ui/` and nowhere else.
- Use `@/` for app imports.
- `verbatimModuleSyntax` is on — use `import type` for type-only imports.
- `noUnusedLocals` / `noUnusedParameters` are errors; the codebase uses `void x` when a binding must exist but is unused.
- Domain types in `type.d.ts` are **ambient globals** — do not import them.
- Use semantic Tailwind tokens, never raw hex (`AGENTS.md` §11.3).

---

## 4. Survey-specific behaviour

None of this is built yet, but once it is, these are protected invariants. Do not break them:

survey editing · question ordering · section ordering · conditional logic · required-question behaviour · hidden-question behaviour · draft persistence · published-survey behaviour · response submission · response integrity · tenant ownership · export correctness · backwards compatibility with existing survey data.

Changing the shape of stored survey or response data is a migration, not an edit. Get it approved.

---

## 5. Clerk guidance

Clerk is **not installed and not used**. The Clerk skills are reference material for future approved auth work, and the auth provider is still undecided (`AGENTS.md` §7).

If and when Clerk is adopted:

- Use the existing Clerk helpers rather than hand-rolling session logic.
- Validate sessions **server-side**; never trust client-only authentication.
- Preserve organization and user scoping on every query.
- Never expose Clerk secrets to the client.
- Test both protected and public flows.
- Follow `clerk-tanstack-patterns` — the other framework skills do not apply to this stack. Follow a skill only where it matches the repository's actual implementation.

---

## 6. MongoDB guidance

MongoDB is **not connected yet**. When building it (`AGENTS.md` §8):

- Reuse the existing database connection; never open a new one per request.
- Reuse existing Mongoose models; guard registration to avoid `OverwriteModelError`.
- Scope tenant-owned queries by `companyId`, always.
- Validate identifiers before querying.
- Avoid unbounded queries — paginate or limit.
- Preserve indexes; handle duplicate-key errors explicitly.
- No destructive schema changes without approval.
- **Never run destructive commands against a production database.**

---

## 7. Vercel AI SDK guidance

The AI SDK is **not installed** and SurveyFlow has no AI features. **Installing the `ai-sdk` skill does not authorize adding AI functionality to the application.**

If AI work is ever approved: keep provider keys server-side, follow whatever model abstraction exists at that point, validate user input, protect private survey and response data, handle streaming failures with deterministic fallbacks, test the model-independent logic, and do not hard-code a provider unless the architecture requires it.

---

## 8. Playwright guidance

Playwright is configured (`playwright.config.ts`, specs in `tests/`) with three Claude subagents in `.claude/agents/` and the `playwright-test` MCP server in `.mcp.json`.

- Use the installed Playwright agents (planner → generator → healer) for browser verification.
- Run `npx playwright install chromium` first — browsers are not downloaded yet.
- Inspect the live application and validate **actual** routes: `/`, `/auth/login`, `/auth/register`, `/dashboard`, `/app/surveys`. Many navbar links point at routes that do not exist.
- Use stable selectors — accessible roles and labels, not brittle CSS.
- Verify desktop and mobile behaviour.
- Cover critical user journeys and capture useful failure context.
- **Do not rewrite a valid test to hide an application defect.** Fix the app or report the defect.
- Playwright specs live in `tests/`; Vitest owns `src/`. Keep them separate — `vitest.config.ts` excludes `tests/**` deliberately.

---

## 9. UI verification

For UI work, verify: correct route · correct layout · responsive behaviour · scroll behaviour · keyboard navigation · focus states · form labels · error messaging · loading states · empty states · touch-target sizes · colour contrast · no unintended regressions.

---

## 10. Required checks

Discover and run the repository's real scripts. As of now:

```bash
npm run format        # biome format --write
npm run check         # biome check  — currently 3 PRE-EXISTING errors
npx tsc --noEmit      # type check   — currently 15 PRE-EXISTING errors
npm run test          # vitest       — passes (no test files yet)
npm run build         # vite build   — passes
npx playwright test   # e2e          — needs `npx playwright install chromium`
```

There is no `typecheck` script and `vite build` does not type check.

**`npm run check` and `npx tsc --noEmit` already fail on pre-existing issues** (`AGENTS.md` §21, items 2–3). Compare your run against that baseline and make sure you added nothing new. Never claim a check passed unless you ran it and saw it pass.

---

## 11. Final report format

Every completed task reports:

- What was inspected
- What changed, and why
- Files modified
- Tests added or updated
- Commands executed
- Validation results (per check: passed / failed / not available / not run + reason)
- Remaining risks
- Unresolved issues
- Assumptions made

Distinguish failures you introduced from failures that were already there.

---

## 12. Prohibited

Do not:

- Expose or print secrets; commit credentials; modify `.env` values unnecessarily
- Trust client-side identity for authorization, or break tenant isolation
- Disable tests, or delete failing tests to obtain a green build
- Suppress meaningful TypeScript errors, add blanket `any`, or disable lint rules globally
- Replace working architecture without evidence
- Introduce duplicate components, hooks, services, models, or utilities
- Modify unrelated files, or reformat the repository wholesale
- Rewrite git history, delete branches, or commit without being asked
- Remove existing agents or skills
- **Add Firebase dependencies, Firebase agent skills, Firebase plugins, or Firebase MCP integrations**
- Claim success without verification
