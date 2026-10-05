# Catalog import status

Read this first when picking up catalog_ schema / car-import work. Keep it current at the
end of each session — this is a living snapshot, not a historical record (git history is
the record; see CLAUDE.md "Adding a new car / model — RULES").

Last updated: 2026-10-05.

## Catalog state (live counts)

| | count |
|---|---|
| brands | 5 |
| models | 34 |
| generations (distinct model + generation_code) | 46 |
| phases (pre-facelift/facelift rows) | 81 |
| configs (`catalog_vehicle_configurations`) | 1418 |
| engines (`catalog_engines`) | 111 |
| transmission units (`transmission_units`) | 72 |
| body types | 11 |
| drivetrain systems | 25 |
| trims | 286 |
| trim features | 909 |
| component faults | 38 |
| phase×body dimension rows | 129 |

Platform distribution (81 phases): MQB 32, MQB-A0 16, MQB Evo 13, PQ34 16, PQ35 2, PQ26 2.

Models seeded: Škoda Octavia/Fabia/Scala/Kamiq/Karoq/Kodiaq/Superb; Volkswagen
Golf/Bora/New Beetle/Polo/T-Cross/Taigo/Passat/Tiguan/Touran/Multivan/Caddy/Arteon/T-Roc;
SEAT León/Toledo/Ibiza/Arona/Ateca/Tarraco; Audi A3/TT/Q2/Q3/A1; Cupra León/Formentor/
Terramar.

## The pipeline

One car at a time (or several, via the batch scripts), always in this order:

1. **Intake**: copy `scripts/new-car-template/` to `scripts/cars/<slug>/`, fill the CSVs
   (car, phases, dimensions, engines, transmissions, drivetrains, trims, faults). See that
   folder's own `README.md` for the file-by-file guide.
2. **`node scripts/gen-config-grid.mjs <dir>`** — pre-generates the config grid's columns
   from the filled dimensions/transmissions/drivetrains, so columns are never hand-typed.
   Mark the grid, then:
3. **`node scripts/reconcile.mjs <dir>`** — resolves REUSE/CREATE against the live DB for
   every engine and transmission unit_code. A MISSING unit_code is a hard STOP — add it via
   its own reviewed migration first (see the transmission_units linking-audit workflow);
   there is no CREATE path for transmissions.
4. **`node scripts/validate-template.mjs <dir>`** — structural checks before generating
   SQL: config rows reference real engines/gearboxes, fault severities sane, orphan
   engines, all-NULL columns flagged (the VALUES-CTE cast trap), body types vs live.
5. **`node scripts/generate-seed.mjs <dir>`** (or `batch-seed.mjs` for several cars at
   once) — generates the review-only seed `.sql` into `supabase/migrations/`. Casts every
   VALUES-CTE literal explicitly, guards every destructive step, asserts post-condition
   counts. Never executes anything.
6. **Human reviews and runs the migration(s)** — in a fresh SQL editor tab each time (a
   stale/uncommitted transaction silently swallows writes).
7. **`node scripts/batch-verify.mjs <dir>` (or `--all`)** — post-seed, read-only: config
   count per phase, zero duplicate dictionary rows, no orphan engines, every declared
   transmission unit_code both resolves live AND is actually used AND has non-NULL
   reliability_note/maintenance_note, phase×body attribute rows present.
8. Commit the seed migration(s). The filled `scripts/cars/<slug>/` folder is disposable
   working state — it is **not** committed (see that folder's own README).

`batch-prep.mjs` runs steps 2–4 across every folder in one pass with one consolidated
report, for reviewing several cars' decisions at once before generating anything.

## Standing rules (see CLAUDE.md for the authoritative text)

- Reconcile against the LIVE DB, never against migration files on disk.
- Engine match key: `(code, power_kw)`, also checking `alt_codes`. Transmission match:
  real gearbox code against `transmission_units.code`/`alt_codes` — never speed count.
- A gearbox with no matching `transmission_units` row STOPS the import. No inline CREATE
  path for transmissions; `transmission_units` is shared reference data.
- Engines that differ by emissions generation (Euro 2/3) or hardware get separate primary
  codes, never folded into `alt_codes`.
- Destructive SQL (UPDATE of existing data, DROP, DELETE) stays file-only, human-run,
  always guarded on exact row counts before AND after.
- NULL over invention — an unknown attribute stays NULL, including `generation_code`
  itself for a car with no real one (see `genCodeSql` in `generate-seed.mjs`: `is null`,
  never a literal `= ''`).
- Every `WITH v(...) AS (VALUES ...) SELECT ... INSERT` casts every literal explicitly
  (`::integer`/`::numeric`/`::text`) — a VALUES-CTE infers its column type from the
  literals in that column alone, so an all-NULL column silently becomes `unknown`/text and
  the INSERT fails. This bit Golf IV, León, Toledo, and Audi A3 before it was baked into
  `generate-seed.mjs` for good.

## Open items

- **Audi A3 (8Y)**: no `scripts/cars/` folder exists, not seeded. The old flat `vehicles`
  table has an "A3 (8Y)" row, but the catalog_ schema does not. Not yet picked up in the
  MQB sweep — gap, not a decision.
- **MQB Evo hybrid/eHybrid gap**: every MQB Evo config (94 rows across 13 phases: Passat
  CJ, Superb PY, Tiguan CT, Kodiaq PS, León KL, Cupra León KL, Formentor KM7, Terramar,
  Multivan T7, Caddy SB) has `fuel_type` of only `petrol` or `diesel` — zero hybrid/PHEV/
  electric engines anywhere in this set, even though several of these cars have real
  eHybrid/PHEV variants (Passat GTE, Tiguan eHybrid, Cupra León VZe, Formentor VZe).
  Confirmed via `fuel_type` directly, not engine-code naming.
- **Cupra Terramar**: `generation_code` is still NULL, waiting on the real chassis code
  from Martin. `batch-verify.mjs` flags this as a FAIL on purpose (not auto-passed) until
  supplied. `platform_code` is already correctly `MQB Evo`.
- **Attribute-completeness audit** (re-run 2026-10-05): no generation has exactly 1 NULL
  attribute. 37 of 46 have zero gaps. 7 (Octavia 1U, Golf 1J, León 1M, Toledo 1M2, A3 8L,
  Bora 1J, New Beetle 9C — all pre-NCAP-era) each have exactly 8: the 4 NCAP percentage
  columns × 2 phases, a real "never tested" gap, not an error. Octavia 1Z has exactly 2
  (`ncap_safety_assist_pct` on both phases — that metric postdates its 2004 test). Audi TT
  (8N) has exactly 10 (the same 4 NCAP% × 2 phases, plus `towing_capacity_kg` — plausible
  for a 2-seat sports car, not yet confirmed either way).
