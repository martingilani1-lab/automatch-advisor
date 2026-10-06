# Catalog import status

Read this first when picking up catalog_ schema / car-import work. Keep it current at the
end of each session — this is a living snapshot, not a historical record (git history is
the record; see CLAUDE.md "Adding a new car / model — RULES").

Last updated: 2026-10-06. RLS is enabled with public-read policies on all 17 catalog
tables the Supabase advisor flagged (confirmed live: `rls_on = true`, 1 select policy
each), and `catalog_engines.DXDB` (1.5 eTSI 110kW) now has `hybrid_type = 'MHEV'`
confirmed live — both closed, details folded out of Open items below.

## Catalog state (live counts)

| | count |
|---|---|
| brands | 5 |
| models | 34 |
| generations (distinct model + generation_code) | 49 |
| phases (pre-facelift/facelift rows) | 86 |
| configs (`catalog_vehicle_configurations`) | 1510 |
| engines (`catalog_engines`) | 117 |
| transmission units (`transmission_units`) | 73 (15 actually referenced by a live config) |
| body types | 11 |
| drivetrain systems | 25 |
| trims | 290 |
| trim features | 929 |
| component faults | 38 |
| phase×body dimension rows | 139 |

Platform distribution (86 phases): MQB 32, MQB-A0 16, MQB Evo 18, PQ34 16, PQ35 2, PQ26 2.
Includes Golf VIII (CD1), Octavia IV (NX), and the `DQ400e` transmission unit (now live,
notes filled), none of which were reflected in the previous snapshot.

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

- **Audi A3 (8Y)**: seeded and live (`20261005220000_seed_audi_a3_8y.sql` run; 46/46
  configs, all 12 engines and 6 transmission units confirmed used, `batch-verify` PASS) —
  but real attribute/spec gaps remain, confirmed live 2026-10-06:
  - **Phase attributes** (11 null columns, identical on both Pre-facelift and Facelift):
    `ncap_year`, `ncap_adult_pct`, `ncap_child_pct`, `ncap_pedestrian_pct`,
    `ncap_safety_assist_pct`, `towing_capacity_kg`, `avg_market_price_eur`,
    `price_range_min_eur`, `price_range_max_eur`, `typical_mileage_range`,
    `resale_value_rating`. Not a "never tested" case like the PQ34-era cars below —
    `safety_rating` is already 5, these specific figures just haven't been sourced yet.
  - **Dimensions** (8 null columns, identical on all 4 phase×body rows — 2 phases ×
    Hatchback 5-door / Sedan 4-door): `ground_clearance_mm`, `curb_weight_kg`,
    `boot_capacity_liters`, `boot_max_liters`, `gross_vehicle_weight_kg`, `payload_kg`,
    `fuel_tank_capacity_liters`, `seats_count`.
  - **Engines**: of the 12 live rows, `DTRD`/`DADA`/`DFFA` are fully specified; the other 9
    (`DLAA`, `DLAB`, `DFYA`, `DGEA`, both `DKZA` rows, both `DNFC` rows, `DNWC`) are each
    missing at least one of `torque_nm`/`cylinders`/`emission_standard`/`timing_type`/
    `engine_oil_capacity_liters`/`timing_replacement_km`. `DLAA` (81kW) and `DKZA` (150kW)
    are also missing `display_name` — 2 of 5 engine rows missing it catalog-wide
    (the other 3: `DNFB`/245, `DNPA`/150, `DNPA`/195).
  None of this blocks anything currently live (NULL over invention, rule 7) — it's a
  real-source-data enrichment pass still pending for this car.
- **MQB Evo hybrid/eHybrid gap — partially closed**: Golf (CD1), Octavia (NX), and A3
  (8Y) now carry real MHEV/PHEV engines with `hybrid_type` correctly set (`DLAB` 1.0
  eTSI → `MHEV`, `DFYA` 1.5 eTSI → `MHEV`, `DGEA` 1.4 eHybrid → `PHEV`). `DXDB` (1.5 eTSI
  110kW — one `catalog_engines` row, reused by 6 configs across 5 generations: Terramar,
  Kodiaq PS, Superb PY ×2 body types, Passat CJ, Tiguan CT) also now has `hybrid_type =
  'MHEV'` (`20261006120000_set_dxdb_hybrid_type_mhev.sql`, run and confirmed live
  2026-10-06). Still zero hybrid/PHEV engines on Passat (CJ), Superb (PY), Tiguan (CT),
  Kodiaq (PS), León/Cupra León (KL), Formentor (KM7), Terramar, Multivan (T7), Caddy
  (SB) beyond that one shared `DXDB` row — real eHybrid/PHEV variants exist for several
  of these (Passat GTE, Tiguan eHybrid, Cupra León VZe, Formentor VZe) and aren't seeded.
- **RLS — done**: all 17 tables the Supabase advisor flagged as exposed now have RLS
  enabled with one public-read policy each (`20261006110000_enable_rls_public_read.sql`,
  run and confirmed live 2026-10-06: `rls_on = true`, 1 select policy, on every one of
  the 17). No write policy on any table — the service-role key the app actually uses
  bypasses RLS and needs none; a write still requires it. The old flat
  `vehicles`/`engines`/`transmissions` tables weren't in the flagged 17 and already had
  RLS enabled — untouched.
- **`transmissions_faults_backup` — candidate to drop, no action taken**: a backup table
  sitting in `public` (now RLS-enabled alongside everything else, but still dead weight)
  and not referenced by any route handler or script. An earlier approximate row-count
  listing showed 0, but that figure comes from Postgres's `pg_class.reltuples` estimate —
  the same mechanism that under-reported `drivetrain_systems` earlier this session (3
  vs. the real 25) — so its actual row count hasn't been confirmed with a real `count(*)`
  yet. Flagging for a future `DROP TABLE` migration, file-only, human-run per the
  standing destructive-SQL rule, after that count is actually confirmed — not dropping
  it now, just noting it so it doesn't get rediscovered cold.
- **Attribute-completeness audit** (last full re-run 2026-10-05, covered 46 of the current
  49 generations — Golf CD1, Octavia NX, and A3 8Y were added after that pass and aren't
  reflected below; A3 8Y's real gaps are itemized separately above): no generation has
  exactly 1 NULL attribute. 37 of 46 have zero gaps. 7 (Octavia 1U, Golf 1J, León 1M,
  Toledo 1M2, A3 8L, Bora 1J, New Beetle 9C — all pre-NCAP-era) each have exactly 8: the 4
  NCAP percentage columns × 2 phases, a real "never tested" gap, not an error. Octavia 1Z
  has exactly 2 (`ncap_safety_assist_pct` on both phases — that metric postdates its 2004
  test). Audi TT (8N) has exactly 10 (the same 4 NCAP% × 2 phases, plus
  `towing_capacity_kg` — plausible for a 2-seat sports car, not yet confirmed either way).
  A re-run across all 49 generations (including CD1/NX) is still owed.
