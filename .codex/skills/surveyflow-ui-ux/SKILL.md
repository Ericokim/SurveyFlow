---
name: surveyflow-ui-ux
description: Apply SurveyFlow UI/UX standards, accessibility checks, and token-driven visual design for product pages and auth screens.
---

# SurveyFlow UI/UX

## Visual System

- Warm coral primary through theme tokens
- Deep foreground headings
- Soft card surfaces
- Subtle borders and shadows
- Clean 4/8px spacing rhythm
- Professional SaaS density

## Theme Rules

Use semantic classes:

```text
bg-background
bg-card
text-foreground
text-muted-foreground
text-primary
bg-primary
border-border
text-primary-foreground
```

Do not hardcode brand hex colors in TSX.

## Accessibility

- Use semantic HTML
- Connect form labels and controls
- Keep visible focus states
- Do not rely on color alone
- Ensure touch/click targets are comfortable
- Respect reduced motion
- Keep mobile text and controls from overlapping

## Engineering

- Keep files small and typed
- Use arrays and `.map()` for repeated content
- Use existing imports and aliases
- Use shadcn primitives before custom controls
- Avoid broad abstractions until there are two real callers
