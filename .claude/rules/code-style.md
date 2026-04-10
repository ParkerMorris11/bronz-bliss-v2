# Code Style — Bronz Bliss

## TypeScript
- Strict mode is on — no implicit `any`, no untyped parameters
- Prefer `type` over `interface` for object shapes unless extending
- Import types with `import type { ... }` to keep runtime imports clean
- Use `satisfies` for type-checking object literals while preserving narrow types (see Drizzle return types in routes.ts)
- Never use `as` casts to silence type errors — fix the underlying type

## Naming
- **Files:** kebab-case for utilities (`query-client.ts`), PascalCase for React components is handled by the page filename matching the export (`settings.tsx` → `SettingsPage`)
- **React components:** PascalCase (`BookingPage`, `SlotGroup`)
- **Functions/variables:** camelCase
- **DB columns:** snake_case in SQL/Drizzle, camelCase in TypeScript (Drizzle maps automatically)
- **API routes:** kebab-case (`/api/client-packages`, `/api/gift-cards`)
- **Constants:** SCREAMING_SNAKE_CASE only for true module-level constants (`DAYS`, `DEFAULT_HOURS`)

## React Components
- One page component per file in `client/src/pages/`
- Extract sub-components into the same file if they're only used there — no premature file splitting
- Keep page components focused on state + layout; extract pure UI pieces as local functions
- Props: inline type, not a separate `Props` interface, unless reused
- No prop drilling more than 2 levels — pass data directly or co-locate state

## State Management
- TanStack Query for all server state — no manual `fetch` in components
- Query keys follow the pattern `["/api/resource"]` or `["/api/resource", id]`
- Local UI state with `useState` — no global state library needed
- Don't mirror server state in local state; derive from query data instead

## Mutations
- Always use `useMutation` for writes — don't call `apiRequest` directly in handlers
- Invalidate relevant query keys in `onSuccess`
- Show toast feedback on success and error

## File structure within a page
```
imports
types/interfaces (local only)
helper functions
export default function PageName() {
  state
  queries
  mutations
  derived values
  handlers
  early returns (loading, error, empty)
  return JSX
}
```

## Error handling
- Validate at API boundaries (user input, external APIs) — not internally
- Don't add try/catch for operations that can't fail
- Surface errors to users via toast — don't swallow silently

## Do not
- Add `"use client"` — this is Vite + React, not Next.js
- Create utility functions for one-off operations
- Add abstraction layers that only have one consumer
- Leave `console.log` in committed code
