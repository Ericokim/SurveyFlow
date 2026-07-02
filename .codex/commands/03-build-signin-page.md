# Command 03: Build Sign-In Page

## Goal

Create the approved SurveyFlow sign-in page with minimal project changes.

## Route Decision

Use one route only:

```text
src/routes/auth/login.tsx
```

This project already links auth actions to `/auth/login`.

## Component Location

```text
src/routes/auth/login.tsx
```

Keep the auth page code route-local for this project. Do not import a sign-in page from `src/features/auth/components`.

## Shared Inputs

Use the compound TanStack Form field dispatcher directly:

```text
src/components/shared/inputs/custom-form-field.tsx
```

## Required UI

- Header with SurveyFlow logo and `Create account`
- Left headline, copy, product visual, and three benefits
- Right card with email, password, remember me, forgot password, sign-in button, Google button, terms/privacy links
- Responsive mobile layout
- Accessible labels, focus states, and reduced-motion support

## Do Not

- Do not add backend auth logic.
- Do not create `/login` as a duplicate.
- Do not create `src/features/auth/components/signin-page.tsx`.
- Do not use external image URLs.
- Do not use hardcoded brand hex colors in TSX.
- Do not use Next.js imports.
