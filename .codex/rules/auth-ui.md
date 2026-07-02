---
paths:
  - "src/routes/login.tsx"
  - "src/routes/auth/login.tsx"
  - "src/features/auth/**/*.tsx"
---

# SurveyFlow Auth UI Rules

- Auth UI must be accessible and responsive.
- Use labels for every input.
- Use `autoComplete="email"` and `autoComplete="current-password"`.
- Use TanStack Router `Link`.
- Keep form submission UI-only unless an existing auth service exists.
- Do not store tokens or passwords in localStorage.
- Do not read `.env` files.
- Do not create duplicate login routes.
