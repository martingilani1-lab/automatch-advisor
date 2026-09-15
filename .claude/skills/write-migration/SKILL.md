---
name: write-migration
description: Authoring a Supabase database migration or schema change for AutoMatch — a new table, a new column, an altered CHECK constraint, or seed/reference data. Use whenever the task involves changing the database schema or writing SQL that would run against the database. Produces a reviewable .sql file for the user to run; never executes it.
---

# Writing a database migration (AutoMatch)

## ⛔ The one rule that never bends

Write the migration to a **file for the user to review and run themselves.**
**NEVER execute DDL or DML against the Supabase database** — not via an MCP tool, not via
a script, not via `psql`, not via `supabase-js`, not via the Supabase dashboard — **even if
asked to "just apply it", "run it for me", or "push it live".** If asked to apply it,
write the file and reply that it is ready for the user to run.

This is the established discipline for every migration in this repo. It is not optional.

## Where the file goes

- **Directory:** `supabase/migrations/`
- **Filename:** `YYYYMMDDHHMMSS_short_description.sql`
  — a UTC timestamp prefix, then a snake_case description.
  - Example: `20260915143000_add_warranty_months_to_vehicles.sql`

## How to write it

1. **Open with a comment saying *why*** — not just what. Match the codebase's heavy
   *why*-not-*what* comment convention.
2. **Explicit, readable SQL.** Column names are `snake_case` (Postgres convention),
   consistent with the rest of the schema.
3. **Enum-like column? Use the frozen-vocabulary CHECK pattern** (see below).
4. **Flag anything destructive.** A `DROP`, a column removal, or a `CHECK` change that could
   reject existing rows must be called out explicitly in your summary to the user — never
   slipped in quietly.
5. **Sign off clearly.** End by telling the user: the file path, what the migration does,
   and that **they** need to run it (you did not, by design).

## AutoMatch schema patterns to respect

### Frozen-vocabulary CHECK constraints
Columns like `transmission_units.family`, `safety_features.category`, and
`drivetrain_systems.type` are deliberately restricted to a closed list, enforced by a CHECK
constraint. To add a new allowed value, that is a **real migration**, not a free-text column:

```sql
ALTER TABLE transmission_units DROP CONSTRAINT transmission_units_family_check;
ALTER TABLE transmission_units ADD CONSTRAINT transmission_units_family_check
  CHECK (family IN ('dct_dry', 'dct_wet', 'dct', /* ...existing values... */, 'new_value'));
```

**Never relax a CHECK to free text, and never drop it just to make an insert succeed.**
If an insert fails a CHECK, that is a signal to confirm the intended vocabulary with the
user — not to loosen the constraint.

### Presence-only junction tables
`vehicle_safety_features` stores **only positive facts**: a row means "this car has this
feature." **Absence** means "not available." **Never insert an explicit negative/false row**
into a presence-only table.

## Worked example

Task: "Add an optional warranty length (in months) to vehicles."

`supabase/migrations/20260915143000_add_warranty_months_to_vehicles.sql`:

```sql
-- Add optional manufacturer-warranty length to vehicles.
-- Nullable on purpose: most historic/used listings have no warranty data,
-- and a missing value must read as "unknown", never as "0 months".
ALTER TABLE vehicles
  ADD COLUMN warranty_months integer;

-- Guard against nonsense values without freezing a vocabulary
-- (this is a numeric range, not an enum-style closed list).
ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_warranty_months_check
  CHECK (warranty_months IS NULL OR warranty_months BETWEEN 0 AND 120);
```

Then tell the user: *"Written `supabase/migrations/20260915143000_add_warranty_months_to_vehicles.sql`
— adds a nullable `warranty_months` column to `vehicles` with a 0–120 range check. Nothing
was run against the database; run it yourself when ready."*
