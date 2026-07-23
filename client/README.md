# SurveyFlow — Client

React 19 + Vite front end for the SurveyFlow survey management platform.

## Stack

| Concern | Choice                                                     |
| ------- | ---------------------------------------------------------- |
| Build   | Vite 8 (rolldown) + `@vitejs/plugin-react-swc`             |
| Routing | TanStack Router (file-based, generated `routeTree.gen.js`) |
| Data    | TanStack Query + Axios                                     |
| State   | Zustand                                                    |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives)             |
| Forms   | React Hook Form + Zod                                      |
| Charts  | Recharts                                                   |
| Testing | `node:test` (unit) + Playwright/Allure (e2e)               |

## Getting started

Run from the repo root so the server and client start together:

```bash
npm run dev
```

Or run the client alone:

```bash
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Script                                    | Does                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `npm run dev`                             | Vite dev server with HMR                         |
| `npm run build`                           | `tsr generate` then production build to `dist/`  |
| `npm run preview`                         | Serve the production build locally               |
| `npm run lint`                            | ESLint over `**/*.{js,jsx}`                      |
| `npm run test:unit`                       | Unit tests (`node --test tests/unit/*.test.mjs`) |
| `npm run test:e2e`                        | Playwright end-to-end suite                      |
| `npm run allure:generate` / `allure:open` | Build / open the Allure report                   |
| `npm run route:generate` / `route:watch`  | Regenerate the TanStack route tree               |

## Layout

```
src/
  app/          providers, router, context
  components/   shared + shadcn/ui components
  hooks/        reusable React hooks
  lib/          api clients, utils (incl. shared logicEngine)
  pages/        page-level components
  routes/       file-based TanStack routes
  stores/       Zustand stores
  styles/       theme.css — design tokens (single source of truth)
tests/
  unit/         node:test specs
  e2e/          Playwright specs
  fixtures/     shared JSON fixtures
```

## Theming

`src/styles/theme.css` holds every design token in `oklch`. The palette is
SurveyFlow's coral / warm-orange primary with a soft-blue analytics accent;
light and dark modes are both defined there.

**Components bind to tokens, never to raw hex.** Change a colour once in
`:root` / `.dark` and it propagates everywhere. Charts should use
`--chart-1` … `--chart-5` (the lead pair is blue + coral).

Decorative helpers built on the tokens: `.sf-page`, `.sf-gradient-primary`,
`.sf-auth-panel`.

## Environment

Vite loads env from the repo root first, then lets `client/.env*` override it.
Client-visible variables must be prefixed `VITE_`.

```
VITE_API_URL=http://localhost:5000
```
