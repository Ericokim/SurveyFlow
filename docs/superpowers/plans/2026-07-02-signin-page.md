# SurveyFlow Sign-In Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SurveyFlow sign-in page from the approved screenshot and add the Codex auth workflow artifacts.

**Architecture:** Use the existing auth namespace because current navigation points to `/auth/login`. Keep the form route-local in `src/routes/auth/login.tsx`, share repeated auth layout in `src/components/shared/AuthPageShell.tsx`, and keep auth marketing arrays in `src/features/auth.ts`.

**Tech Stack:** TanStack Start, TanStack Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, framer-motion, npm, Biome.

---

### Task 1: Install Missing UI Primitives

**Files:**
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/separator.tsx`

- [ ] **Step 1: Check installed components**

Run:

```bash
find src/components/ui -maxdepth 1 -type f | sort
```

Expected: `button.tsx`, `input.tsx`, `label.tsx`, and `card.tsx` exist; `checkbox.tsx` and `separator.tsx` may be missing.

- [ ] **Step 2: Install missing components**

Run:

```bash
npx shadcn@latest add checkbox separator
```

Expected: shadcn creates `src/components/ui/checkbox.tsx` and `src/components/ui/separator.tsx`.

### Task 2: Build the Sign-In Route And Shared Shell

**Files:**
- Create: `src/components/shared/AuthPageShell.tsx`
- Create: `src/features/auth.ts`
- Create: `src/routes/auth/login.tsx`

- [ ] **Step 1: Create shared shell**

Implement `AuthPageShell` for the shared header, product preview, benefits, responsive two-column layout, and framer-motion entry.

- [ ] **Step 2: Create route-local form**

Implement the sign-in form directly in `src/routes/auth/login.tsx` using TanStack Form, Zod validation, shadcn primitives, lucide icons, and a UI-only submit handler.

- [ ] **Step 3: Review accessibility**

Check that the component has one `h1`, connected labels, `autoComplete` values, accessible password visibility button, and `aria-hidden` decorative visuals.

### Task 3: Add the Route

**Files:**
- Modify: `src/routeTree.gen.ts`

- [ ] **Step 1: Create route file**

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/login")({
  component: SignInRoute,
});
```

- [ ] **Step 2: Regenerate route tree**

Run:

```bash
npm run generate-routes
```

Expected: `src/routeTree.gen.ts` includes `/auth/login`.

### Task 4: Add Codex Workflow Artifacts

**Files:**
- Create: `.codex/agents/auth-ui-implementer.md`
- Create: `.codex/agents/accessibility-auditor.md`
- Create: `.codex/agents/code-reviewer.md`
- Create: `.codex/commands/01-scan-auth-codebase.md`
- Create: `.codex/commands/02-install-auth-ui-components.md`
- Create: `.codex/commands/03-build-signin-page.md`
- Create: `.codex/commands/04-review-auth-ui.md`
- Create: `.codex/commands/05-run-auth-checks.md`
- Create: `.codex/memory/surveyflow-auth-memory.md`
- Create: `.codex/rules/frontend.md`
- Create: `.codex/rules/auth-ui.md`
- Create: `.codex/rules/design-system.md`
- Create: `.codex/skills/surveyflow-auth-ui/SKILL.md`
- Create: `.codex/skills/surveyflow-ui-ux/SKILL.md`
- Create: `docs/agentic/signin-page-spec.md`
- Create: `docs/agentic/signin-codex-prompt.md`
- Do not create template files that import `src/features/auth/components`.

- [ ] **Step 1: Add auth-specific workflow docs**

Create concise Codex workflow files describing the scan, install, build, review, and verification process.

Expected: existing installed generic skills are not overwritten.

### Task 5: Verify

**Files:**
- Modify: formatted changed files only

- [ ] **Step 1: Select Node version**

Run:

```bash
nvm use
```

Expected: Node version satisfies `>=22.12.0`.

- [ ] **Step 2: Format**

Run:

```bash
npm run format
```

Expected: Biome formats changed files.

- [ ] **Step 3: Static check**

Run:

```bash
npm run check
```

Expected: no Biome errors.

- [ ] **Step 4: Build**

Run:

```bash
npm run build
```

Expected: Vite builds successfully and `/auth/login` is in the route tree.
