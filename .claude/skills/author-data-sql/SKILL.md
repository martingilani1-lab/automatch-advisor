---
name: author-data-sql
description: Authoring or updating vehicle/reference data in bulk for AutoMatch from a CSV — writing or running a script in scripts/ that turns a CSV into a reviewable .sql file (INSERT/UPDATE/UPSERT). Use whenever the task involves seeding, backfilling, bulk-loading, or bulk-editing table rows from CSV data, or adding a data-authoring script. Generates SQL to a file; never executes it against the database.
---

# Authoring data SQL from CSV (AutoMatch)

## ⛔ The one rule that never bends

The script **generates a `.sql` file for the user to review and run themselves.**
**NEVER execute the generated SQL — or any DDL/DML — against the Supabase database.**
Not from the script, not via an MCP tool, not via `psql`, not via `supabase-js`, not from
the dashboard — **even if asked to "just load it" or "run it for me."** Write the file and
say it is ready for the user to run. (Same discipline as hand-written migrations.)

## The flow

```
CSV (source of truth)  ->  script in scripts/  ->  generated .sql in supabase/migrations/  ->  user runs it
```

- **CSV is the source of truth** for the data. The script is a deterministic, re-runnable
  transformer — editing data means editing the CSV and regenerating, not hand-patching the SQL.
- **Script location:** `scripts/<name>.ts` — plain Node/TS. Match the tooling the existing
  `scripts/` already use; don't introduce a new CSV parser or runtime dependency without reason.
- **Output:** a `.sql` file in `supabase/migrations/`, timestamp-prefixed
  `YYYYMMDDHHMMSS_description.sql` — e.g. `20260915150000_seed_transmission_units_from_csv.sql`.

## How the generator script must behave

1. **Read the CSV, emit SQL to a file — never open a DB connection.**
2. **Escape every string value** so quotes or newlines in the data can't break (or inject
   into) the SQL. Never concatenate a raw CSV cell into a statement unescaped.
3. **Empty cell → `NULL`, not `''`.** "Unknown" must stay distinct from an empty string or a
   zero. Only emit a real value when the CSV actually has one.
4. **Prefer idempotent upserts** when the target table has a natural unique key (e.g.
   `transmission_units.code`): `INSERT ... ON CONFLICT (code) DO UPDATE ...`, so re-running the
   file doesn't duplicate rows.
5. **Top the generated `.sql` with a comment** saying what it does, which CSV it came from, and
   that it was generated (not hand-written) — *why*-not-*what*, matching the codebase.

## Data-quality rules to enforce while generating

- **Frozen-vocabulary CHECK columns** (`transmission_units.family`, `safety_features.category`,
  `drivetrain_systems.type`): if a CSV value falls outside the allowed list, **stop and flag it
  to the user** — do not loosen the constraint, do not silently drop the row. Adding a new
  allowed value is a separate schema migration (see the `write-migration` skill).
- **Presence-only junction tables** (`vehicle_safety_features`): emit **only positive rows**
  ("this car has this feature"). Never emit an explicit negative/false row.
- **snake_case columns** (Postgres convention) — match the real column names exactly.

## Worked example (shape only)

Generator `scripts/seed-transmission-units.ts` reads a CSV and writes
`supabase/migrations/<ts>_seed_transmission_units_from_csv.sql` containing:

```sql
-- Generated from scripts/transmission_units.csv by scripts/seed-transmission-units.ts.
-- Reference data: real gearbox units. Re-runnable — upserts on the unique `code`.
-- Review before running; the generator does NOT execute this against the DB.
INSERT INTO transmission_units (code, family, maker, speeds, reliability_note)
VALUES
  ('7DCT-300', 'dct_wet', 'ExampleCo', 7, 'strong record'),
  ('6DCT-210', 'dct_dry', 'ExampleCo', 6, NULL)          -- empty CSV cell -> NULL
ON CONFLICT (code) DO UPDATE SET
  family           = EXCLUDED.family,
  maker            = EXCLUDED.maker,
  speeds           = EXCLUDED.speeds,
  reliability_note = EXCLUDED.reliability_note;
```

Then tell the user: the script path, the generated `.sql` path, how many rows it covers, and
that nothing was run against the database — they run the `.sql` when ready.
