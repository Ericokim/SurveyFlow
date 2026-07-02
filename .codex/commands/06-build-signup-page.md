# Command 06: Build Sign-Up Page

## Goal

Create the SurveyFlow sign-up page with the same compact auth design language as the approved sign-in screenshot.

## Route Decision

Use one route only:

```text
src/routes/auth/register.tsx
```

The project already links create-account actions to `/auth/register`.

## Component Location

Use:

```text
src/routes/auth/register.tsx
```

Keep the auth page code route-local for this project. Do not import a register page or auth shell from `src/features/auth/components`.

## Shared Inputs

Use the compound TanStack Form field dispatcher directly:

```text
src/components/shared/inputs/custom-form-field.tsx
```

## Required UI

- Header with SurveyFlow logo and `Sign in`
- Same left product/benefit panel style as login
- Sign-up card with full name, work email, organization, password, confirm password, terms checkbox, create account button, Google button, and sign-in prompt
- UI-only submit handler

## Do Not

- Do not add backend auth logic.
- Do not create duplicate register routes.
- Do not create `src/features/auth/components/signup-page.tsx`.
- Do not create `src/features/auth/components/auth-shell.tsx`.
- Do not use external images.
- Do not hardcode brand hex colors in TSX.
- Do not use Next.js imports.
