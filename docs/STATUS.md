# Catalog import status

Read this first when picking up catalog_ schema / car-import work. Keep it current at the
end of each session — this is a living snapshot, not a historical record (git history is
the record; see CLAUDE.md "Adding a new car / model — RULES").

Last updated: 2026-11-18 (VW ID.3 (E1) imported; completion pass 4 written for review, see Open items). Before: 2026-11-15 (Renault Zoe Phase 2 completion). Earlier: 2026-11-04. Octavia II (1Z) completed (Pre-facelift 47 + Scout 2, Facelift 61 +
Scout 5 configurations) and the "dilemma" schema landed: driven axle, HEV / CNG, bi-fuel second
fuel, NEDC/WLTP test cycle, towing + curb weight per configuration, off-road hardware on
drivetrain systems, ladder-frame chassis, ISOFIX / optional seats / loading sill, DPF / GPF /
AdBlue (strict for new diesel rows via `catalog_engines_diesel_flags_check`), and the
"Estate Cross" / "Hatchback Cross" body types. The import template carries all of it (see "The
pipeline" below). Open, human-run: `20261104223000` (DPF / AdBlue for the 47 remaining diesels,
then VALIDATE the strict rule for every row) and `20261104230000` (vocabulary drift-check lookup
fix) -- both before the next car import.

## Catalog state (live counts)

| | count |
|---|---|
| brands | 5 |
| models | 35 |
| generations (distinct model + generation_code) | 50 |
| phases (pre-facelift/facelift rows) | 88 |
| configs (`catalog_vehicle_configurations`) | 1653 |
| engines (`catalog_engines`) | 143 |
| transmission units (`transmission_units`) | 77 (19 actually referenced by a live config) |
| body types | 13 |
| drivetrain systems | 25 |
| trims | 299 |
| trim features | 1696 |
| component faults | 839 |
| phase×body dimension rows | 145 |

Platform distribution (88 phases): MQB 32, MQB-A0 16, MQB Evo 18, PQ34 16, PQ35 2, PQ26 2,
MLB Evo 2. MLB Evo is new this snapshot — Audi A4 (B9)'s 2 phases (Pre-facelift/Facelift),
14 engines, and 3 transmission units (`Audi DL382`, `Audi ML401`, `ZF AL552` — also new
this snapshot, added via the linking-audit workflow earlier this session, notes approved
and live).

Models seeded: Škoda Octavia/Fabia/Scala/Kamiq/Karoq/Kodiaq/Superb; Volkswagen
Golf/Bora/New Beetle/Polo/T-Cross/Taigo/Passat/Tiguan/Touran/Multivan/Caddy/Arteon/T-Roc/ID.3;
SEAT León/Toledo/Ibiza/Arona/Ateca/Tarraco; Audi A3/TT/Q2/Q3/A1/A4; Cupra León/Formentor/
Terramar.

## The pipeline

One car at a time (or several, via the batch scripts), always in this order:

