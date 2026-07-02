# SurveyFlow Sign-Up Codex Prompt

Scan the project first.

Implement the SurveyFlow sign-up page with minimal changes and the same compact design language as the approved sign-in screenshot.

Use:

```text
src/routes/auth/register.tsx
```

Keep the page route-local; do not import `src/features/auth/components/signup-page.tsx`.

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
- hardcode brand hex colors
- create auth page components under `src/features/auth/components`

Run:

```bash
nvm use
npm run format
npm run check
npm run build
```
