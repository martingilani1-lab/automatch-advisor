# New-car intake template

Blank pre-seed checklist for adding one car to the `catalog_` schema (see the `import-car`
skill and CLAUDE.md "Adding a new car / model — RULES"). Filling this in completely, before
any SQL is written, means no engine, config or attribute goes missing. Nothing here seeds
anything — the review-only seed migration is written from these files afterwards, by hand or
with a generator script (see the `author-data-sql` skill), never executed automatically.

**This folder is disposable working state, not a record.** Fill it for one car, generate the
seed migration from it, then overwrite it for the next car — don't keep a copy per car. The
committed `supabase/migrations/<ts>_seed_<car>.sql` file is the permanent, reviewable record
of what was seeded; this folder is scratch space to get there. (Earlier imports in this repo
kept a filled copy checked in per car — that's not the pattern going forward; the migration
file alone is enough to know what a given car's seed did.)

Lines starting with `#` in any CSV are guidance; delete them or leave them, they aren't read
by anything except the helper scripts' own header-skipping, which ignores them either way.

## Files, in fill order

1. `car.csv` — brand, model, segment, origin.
2. `phases.csv` — one row per phase: facelift boundary, platform code, NCAP, prices,
   mileage, resale, seats, towing.
3. `dimensions.csv` — one row per phase × body: dimensions, weight, boot, GVW, payload,
   fuel tank.
4. `engines.csv` — every engine, marked REUSE or NEW.
5. `transmissions.csv` — every gearbox this car uses, by real `unit_code`. No REUSE/NEW here
   — `transmission_units` is shared reference data, not seeded per-car; every `unit_code`
   must resolve live (see "Reuse vs new" below) or the import STOPS.
6. `drivetrains.csv` — optional, one row per AWD/4x4 system this car uses beyond plain FWD
   (column: `drivetrain_code`, e.g. `haldex_gen1`). Skip the file entirely for an FWD-only
   car. Used by `gen-config-grid.mjs` (below) to include AWD columns in the grid.
7. **Run `node scripts/gen-config-grid.mjs`** to generate `configs-<phase_label>.csv` — one
   file per row in `phases.csv`, columns pre-built from steps 3–6 (see "Config grid" below).
8. Mark the config grid(s).
9. `trims.csv`, then `trim_features.csv`.
10. `faults.csv`.
11. **Run `node scripts/validate-template.mjs`** — catches structural problems before you
    generate SQL from any of this (see "Scripts" below).
12. `performance-per-config-DEFERRED.csv`, `tires-DEFERRED.csv`, `media-DEFERRED.csv` —
    optional, fill in only when real figures/images exist. Every column these tables need
    already exists in the schema; these files are here so nothing is forgotten later, not
    because they're required for a first import.

## Scripts

Three helper scripts live in `scripts/` (one level up from this folder), all read-only
against the live DB — none of them write or seed anything.

- **`node scripts/reconcile.mjs [template-dir]`** — reads the filled `engines.csv` +
  `transmissions.csv`, queries the live DB, and prints two tables: a REUSE/CREATE table for
  engines with resolved ids (flags alias collisions: a code that's already another row's
  primary code, or already sits in another row's `alt_codes` — the case that broke silently
  before, León's `BCB` badge resolving to `AUS`, not a new row), and a RESOLVED/MISSING table
  for transmissions — every `unit_code` matched against live `transmission_units.code` or
  `alt_codes` (never speed count), printing the resolved unit's `family`/`speeds` so you can
  eyeball it's really the right physical gearbox. A MISSING transmission is a hard STOP, not
  a CREATE — add the unit via its own reviewed migration first. Also flags where an engine's
  `reuse_or_new` column has drifted from what's actually live (a seed run since the template
  was filled, for example) — transmissions have no such flag to drift. Exit code 1 if
  anything needs resolving.
- **`node scripts/gen-config-grid.mjs [template-dir] [--force]`** — pre-generates the config
  grid's columns (see below). Won't overwrite a `configs-<phase>.csv` that already has an
  `x` mark in it unless `--force` is passed, so re-running it after you've started marking
  cells can't silently erase work.
- **`node scripts/validate-template.mjs [template-dir]`** — checks the filled template
  before you generate SQL from it: config rows referencing an engine/gearbox code that
  isn't in `engines.csv`/`transmissions.csv`, fault severities outside
  `critical`/`moderate`/`minor`, phase/dimension numeric columns that are empty on every
  row (not wrong, but the seed generator must cast them explicitly — see "Type casts"
  below), engines never used in any config grid, and body types in `dimensions.csv` that
  don't exist live yet (informational — may be an intentional new body type). Reports
  `file:row  message`, one per line. Exit code 1 if any ERROR was found; WARNINGs alone
  exit 0.

## Config grid

One grid per phase, generated by `gen-config-grid.mjs` — you don't hand-type the column
headers. Rows = every engine in `engines.csv` (`code` + `power_kw`). Columns = every body ×
gearbox × drivetrain combination your dictionary entries make *possible* — the cross
product of `dimensions.csv`'s bodies for that phase, `transmissions.csv`'s gearbox codes,
and `FWD` plus anything in `drivetrains.csv`. This is a **menu to prune**, not a claim every
combination is real — most cars need most columns deleted before marking cells.

Mark `x` only in a cell where that exact combination really existed from the factory.
**Leave the cell empty otherwise** (or delete the column). An empty cell is what makes a
missing real combination *and* a phantom one (that never existed) visible, instead of
silently absent.

**Body-availability warning:** don't mark a cell just because the engine and the gearbox
each separately existed — the specific body pairing has to be real too (e.g. a high-output
engine that only ever came in the 3-door body must have empty cells under every other body
column; there is no estate version just because the estate body type exists elsewhere in
the grid).

## Reuse vs new — check the live DB first

Query the LIVE DB (`node scripts/reconcile.mjs`, or the Supabase MCP, or the human queries
and pastes the result) before marking anything `reuse_or_new`. Never infer this from
migration files — they may not have run, or may have drifted.

- **Engine:** match by `code` + `power_kw`, and also check whether the code appears in
  another engine's `alt_codes`. REUSE if found under either.
- **Transmission:** no REUSE/NEW decision — `unit_code` must RESOLVE against a live
  `transmission_units` row (`code` or `alt_codes`), matched by the real gearbox identity
  only. **NEVER match by speed count** — a "5-speed manual" is not evidence it's the same
  unit as another 5-speed manual already in the DB. A `unit_code` that doesn't resolve is a
  hard STOP: add the unit via its own reviewed migration first (see the transmission_units
  linking-audit workflow) — do not create one inline and do not guess.
- **Drivetrain system:** match by `code`.
- Engines that genuinely differ by emissions generation (Euro 2 vs Euro 3) or hardware
  generation are separate rows with distinct primary codes; `alt_codes` is only for
  alternate codes of the *same* unit.

## Type casts (seed-generation rule, not a template-filling one)

Whoever/whatever turns this filled template into seed SQL must cast every literal in every
`WITH v(...) AS (VALUES ...) SELECT ... INSERT` block explicitly (`::integer`, `::numeric`,
`::text`) — a `WITH ... VALUES` CTE's column type comes from the literals present in that
column, independent of the eventual INSERT target, unlike a bare `INSERT ... VALUES (...)`.
A column that's `NULL` on *every* row of a filled template (this project's Golf IV and León
seeds both hit it on their all-NULL NCAP columns) has no typed literal to infer from,
defaults to `unknown`/text, and the INSERT fails. `validate-template.mjs` flags these
columns as a WARNING so you know before generating SQL, but the actual fix is in the
generator, not the template — see the `import-car` skill.

## NULL over invention (rule 7)

Leave a cell empty when a value is genuinely unknown. Never fabricate NCAP percentages,
specs, dimensions, prices, fault text, or configurations. "Complete" means every area was
*considered* — filled where real data exists, empty where it does not — not that every
field ends up non-empty. If this car has a row in the old flat `vehicles` table, copy its
attributes from there (real data, don't re-author); if it's genuinely new, author from a
real source.