1. **Intake** — two paths, both converge on the same `scripts/cars/<slug>/*.csv` shape;
   nothing downstream cares which one produced its input.
   - **1a (markdown path):** write an A–J markdown intake doc (see
     `scripts/new-car-template/INTAKE.md`) and run
     `node scripts/intake-to-template.mjs <doc.md> scripts/cars/<slug>/` — fills every CSV,
     including `configs-<phase>.csv`, and resolves every `INHERIT` directive (phase
     attributes, dimensions, config matrix — never trims) against earlier blocks in the
     same document first, then the live DB. Missing/ambiguous source → STOP, zero files
     written. Recommended whenever the car shares phase attributes, dimensions, or a config
     matrix with a sibling phase or platform-mate car — that's exactly what `INHERIT` is
     for. Step 2 (`gen-config-grid.mjs`) becomes a harmless no-op afterward, since this path
     already wrote the config grid(s) directly (its own "already has an `x` mark, skip
     unless `--force`" guard just no-ops).
   - **1b (manual path, unchanged):** copy `scripts/new-car-template/` to
     `scripts/cars/<slug>/`, fill the CSVs by hand (car, phases, dimensions, engines,
     transmissions, drivetrains, trims, faults). See that folder's own `README.md` for the
     file-by-file guide. Fine for a car simple enough that writing a markdown doc is
     overhead.
2. **`node scripts/gen-config-grid.mjs <dir>`** — pre-generates the config grid's columns
   from the filled dimensions/transmissions/drivetrains, so columns are never hand-typed.
   Mark the grid, then:
3. **`node scripts/reconcile.mjs <dir>`** — resolves REUSE/CREATE against the live DB for
   every engine and transmission unit_code. A MISSING unit_code is a hard STOP — add it via
   its own reviewed migration first (see the transmission_units linking-audit workflow);
   there is no CREATE path for transmissions.
4. **`node scripts/validate-template.mjs <dir>`** — structural checks before generating
   SQL: config rows reference real engines/gearboxes, fault severities sane, orphan
   engines, all-NULL columns flagged (the VALUES-CTE cast trap), body types vs live, the
   dilemma fields' format / vocabulary (`scripts/catalog-template-fields.mjs`), NEW diesels
   carrying DPF + AdBlue, and `config_facts.csv` rows matching a marked grid cell (bi-fuel
   pair and braked ≥ unbraked mirror the live CHECKs).
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
- **Duplicate-prevention** (added 2026-10-08, after the reference-data audit below): a NEW
  engine matching a live one under a different code (same displacement/power/torque/fuel/
  emission_standard/timing_type) STOPs unless marked `distinct_reason`; brand/model names
  are checked against live data under normalization (lowercase, diacritics/whitespace
  stripped); an `alt_code` can never equal another row's real primary code (now checked for
  `transmission_units` too, not just `catalog_engines`); the car-import path never creates
  `transmission_units`/`drivetrain_systems`/`catalog_body_types`/`catalog_brands` rows — use
  `node scripts/audit-reference-duplicates.mjs --check-new ...` before authoring a new one
  of those, and `scripts/known-distinct-reference-groups.json` as the reviewed-baseline for
  `validate-template.mjs`'s ongoing safety-net scan.
- **Frozen vocabulary — single source of truth**: every enum-like column
  (`fuel_type`/`cylinders`/`emission_standard`/`timing_type`/`hybrid_type` on
  `catalog_engines`, `severity` on `catalog_component_faults`, `segment` on
  `catalog_models`, `resale_value_rating` on `catalog_phases`) is checked against ONE file,
  `scripts/catalog-vocabularies.json`, by BOTH `intake-to-template.mjs` (STOPs at
  conversion time) and `validate-template.mjs` (ERRORs at CSV-validation time) — update
  that file in the same commit as any migration that changes one of these CHECK
  constraints. `validate-template.mjs` additionally checks that JSON file itself against
  the LIVE constraint definition (via the `catalog_check_constraint_def` RPC,
  `20261008160000_add_check_constraint_introspection_rpc.sql`) — an ERROR on drift, a WARN
  if that RPC migration hasn't been run yet. This is the generalized fix for the exact
  failure mode that let `emission_standard` silently drift into two spellings before
  `20261006140000` caught it.

## Open items

- **VW ID.3 (E1) Pre-facelift (2020–2022) + Facelift (2023–2026) imported (2026-11-18).** Research + all
  decisions (V1–V8, W1–W12): `docs/intake/research/vw-id3-e1.md`. Live via MCP after Martin's review:
  `20261118120000` (gearbox rows `VW 0MH` for the APP310 / `EBJ` cars and `generic:Single-speed EV (MEB 2024)` for
  the 2024+ `EDC` / `EDF` / `EEW` cars, both Volkswagen Group, rating 5; the pair added to
  `scripts/known-distinct-reference-groups.json`) and `20261118120500` (new model ID.3, segment C; 2 phases E1 / MEB;
  9 engines `EBJ-45kWh@110`, `EBJ-58kWh@107`, `EBJ-58kWh@150`, `EBJ-77kWh@150` — the last two shared by both phases —,
  `EDC-52kWh@125`, `EDC-59kWh@150`, `EDC-77kWh@170`, `EDF-79kWh@210`, `EEW-79kWh@240`, all rated 4; 4 + 7
  configurations; trims Easy (SK 10/2022) and Pure / Pro / Pro S / GTX (CZ 11/2024), 50 features; 19 faults incl. the
  2022–2025 HV-battery recalls). Market: Pre-facelift SK 17 490 / 19 990 / 22 490 (27 ads), Facelift CZ 25 554 / 28 701
  / 32 765 (19 ads). Tag rules re-run (preview: only ID.3 pending): `green_zone` on all 11 configurations, `isofix_3x` on
  both phases; segment C, so no `city_commuter`. `npm test` 144/144. Open: **ID.3 Neo** (2nd facelift, from 07/2026:
  `EEJ` motor, 50 / 58 LFP and 79 kWh NMC) deferred until it has a used market; ground clearance; 12 V battery repair
  cost; four-letter VW motor codes (ADAC gives only `EBJ` / `EDC` …); the 2021–2025 SK / CZ dealer price lists are 404 and
  were read as search text only.
