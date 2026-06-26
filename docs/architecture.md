# Architecture

SurveyFlow uses TanStack Start with file-based routing.

- `src/routes`: pages and API endpoints only.
- `src/features`: product logic, schemas, services, server functions, and feature-local components.
- `src/server`: database connections, Mongoose models, and auth primitives.
- `src/components/ui`: generated Shadcn UI components only.
- `src/shared`: reusable app components, stores, utilities, and shared types.
- `src/integrations`: third-party integration setup such as TanStack Query and Sentry.

Normal app CRUD should use server functions. API routes are reserved for health checks, Twilio webhooks, CSV exports, raw file responses, and external callbacks.
