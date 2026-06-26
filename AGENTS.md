# SurveyFlow Agent Guide

## Project Rules

- Use npm. Do not introduce pnpm or yarn unless the project is intentionally migrated.
- Keep generated Shadcn components in `src/components/ui`.
- Use `@/` for app imports.
- Keep routes thin: pages and API endpoints only.
- Put product logic in `src/features`.
- Put database, auth, and model code in `src/server`.
- Use server functions for normal app mutations and queries.
- Use API routes only for health checks, webhooks, CSV/file responses, and external callbacks.
- Prefer small, typed modules. Do not add broad abstractions before there are two real callers.

## Verification

Run these before considering a change complete:

```bash
nvm use
npm run format
npm run check
npm run build
```