- **VW ID.3 (E1) completion — pass 4 (faults) (2026-11-18).** Findings + decisions X1–X7:
  `docs/intake/research/vw-id3-e1-completion.md`. **Live** (Martin approved, via MCP): `20261118200000` (INSERT, 6 Pre-facelift
  vehicle faults: CO2 A/C / heat-pump circuit, brakes at the HU, front wishbone bushes, rear drive-shaft click, charging flap,
  recall 93J9); read back, tag preview nothing pending, `npm test` 144/144. **Live** (Martin ran it): `20261118200500`
  (UPDATE: battery-recall texts split into campaigns 93MI / 93MF, 14 rows; 12 V cost 456 € on 2 rows); read back, `npm test`
  144/144. Decision X8 (independent-shop costs from Martin, source M): `20261118220000` ran (dealer-topped ranges + the
  sticking-rear-drum brake text, 120 / 760); `20261118223000` rolled back, SUPERSEDED. **Live** (Martin ran it 2026-11-19, read
  back, `npm test` 144/144): `20261119090000` (UPDATE top-up: 12 V 160 / 250, charging flap 80 / 180, rear drive shaft
  150 / 300). Front wishbone bushes stay NULL.
  **Second session 2026-11-19 (items 2–4):** **live** `20261119100000` (INSERT via MCP: Pre-facelift trims Pure / Pro /
  Pro S from the VW ČR list of 16.07.2021, 46 features; read back, `npm test` 144/144); **live, Martin ran them**
  `20261119100500` (DELETE: old trim "Easy" + 24 features) and `20261119110000` (UPDATE: market Pre-facelift SK 17 000 / 19 990 / 22 490 `27,000 - 172,000 km`,
  Facelift CZ 26 040 / 28 701 / 32 765; Facelift ground clearance 150 mm from VW Norway; Pre-facelift stays NULL). Decided:
  heat pump stays `optional` on the EBJ motors (CZ 2021 standard → trim feature), the 02/2024 "Pro People" action model
  not added as a trim, W1 / W2 unchanged, 4-seat Pro S closed via the con + trim feature. **Waiting for Martin:**
  `20261119120000` (UPDATE, 1 row: facelift Pure "Park Pilot" safety slug `parking_assist` → `reversing_detection`). Motors stay 4,
  gearboxes 5. **Completion brief closed 2026-11-19**: `npm test` 144/144 after the last write; remaining NULLs are approved
  (Pre-facelift ground clearance, front wishbone bush cost).

- **Renault Zoe (X10) Phase 2 is at i3 depth (2026-11-15).** Research + all 13 decisions:
  `docs/intake/research/renault-zoe-x10-completion.md`. Both files live and read back:
  `20261115200000` (14 new faults: motor-bearing wear, A/C compressor, front suspension, rusting
  discs, R135 12 V, five dated recalls 0DA5 / 0DKQ / 0EBN / 0D9V / 0E1E; ran via MCP) and
  `20261115200500` (towing 0, CZ market 13 430 / 16 000 / 22 340, mileage 10,860 – 128,329 km, curb
  1 502 → 1 577, GVW 1 988, payload 486, motor rating 3 + notes / pros / cons, fault costs and
  probabilities, trims Life / Zen / Intens rewritten from the Renault SK price lists and
  "R.S. Line / Iconic" deleted; Martin ran it). Tag-rule preview: nothing pending catalog-wide, the
  Zoe keeps `city_commuter` + `green_zone`. `npm test` 144/144. Open: E-Tech trims 2022–2024 (no SK /
  CZ list found), battery cooling `active_air` unverified, 12 V / suspension / brake / heat-pump repair
  costs unknown.
