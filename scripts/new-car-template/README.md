# New-car intake template

Blank pre-seed checklist for adding one car to the `catalog_` schema (see the `import-car`
skill and CLAUDE.md "Adding a new car / model — RULES"). Filling this in completely, before
any SQL is written, means no engine, config or attribute goes missing. Nothing here seeds
anything — the review-only seed migration is written from these files afterwards, by hand or
with a generator script (see the `author-data-sql` skill), never executed automatically.

Copy this whole folder per car (e.g. `scripts/new-car-<model>/`) and fill it in. Lines
starting with `#` are guidance; delete them or leave them, they aren't read by anything.

## Files, in fill order

1. `car.csv` — brand, model, segment, origin.
2. `phases.csv` — one row per phase: facelift boundary, platform code, NCAP, prices,
   mileage, resale, seats, towing.
3. `dimensions.csv` — one row per phase × body: dimensions, weight, boot, GVW, payload,
   fuel tank.
4. `engines.csv` — every engine, marked REUSE or NEW.
5. `transmissions.csv` — every gearbox, marked REUSE or NEW.
6. `configs-example-prefacelift.csv`, `configs-example-facelift.csv` — the config grid,
   one file per phase (rename to `configs-<phase_label>.csv`; copy the file again for a
   third phase, etc.).
7. `trims.csv`, then `trim_features.csv`.
8. `faults.csv`.
9. `performance-per-config-DEFERRED.csv`, `tires-DEFERRED.csv`, `media-DEFERRED.csv` —
   optional, fill in only when real figures/images exist. Every column these tables need
   already exists in the schema; these files are here so nothing is forgotten later, not
   because they're required for a first import.

## Config grid

One grid per phase. Rows = engine (`code` + `power_kw`, matching a row in `engines.csv`).
Column headers = one body × gearbox × drivetrain combination, written
`BODY|GEARBOX|DRIVETRAIN` — e.g. `Estate|02M|haldex_gen1`, `3dr|02J|FWD`. `BODY` must match
a name in `dimensions.csv`, `GEARBOX` a code in `transmissions.csv`, and `DRIVETRAIN` is
`FWD`/`RWD` or a `drivetrain_systems` code.

The two example columns in each file are placeholders — delete them and add the real
columns for this car; the number of real combinations varies per car and per phase.

Mark `x` only in a cell where that exact combination really existed from the factory.
**Leave the cell empty otherwise.** An empty cell is what makes a missing real combination
*and* a phantom one (that never existed) visible, instead of silently absent.

**Body-availability warning:** don't mark a cell just because the engine and the gearbox
each separately existed — the specific body pairing has to be real too (e.g. a high-output
engine that only ever came in the 3-door body must have empty cells under every other body
column; there is no estate version just because the estate body type exists elsewhere in
the grid).

## Reuse vs new — check the live DB first

Query the LIVE DB (Supabase MCP, or the human queries and pastes the result) before marking
anything `reuse_or_new`. Never infer this from migration files — they may not have run, or
may have drifted.

- **Engine:** match by `code` + `power_kw`, and also check whether the code appears in
  another engine's `alt_codes`. REUSE if found under either.
- **Transmission:** match by the real gearbox `code` only. **NEVER match by speed count** —
  a "5-speed manual" is not evidence it's the same unit as another 5-speed manual already
  in the DB.
- **Drivetrain system:** match by `code`.
- Engines that genuinely differ by emissions generation (Euro 2 vs Euro 3) or hardware
  generation are separate rows with distinct primary codes; `alt_codes` is only for
  alternate codes of the *same* unit.

## NULL over invention (rule 7)

Leave a cell empty when a value is genuinely unknown. Never fabricate NCAP percentages,
specs, dimensions, prices, fault text, or configurations. "Complete" means every area was
*considered* — filled where real data exists, empty where it does not — not that every
field ends up non-empty. If this car has a row in the old flat `vehicles` table, copy its
attributes from there (real data, don't re-author); if it's genuinely new, author from a
real source.
