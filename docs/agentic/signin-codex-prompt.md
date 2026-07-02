# SurveyFlow Sign-In Codex Prompt

Scan the project first.

Implement the approved SurveyFlow sign-in page with minimal changes.

Use the existing auth namespace:

```text
src/routes/auth/login.tsx
```

Keep the page route-local; do not import `src/features/auth/components/signin-page.tsx`.

Use:

- TanStack Router `Link`
- shadcn `Button`, `Input`, `Label`, `Checkbox`, `Card`, `Separator`
- lucide-react icons
- framer-motion
- existing `cn`
- `Navbar` from `src/components/shared/Navbar.tsx`
- `TanStackFormField` from `src/components/shared/inputs/custom-form-field.tsx`
- SurveyFlow theme classes
- TanStack Form with Zod validation

Do not:

- add backend auth logic
- read `.env`
- create duplicate routes
- use Next.js imports
- use external image URLs
- hardcode brand hex colors in TSX
- create auth page components under `src/features/auth/components`

Run:

```bash
nvm use
npm run format
npm run check
npm run build
```