- **Renault Zoe (X10) Phase 1 (2013–2019) imported (2026-11-15).** Research + decisions:
  `docs/intake/research/renault-zoe-x10-phase-1.md`. Live via MCP after Martin's review:
  `20261115220000` (new gearbox row `generic:Single-speed EV (Zoe Ph1)`, rating 5) and `20261115220500`
  (phase, body, 6 engines `Q210`, `R240`, `R90-22kWh`, `R90-41kWh`, `Q90`, `R110-41kWh` — the live
  `R110` stays the 52 kWh Phase 2 motor — 6 configurations, trims Life / Intens with 23 features from
  the Renault SK brochure 12/2016, 26 faults incl. 6 recalls). Tag rules re-run: `city_commuter` +
  `green_zone` on all 6 configurations, `isofix_3x` on the phase. `npm test` 144/144. Open: charger /
  A/C / suspension / 12 V repair costs, Q90 production dates, battery cooling medium, Zen / Bose /
  Limited trims (DE / NL only), SK market (5 listings).

- **BMW i3 REx (range extender) is in the catalog (2026-11-15).** 6 engines (`hybrid_type = 'EREV'`,
  `fuel_type = 'electric'`), 6 configurations, 28 faults (`20261115120000`, after the vocabulary
  migration `20261115100000`), yearly maintenance €30–65 (`20261115140000`, Martin ran it), and
  `city_commuter` + `green_zone` from re-running the tag rules (`20261102233000`,
  `20261112140000`). No 120 Ah REx in Europe. Research: `docs/intake/research/bmw-i3-i01-rex.md`.
  Still open for the i3: facelift 94 Ah range (live 290 km vs Martin's 300 km, 2026-11-10), REx
  phase-price / 60 Ah premium decisions, pre-facelift price max (€15 000 < 94 Ah asking prices),
  FIELD-LEVELS secondary-consumption condition "bi-fuel or EREV".

- **Intake v3 — field levels and research passes (2026-11-12), documents done, scripts next.**
  `scripts/catalog-field-levels.json` (rendered to `docs/intake/FIELD-LEVELS.md` by
  `scripts/render-field-levels.mjs`) says which fields are required / conditional / optional;
  `docs/intake/RESEARCH-PROCESS.md` is the five-pass research process with gates, Perplexity
  budget and the NULL / N/A / 0 / M conventions; the research pack is renamed
  `scripts/new-car-template/RESEARCH-PACK.md` (tool-agnostic, per pass). **Next (step 2):**
  `intake-to-template.mjs` accepts `N/A`, `source` columns and sections K / M; `validate-template.mjs`
  reads the field-levels JSON and STOPs on an empty required field without an approved exception;
  the parser reads pack sections D2 / E / F service + ratings, H2 feature groups and trim
  safety slugs, which today are lost between research and seed. Pilot: BMW i3 (I01).
- **Tag-rule migrations must be re-run after every car seed** (all `ON CONFLICT DO NOTHING`). New
  `20261112140000_seed_ev_city_commuter_tag.sql` (review-only): every electric A/B-segment
  configuration gets `city_commuter`, whatever its kW.

- **Reference-data duplicate-prevention audit (2026-10-08) — closed, pipeline guards now
  live.** `scripts/audit-reference-duplicates.mjs` (read-only, run anytime for a fresh
  report) checked `catalog_engines`/`transmission_units`/`drivetrain_systems`/
  `catalog_brands`/`catalog_models` for near-duplicates and the free-text vocabulary columns
  for spelling/format variants. Findings: a handful of engine pairs sharing displacement/
  power/fuel under different codes (several explained by Audi's longitudinal MLB Evo codes
  vs. shared transverse MQB codes at the same nominal spec — real, distinct part numbers,
  not a mistake), one `transmission_units` group (`VW 02J`/`VW 02K`, same maker/family/
  speeds) and four `drivetrain_systems` groups (`haldex_gen4`/`haldex_gen5`,
  `4matic_trans`/`4matic_long`, `htrac`/`hk_dynamax`, `jlr_active_driveline`/
  `jlr_idd_long` — generation/variant splits), zero `alt_code` collisions, zero brand/model
  spelling collisions, and zero vocabulary spelling variants in `resale_value_rating`/
  `timing_type`/`cylinders`/`fuel_type`/`hybrid_type`/`severity`/`segment`. **Martin's
  decision: every flagged pair/group is genuinely distinct — keep, change nothing.** All
  current groups are recorded in `scripts/known-distinct-reference-groups.json` so the new
  `validate-template.mjs` safety net doesn't re-flag them. Pipeline guards (engine
  near-duplicate CREATE check, gearbox/drivetrain safety net, brand/model normalization,
  transmission_units `alt_code` collision) are live in `intake-to-template.mjs`/
  `validate-template.mjs` — see Standing rules above. `20261008150000_freeze_vocab_and_brand_dedup.sql`
  (CHECK constraints on `catalog_component_faults.severity`/`catalog_engines.cylinders`/
  `catalog_models.segment`/narrowed `catalog_engines.fuel_type`, a normalized unique index
  on `catalog_brands.name`, plus `catalog_phases`/`catalog_trims`/`catalog_trim_features`
  uniqueness and a `catalog_phases` year-range CHECK added along the way) **run and
  confirmed live 2026-10-08** (three real live-run failures fixed in place before it went
  green — `unaccent()` called before `CREATE EXTENSION`, then the two-arg
  `unaccent(regdictionary, text)` form needing the dictionary name schema-qualified as
  `'extensions.unaccent'` since Supabase installs contrib extensions into their own
  `extensions` schema, not `public`). **Duplicate-prevention (Parts 1–3): done.** The
  `catalog_check_constraint_def` RPC (`20261008160000`, drift-detection) is written and
  precondition-verified but **not yet run**.
  - **Separate, unrelated to-do surfaced along the way**: 64 `transmission_units` rows have
    `maker IS NULL` (mostly `generic:*` placeholder codes and real units like the Porsche
    PDK/Mercedes-AMG/ZF/Aisin/Honda/Toyota/Renault/Ford families never backfilled with a
    maker) — for Martin to fill at his own pace; a NULL maker exempts a row from the
    gearbox near-duplicate safety net entirely (not a cleanup blocker, just reduced
    detection coverage until filled).
