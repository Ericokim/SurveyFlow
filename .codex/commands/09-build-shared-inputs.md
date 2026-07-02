# Command 09: Build Shared Inputs

## Goal

Create SurveyFlow-native shared input components for consistent auth and app forms.

## Reference

Use `/Users/eric/Developer/nrr-collections-crm/src/components/shared/Inputs` only as a pattern reference. Do not copy JSX directly.

## Target Files

```text
src/components/shared/inputs/custom-form-field.tsx
```

## Requirements

- Keep components small and typed.
- Provide a compound `CustomFormField` API with `FormFieldType` values for common field types.
- Provide a `TanStackFormField` adapter for `@tanstack/react-form` field instances.
- Import shared fields directly from `src/components/shared/inputs/custom-form-field.tsx`.
- Do not create auth-specific field wrapper files unless there are two real non-auth callers.
- Own label, icon slot, invalid state, focus ring, autofill styling, password visibility, and shadcn input composition.
- Use semantic theme classes.
- Avoid double borders by putting visible border/ring on the wrapper and making the inner input borderless.
- Use TanStack Form for auth form state and validation.
- Use Zod schemas for auth validation.
- Use `noValidate` on UI-only auth forms to avoid browser-native validation tooltips.

## Verification

Run:

```bash
npm run format
npm run check
npm run build
```
