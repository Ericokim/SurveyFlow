# Production Rules

- Keep the app simple and typed.
- Do not duplicate CRUD between server functions and API routes.
- Validate user input at feature boundaries with Zod.
- Keep secrets server-side.
- Do not require optional production services during local startup.
- Avoid force audit fixes unless the dependency impact is reviewed.
