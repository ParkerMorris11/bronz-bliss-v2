# Bronz Bliss — Claude Code Guide

## Commands

```bash
npm run dev        # Dev server on port 5000 (Express + Vite HMR in one process)
npm run build      # Vite builds client → dist/public, esbuild bundles server → dist/index.cjs
npm start          # Production: NODE_ENV=production node dist/index.cjs
npm run check      # TypeScript type-check (no emit)
npm run db:push    # Push schema changes to SQLite via drizzle-kit
```

No tests exist yet.

## Project Overview

Bronz Bliss is a full-stack tanning salon CRM and public booking platform. Features: client management, appointment scheduling, check-in/checkout, payments, inventory, SMS reminders, gift cards, promo codes, loyalty points, and a public booking + onboarding wizard.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui, Wouter, TanStack Query v5 |
| Backend | Node.js, Express 5 |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Auth | Session-based (express-session + memorystore + bcryptjs) |
| SMS | Twilio |
| Deployment | Railway (auto-deploys on push to `main`) |
| Fonts | Cabinet Grotesk (headings), Satoshi (body) |
| Colors | Warm amber/golden — `primary` maps to the amber/bronze palette |

## Architecture

### Single process, two modes
- **Dev:** `tsx server/index.ts` — Vite dev server mounted as Express middleware via `server/vite.ts`
- **Prod:** `npm run build` → `dist/index.cjs` (esbuild-bundled server) + `dist/public/` (Vite client). Express serves static files from `dist/public`.

### Repo layout
```
client/src/
  pages/          # One file per route — no nested route folders
  components/ui/  # shadcn/ui primitives only, no custom business logic
  lib/            # queryClient.ts, format.ts
  hooks/          # use-toast.ts, use-mobile.ts
server/
  index.ts        # Express bootstrap, session config, auth middleware
  routes.ts       # All API routes + availability/slot logic
  storage.ts      # IStorage interface, DatabaseStorage class, SQL migrations
  vite.ts         # Vite dev middleware (dev only)
shared/
  schema.ts       # Single source of truth: Drizzle tables + Zod schemas + TS types
script/
  build.ts        # esbuild (server) + Vite (client) — selective externalization
```

### Schema source of truth
`shared/schema.ts` defines every table. Both server and client import from `@shared/schema`. When adding a column:
1. Add it to the Drizzle table in `shared/schema.ts`
2. Add it to the `CREATE TABLE IF NOT EXISTS` block in `server/storage.ts`
3. Add an `ALTER TABLE ... ADD COLUMN` migration line below the CREATE block
4. Update any relevant storage method signatures and `IStorage` interface

### Storage layer
`server/storage.ts` exports a single `storage` singleton. All DB access goes through it — routes never import `db` or query Drizzle directly. better-sqlite3 is fully synchronous; all storage methods are sync.

### Routing
- All API routes in `server/routes.ts`, registered via `registerRoutes(httpServer, app)`
- `/api/public/*` — unauthenticated (booking, availability, settings preview)
- `/api/auth/*` — login/logout/change-password
- Everything else requires `req.session.authenticated === true` in production

### Client routing
Hash-based via Wouter (`useHashLocation`). Admin pages: `/#/...`. Public pages: `/#/book`, `/#/onboard/:id`, `/#/landing`.

### Auth
- Password hashed with bcrypt, stored in `business_settings.admin_password_hash`
- If `ADMIN_PASSWORD` env var is set, it is re-synced to the DB hash on every server startup
- In `NODE_ENV !== 'production'`, all routes are open (no auth gate)

### Booking availability
- Slot generation: 15-minute increments from open to close time
- Operating hours stored as JSON in `business_settings.operating_hours` — format: `{ Monday: { enabled: true, open: "10:00", close: "19:00" } | null, ... }`
- Accepted payment methods stored as JSON array in `business_settings.accepted_payment_methods`
- Booking is atomic: `storage.bookAppointmentAtomically()` wraps conflict re-check + insert in a Drizzle transaction

## Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`

## Environment Variables

| Variable | Required in prod | Default | Notes |
|---|---|---|---|
| `ADMIN_PASSWORD` | Yes | `bronzbliss` | Re-synced to DB hash on every startup |
| `SESSION_SECRET` | Yes | `bronzbliss-dev-secret` | Express session signing key |
| `PORT` | No | `5000` | |
| `DB_PATH` | No | `./bronzbliss.db` | |
| `TWILIO_ACCOUNT_SID` | No | — | SMS; falls back silently if unset |
| `TWILIO_AUTH_TOKEN` | No | — | |
| `TWILIO_PHONE_NUMBER` | No | — | |

## Git Workflow
- `main` is production — Railway deploys on every push
- Commit style: imperative present tense (`Add`, `Fix`, `Update`)
- Commit body: short bullet list of what changed and why
- Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in AI-assisted commits
- Never force-push main
- Push after every logical unit of work

## Build Notes
`script/build.ts` uses esbuild with a selective allowlist. Packages in the allowlist are bundled; everything else is external (loaded from `node_modules` at runtime on Railway).

**Do not add `drizzle-orm` to the allowlist.** It uses internal cache submodules (`../cache/core/`) that esbuild cannot resolve. Keep it external.

Native modules (`better-sqlite3`, `bcryptjs`) must stay external too.

## Rules
See `.claude/rules/` for detailed conventions:
- `code-style.md` — TypeScript, naming, component patterns
- `database.md` — Drizzle + storage layer conventions
- `ui.md` — shadcn/ui, Tailwind, amber palette
