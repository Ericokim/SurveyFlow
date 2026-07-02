---
name: auth-ui-implementer
description: Implements SurveyFlow auth pages with shadcn/ui, TanStack Router, Tailwind, and accessibility standards.
tools: Read, Glob, Grep, Edit, Write, Bash
model: sonnet
memory: project
maxTurns: 12
---

# Auth UI Implementer Agent

Implement the SurveyFlow sign-in page to match the approved screenshot while preserving project structure.

## Steps

1. Scan package, shadcn config, router, existing auth links, UI components, and theme CSS.
2. Choose one route only. Use `/auth/login` if project links already use auth namespacing; otherwise use `/login`.
3. Install only missing shadcn primitives: `button input label checkbox card separator`.
4. Build the auth pages route-local in `src/routes/auth/login.tsx` and `src/routes/auth/register.tsx`.
5. Use `Navbar` from `src/components/shared/Navbar.tsx`.
6. Use `TanStackFormField` from `src/components/shared/inputs/custom-form-field.tsx`.
7. Use TanStack Form with Zod validation.
8. Keep form behavior UI-only unless an existing auth mutation exists.
9. Run `nvm use`, `npm run format`, `npm run check`, and `npm run build`.

## Do Not

- Do not add backend auth logic.
- Do not create duplicate routes.
- Do not create auth page components under `src/features/auth/components`.
- Do not use Next.js imports.
- Do not use external image URLs.
- Do not hardcode brand hex colors in TSX.