- **Audi A4 (B9)** — seeded and live (`20261008122941_seed_audi_a4_b9.sql` run, confirmed
  2026-10-08: `batch-verify` PASS on every check — 24/24 Pre-facelift configs, 16/16
  Facelift configs, all 14 engines and all 3 transmission units used, all 4 phase×body
  dimension rows present, no DRAFT-prefixed reference notes anywhere). First MLB Evo
  platform car in the catalog, and the first car authored via the markdown
  `intake-to-template.mjs` path (step 1a) end-to-end rather than hand-filled CSVs —
  proved out the INHERIT grammar for `phase attributes` (Facelift inheriting NCAP/safety
  rating from Pre-facelift) and `dimensions` (both Facelift body rows inheriting from
  Pre-facelift with a `length_mm` `EXCEPT` override for the facelift's longer front/rear
  bumpers). No attribute gaps — every phase/dimension/engine field from Martin's intake
  was filled or explicitly NULL (NULL over invention, rule 7); not yet covered by a full
  attribute-completeness re-run (see that item below).
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
- **`transmissions_faults_backup` — keep for now, drop decision tied to retiring the old
  `transmissions` table**: 594 rows, a manual pre-cleanup snapshot of the legacy
  `transmissions` table's `cons`/`common_faults` columns, taken outside this repo's
  pipeline (no migration or script anywhere in this repo created it — confirmed by full
  grep + `git log --all -p`). Verified live 2026-10-06, every row checked against the
  current `transmissions` table by id: 0 rows missing, 404 identical, 190 changed —
  and every one of those 190 changed only by removing generic scheduled-maintenance
  lines ("fluid change at Xk km", "oil service", "service history", etc.), confirmed
  exhaustively (two successive pattern sweeps over every dropped array item across all
  594 rows left zero unmatched). No real fault or con was lost. Not safe to drop in
  isolation yet only because it still sits in `public` as its own table — the plan is to
  drop it together with the old `transmissions` table once that's retired, not
  separately. RLS is enabled on it in the meantime (see above).
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
