# Database Conventions — Bronz Bliss

## Source of truth: `shared/schema.ts`
Every table definition lives here. Both server and client import from `@shared/schema`. Never define a table shape anywhere else.

Each table follows this pattern:
```ts
export const tableName = sqliteTable("table_name", { ... });
export const insertTableNameSchema = createInsertSchema(tableName).omit({ id: true });
export type InsertTableName = z.infer<typeof insertTableNameSchema>;
export type TableName = typeof tableName.$inferSelect;
```

## Adding a column — checklist
1. Add field to Drizzle table in `shared/schema.ts`
2. Add column to `CREATE TABLE IF NOT EXISTS` block in `server/storage.ts`
3. Add `ALTER TABLE` migration below the CREATE block:
   ```ts
   try { sqlite.exec(`ALTER TABLE table_name ADD COLUMN column_name TYPE`); } catch {}
   ```
4. Update `IStorage` interface if a method signature changes
5. Update the `DatabaseStorage` implementation
6. Update any PATCH/update logic in `server/routes.ts` if applicable

## Storage layer rules
- All DB access goes through `storage.*` — never import `db` or `sqlite` in `routes.ts`
- Add new methods to `IStorage` interface first, then implement in `DatabaseStorage`
- Keep methods synchronous (better-sqlite3 is sync — don't wrap in promises)
- Return `undefined` for not-found cases, not `null` or throw

## Drizzle query patterns
```ts
// Select one
db.select().from(table).where(eq(table.id, id)).get()

// Select many
db.select().from(table).where(eq(table.field, value)).all()

// Insert + return
db.insert(table).values(data).returning().get()

// Update + return
db.update(table).set(data).where(eq(table.id, id)).returning().get()

// Transaction (for atomic operations)
db.transaction((tx) => {
  const existing = tx.select().from(table).where(...).all();
  // ... check, then insert/update
  return tx.insert(table).values(data).returning().get();
});
```

## Do not bundle drizzle-orm with esbuild
drizzle-orm v0.45+ has internal `../cache/core/` submodules that esbuild cannot resolve. Keep it in the external list (not in the allowlist in `script/build.ts`).

## JSON columns
Two columns store structured data as JSON strings:
- `business_settings.operating_hours` — `{ Monday: { enabled: true, open: "HH:MM", close: "HH:MM" } | null, ... }`
- `business_settings.accepted_payment_methods` — `["card", "cash", "venmo", ...]`

Always parse with try/catch and provide a sensible default:
```ts
try {
  const parsed = JSON.parse(raw);
  // use parsed
} catch {
  // use default
}
```

## Atomic booking
Use `storage.bookAppointmentAtomically(data)` for all public booking inserts. This method wraps the conflict re-check and insert in a single SQLite transaction to prevent double-booking.

## Migrations strategy
There are no Drizzle migration files. Schema is managed via:
1. `CREATE TABLE IF NOT EXISTS` statements in `storage.ts` (run on every startup)
2. `ALTER TABLE ... ADD COLUMN` statements for new columns (wrapped in try/catch — safe to run repeatedly)
3. `drizzle-kit push` for local dev schema diffing only

Never drop columns or rename columns in production without a data migration plan.
