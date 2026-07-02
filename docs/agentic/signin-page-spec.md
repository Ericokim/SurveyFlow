# SurveyFlow Sign-In Page Spec

## Screenshot Interpretation

The approved sign-in screenshot shows a white top bar with the SurveyFlow logo, a `Create account` link, a two-column desktop layout, a product/benefit panel on the left, and a centered sign-in card on the right.

## Route

Use:

```text
src/routes/auth/login.tsx
```

Reason: existing navigation links target `/auth/login`.

## Component Location

Use:

```text
src/routes/auth/login.tsx
```

Keep the auth page route-local and use shared form primitives from:

```text
src/components/shared/inputs/custom-form-field.tsx
```

## UI Requirements

- shadcn `Button`, `Input`, `Label`, `Checkbox`, `Card`, `Separator`
- TanStack Router `Link`
- TanStack Form with Zod validation
- `Navbar` from `src/components/shared/Navbar.tsx`
- lucide-react icons
- framer-motion with reduced-motion support
- Theme classes for color and surfaces
- UI-only submit handler

## Validation

```bash
nvm use
npm run format
npm run check
npm run build
```
