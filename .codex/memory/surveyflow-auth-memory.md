# SurveyFlow Auth UI Memory

SurveyFlow is a multitenant survey platform for branded surveys, controlled distribution, analytics, CSV exports, and client workspaces.

## Current UI Goal

Build the sign-in page shown in the approved screenshot.

## Route Decision

The codebase currently points public auth actions at `/auth/login`, so the implementation route is:

```text
src/routes/auth/login.tsx
```

The auth page implementation is route-local:

```text
src/routes/auth/login.tsx
```

Shared auth inputs are implemented in:

```text
src/components/shared/inputs/custom-form-field.tsx
```

Do not create a duplicate `/login` route.

## Visual Direction

- Top auth navbar with SurveyFlow logo and `Create account` link
- Split desktop layout
- Left product/benefit panel
- Right sign-in card
- Coral primary CTA through theme tokens
- Deep foreground typography
- Soft shadows and rounded cards
- Responsive mobile layout

## Required Content

Left side:

- `The smarter way to run surveys`
- `Collect feedback, drive engagement, and make better decisions.`
- Product preview visual
- Secure survey management
- Branded experiences
- Powerful analytics

Right side:

- `Welcome back`
- `Sign in to your SurveyFlow account`
- Email input
- Password input
- Remember me
- Forgot password
- Sign In
- Continue with Google
- Terms and Privacy links

## Accessibility

- Use one `h1`
- Connect labels to inputs
- Use keyboard-focusable controls
- Mark decorative visuals with `aria-hidden`
- Respect reduced motion
