---
name: surveyflow-auth-ui
description: Build SurveyFlow auth screens from approved screenshots and existing TanStack Start, shadcn/ui, Tailwind, and project theme conventions. Use for sign-in, register, password reset, and auth layout work.
---

# SurveyFlow Auth UI

## Workflow

1. Scan `package.json`, `components.json`, `tsconfig.json`, `src/routes`, `src/components/ui`, `src/components/shared/Navbar.tsx`, and `src/styles.css`.
2. Use the existing auth route pattern. This project uses `src/routes/auth/login.tsx` and `src/routes/auth/register.tsx`.
3. Keep auth page code route-local for this project, while using shared primitives from `src/components/shared`.
4. Install only missing shadcn primitives required by the screen.
5. Keep auth behavior UI-only unless an existing auth mutation already exists.
6. Run `nvm use`, `npm run format`, `npm run check`, and `npm run build`.

## Required UI

- Header with SurveyFlow logo and `Create account`
- Desktop two-column layout
- Left marketing panel with product preview and three benefits
- Right sign-in card with email, password, remember me, forgot password, submit, Google button, terms/privacy text
- Responsive mobile layout with no overflow

## Rules

- Use TanStack Router `Link`
- Use `Navbar` from `src/components/shared/Navbar.tsx` for auth headers
- Use `CustomFormField` / `TanStackFormField` from `src/components/shared/inputs/custom-form-field.tsx`
- Use TanStack Form with Zod validation for auth forms
- Use shadcn `Button`, `Input`, `Label`, `Checkbox`, `Card`, and `Separator`
- Use lucide-react icons
- Use `framer-motion` and `useReducedMotion` for subtle entry motion
- Use theme classes such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary`, `text-primary-foreground`, and `border-border`
- Do not add backend auth logic
- Do not read `.env`
- Do not use Next.js imports
- Do not use external image URLs
- Do not hardcode brand hex colors in TSX
- Do not create duplicate login routes
- Do not create auth page components under `src/features/auth/components` for this project
