# Car intake document

One markdown document, sections **A through I**, that `scripts/intake-to-template.mjs`
parses directly into the machine-format CSVs (`car.csv`, `phases.csv`, `dimensions.csv`,
`engines.csv`, `transmissions.csv`, `drivetrains.csv`, `configs-<phase>.csv`, `trims.csv`,
`trim_features.csv`, `faults.csv`) and resolves every `INHERIT` directive in the same pass.
This is the format the parser actually accepts — not an aspirational sketch — verified
against the real worked example in §10 below.

**Two ways to use this file**: write a document in this exact shape and run
`node scripts/intake-to-template.mjs <doc.md> scripts/cars/<slug>/`, or skip this file
entirely and fill the CSVs by hand (see this folder's own `README.md`). Both converge on the
same CSV shape; nothing downstream cares which one produced it. The markdown path is
recommended whenever this car shares phase attributes, dimensions, or a config matrix with a
sibling phase or platform-mate car — that's exactly what `INHERIT` is for.

Section headers in the document must be literally `## A.` through `## I.` (the parser splits
on the letter, not the title text after it — the title words below are just for readability).

## A. CAR

A single key/value table:

```markdown
## A. CAR
| field | value |
|---|---|
| brand | Audi |
| brand_country | Germany |
| model | A4 |
| segment | D |
| origin_country | german |
```

`brand`/`model` REUSE the exact existing live spelling if the row already exists (`Škoda`,
never `Skoda`) — check first. `origin_country` is lowercase. **This isn't just a style
note**: the parser normalizes (lowercase, diacritics stripped, whitespace stripped) this
`brand`/`model` against every live `catalog_brands`/`catalog_models` name and STOPs if it
matches one under a different spelling — `Skoda` when the live row is `Škoda` is a STOP, not
a silently-accepted near-duplicate. This same catalog_brands uniqueness is also enforced at
the schema level (a normalized unique index, see `20261008150000_freeze_vocab_and_brand_dedup.sql`).

## B. PHASES

One `### <phase_label>` block per phase, each a key/value table with exactly `phases.csv`'s
own column names as `field` values, optionally followed by a bare `INHERIT phase attributes`
line (see §9):

```markdown
## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | B9 |
| phase_label | Pre-facelift |
| year_from | 2015 |
| year_to | 2019 |
| display_name | A4 (B9) Pre-facelift |
| platform_code | MLB Evo |
| safety_rating | 5 |
| ncap_year | 2015 |
| ncap_adult_pct | 89 |
| ncap_child_pct | 87 |
| ncap_pedestrian_pct | 75 |
| ncap_safety_assist_pct | 75 |
| price_range_min_eur | 13000 |
| avg_market_price_eur | 18500 |
| price_range_max_eur | 32000 |
| typical_mileage_range | 80000 - 220000 km |
| resale_value_rating | holds_well |
| towing_capacity_kg | 1800 |

### Facelift
| field | value |
| ... |
INHERIT phase attributes FROM Audi A4 B9 Pre-facelift
```

`generation_code` is the real **chassis/platform code** (`B9`, `5G`, `8N`) — never a
roman-numeral marketing generation (`VII`). The `### <phase_label>` heading text must match
that block's own `phase_label` field exactly — the parser STOPs on a mismatch (a cheap
consistency check, since the heading is otherwise redundant with the table). `typical_mileage_range`
gets normalized to the live convention (`"<N> - <M> km"`) automatically — you may write
shorthand like `150k-300k` and the parser expands it.

## C. BODIES × PHASE

One `### <phase_label>` block per phase, EITHER a multi-row table (own `phase` column —
note: literally `phase`, not `phase_label`, in this table's header only) covering every body
for that phase, OR one-or-more bare `INHERIT dimensions` lines with no table at all (for a
phase whose bodies are 100% inherited):

```markdown
## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Sedan 4-door | 4726 | 1842 | 1427 | 135 | 1450 | 480 | 965 | 5 | 1965 | 515 | 54 |
| Pre-facelift | Estate | 4725 | 1842 | 1434 | 135 | 1535 | 495 | 1495 | 5 | 2095 | 560 | 54 |

### Facelift
INHERIT dimensions FROM Audi A4 B9 Pre-facelift / Sedan 4-door EXCEPT length_mm = 4762
INHERIT dimensions FROM Audi A4 B9 Pre-facelift / Estate EXCEPT length_mm = 4762
```

**`body_type` must be one of the live `catalog_body_types` names, quoted exactly** — REUSE
the real spelling wherever the body genuinely is one of them. Confirmed live as of this
writing: `Cabriolet 2-door`, `Coupe 2-door`, `Estate`, `Hatchback 3-door`, `Hatchback 5-door`,
`Liftback`, `MPV 5-door`, `Roadster 2-door`, `Sedan 4-door`, `SUV 5-door`, `SUV Coupe 5-door`
— this list grows; re-check live, don't assume it's complete or still current. **An
unrecognized `body_type` is a STOP, not a soft warning** — `Estate 5-door` when the live
name is `Estate` is exactly the near-duplicate mistake this guards against (it happened in
an earlier draft of the worked example in §10, which is why this note exists). The only way
to introduce a genuinely new body type is a standalone `NEW BODY: <name>` line anywhere in
this section — it survives into `dimensions.csv` as a `# NEW BODY: <name>` leading comment,
so `validate-template.mjs` (which never sees this document, only the CSV) honors the same
declaration. `seats_count` lives HERE, not on a phase — it varies by body, not just by phase
(a TT Coupe seats 4, the Roadster seats 2).

## D. ENGINES

One row per engine variant — either a full table row, or (for an engine that's already
fully specified live) the shorthand `REUSE <code>@<power_kw>kW` as a bare line, no table row
needed:

```markdown
## D. ENGINES
| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km | distinct_reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CVNA | 110 | petrol | NULL | 1.4 TFSI 110kW | NULL | 1395 | 250 | L4 | Euro6 | belt | 4.0 | 120000 | NULL |

REUSE CJZB@63kW
```

Notes:
- **There is no `reuse_or_new` column in this document** — the parser determines REUSE/NEW
  itself by querying the live DB for `(code, power_kw)` (also checking `alt_codes`), the
  same matching key as `reconcile.mjs`. A code that matches another engine's `alt_codes`
  instead of a primary code is a COLLISION → STOP, same as `reconcile.mjs`'s own check.
- **`distinct_reason` (optional column, intake-document-only — never written to
  `engines.csv`/the DB)**: before accepting a brand-new engine code as `NEW`, the parser
  checks whether a LIVE engine under a DIFFERENT code already shares the same
  `displacement_cc` + `power_kw` + `torque_nm` + `fuel_type` + `emission_standard` +
  `timing_type` (rows with no `displacement_cc` are skipped — a NULL key would otherwise
  collapse unrelated engines together). A match is a STOP — `possible duplicate of
  CODE@kW (models…)` — unless this cell has a non-empty reason (anything, e.g.
  `DISTINCT: <why this is a genuinely different engine>`). This caught a real case: several
  of the Audi A4 (B9)'s own engines (`CVNA`, `CVKB`, `DETA`, `DEUA`, `DKNA`, `DMSA`) share an
  exact spec with an already-live MQB-platform code under a different number — reviewed and
  confirmed genuinely distinct engines by Martin after the Part 1 reference-data audit, not
  a mistake, so this is the real, expected shape of a legitimate escape-hatch case, not a
  hypothetical one.
- **`REUSE <code>@<power_kw>kW`** only ever references an engine that must already exist
  live — it's a shorthand to avoid retyping a fully-known engine's columns, not a way to
  create one. If it doesn't resolve live, that's a STOP (use a full table row for a
  genuinely NEW engine instead).
- The literal 4-character token `NULL` in any cell means genuinely-empty (distinct from a
  cell you just haven't filled in yet) — it becomes a blank CSV cell, same meaning
  everywhere downstream (`generate-seed.mjs`'s `nOrNull`/`sOrNull`).
- `emission_standard` must already be one of the live frozen values
  (`Euro1`..`Euro6`,`Euro6c`,`Euro6d`,`Euro6e`, no space) — this document doesn't validate
  that itself (that stays `validate-template.mjs`'s job, run after this script), but a bad
  value here will surface as an ERROR there.
- Engines that genuinely differ by emissions generation (Euro 2 → Euro 3) or hardware
  revision are separate rows with distinct primary codes — `alt_codes` is only for the
  *same physical unit at the same power*.
- `hybrid_type` `MHEV` covers both 12V and 48V mild hybrid systems — the voltage isn't a
  separate axis in this schema; if it matters for a specific engine, say so in
  `display_name` or a fault/note, not by inventing a new `hybrid_type` value.

## E. GEARBOXES

A single-column table, header `unit_code`:

```markdown
## E. GEARBOXES
| unit_code |
|---|
| ML401 |
```

Every `unit_code` must already exist in `transmission_units` (matched by `code` or
`alt_codes`) — **never match by speed count** (a "5-speed manual" is not evidence of the
same unit). A `unit_code` with no live match STOPs the whole run: there is no "create
inline" path, a new gearbox is its own reviewed migration, done before this car's intake.

**This document and `intake-to-template.mjs` never create `transmission_units`,
`drivetrain_systems`, `catalog_body_types`, or `catalog_brands` rows, and never will** —
those four are shared reference data that only ever comes from their own reviewed
migrations (see CLAUDE.md's "Adding a new car / model" rules). `catalog_engines` is the one
exception that stays CREATE-able from this document, now gated by the `distinct_reason`
near-duplicate check above.

**Before authoring a new `transmission_units` or `drivetrain_systems` migration**, check it
against live near-duplicates first:
```
node scripts/audit-reference-duplicates.mjs --check-new transmissions "<maker>" "<family>" <speeds>
node scripts/audit-reference-duplicates.mjs --check-new drivetrains "<maker>" "<type>"
```
Exits 1 and prints the matching live row(s) if one shares (maker, family, speeds) /
(type, maker) — only when `<maker>` is non-null; a NULL maker is always skipped, since it
makes that grouping meaningless noise (confirmed by the Part 1 audit). Pass
`--distinct "<reason>"` once you've confirmed it's genuinely a different unit; put that
reason in the new migration's own header comment (not a DB column). `validate-template.mjs`
also runs the same check as a global safety net on every car's validation (maker non-null
groups only) against `scripts/known-distinct-reference-groups.json` — a baseline of
already-reviewed groups (seeded from Part 1's findings) — so a near-duplicate that slipped
through without the preventive script still gets caught on the next car import. Add a newly
reviewed group to that JSON file once you've confirmed it's distinct.

## F. DRIVETRAIN

A single-column table, header `drivetrain`:

```markdown
## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |
| quattro_ultra |
```

Every code except `FWD` must already exist in `drivetrain_systems` (same STOP discipline as
gearboxes — shared reference data, never created inline). **`FWD` is the implicit "no AWD
system" default** — list it here if you want a human-readable reminder that the car has a
FWD variant, but the parser always drops it before writing `drivetrains.csv` (it's never a
real `drivetrain_systems` row, and `drivetrains.csv`'s own convention is to omit it entirely
for an FWD-only car). You can equally just omit this whole section for an FWD-only car.

## G. CONFIG MATRIX

One `**<Phase label> (<year range>):**` heading per phase, each followed by EITHER one bullet
line per real factory combination, OR a single `INHERIT configs` line:

```markdown
## G. CONFIG MATRIX

**Pre-facelift (2015 – 2019):**
- Pre-facelift: CVNA 110kW + ML401 / DL382 + FWD → [Sedan 4-door, Estate]
- Pre-facelift: CYRB 185kW + DL382 + quattro_ultra → [Sedan 4-door, Estate]

**Facelift (2019 – 2024):**
INHERIT configs FROM Audi A4 B9 Pre-facelift EXCEPT no CVNA
```

A bullet line is `<Phase label>: <code> <power_kw>kW + <gearbox[ / gearbox ...]> + <drivetrain[ / drivetrain ...]> → [<body>, <body>, ...]`
— the leading `<Phase label>:` must match the enclosing heading. A `/` between gearboxes or
drivetrains means genuinely separate real combinations, never collapse them into one line
(matching the "manual/DSG" convention from the old hand-fill CSVs). Bodies are the real
subset for THIS engine/gearbox/drivetrain combination specifically, not every body the car
has — a high-output engine usually did not come in every body. See §9 for `INHERIT configs`'s
exact rules (platform-matching, body restriction, the one supported `EXCEPT no <code>` form).

**Every gearbox and drivetrain a bullet line uses must already be declared in E / F (or be
`FWD`)** — a bullet is free text, so nothing else enforces this, and a stale copy of this
section after E or F changes (e.g. a drivetrain code gets renamed) is exactly the mistake
this check exists to catch. A gearbox or drivetrain used here but missing from its
dictionary section is a STOP.

## H. TRIMS

One table, columns `name`, `tier`, `phase`, `features`:

```markdown
## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Basis | 1 | Pre-facelift, Facelift | 16/17-inch alloy wheels, xenon/LED headlights, 3-zone deluxe climate control. |
```

`phase` may be a comma-joined list — one trims.csv row per phase is written automatically.
`features` is free prose, split into separate `trim_features.csv` rows on top-level commas
(a comma inside parentheses, e.g. `(10.1-inch touch in Facelift)`, stays attached to its
feature — known limitation: a feature description with a genuine internal comma would
mis-split; there's no delimiter convention in this format to disambiguate that, so write
around it if it comes up). **`is_optional` has no signal in this format at all** — every
parsed feature defaults to `false` (standard). `INHERIT trims` is never supported, with or
without `FORCE` — trims are always written out explicitly, per phase, every time.

## I. FAULTS

One table, columns `component_type`, `target_code`, `fault`, `severity`:

```markdown
## I. FAULTS
| component_type | target_code | fault | severity |
|---|---|---|---|
| gearbox | DL382 | Clutch vibration and mechatronic solenoid valve clogging. | moderate |
| engine | CWGD | Rocker arm bearing wear if oil changes were neglected. | severe |
```

`component_type` is `engine` or `gearbox` in this document (`gearbox` is translated to the
real schema's `transmission` on write — the schema itself has never used the word
"gearbox"). There's no `target_power_kw` column here — for an `engine` fault, the parser
looks `target_code` up against this same document's own section D by code and fills it in
automatically; if that code is absent or ambiguous in section D, that's a STOP (never
guessed). `severity` must be `critical`/`moderate`/`minor` — not enforced by this script
(same boundary as `emission_standard`, see §D), but will be an ERROR in
`validate-template.mjs` afterward if it isn't.

---

## 9. `INHERIT` / `FORCE` / `EXCEPT`

```
INHERIT [FORCE] <group> FROM <brand> <model> <generation> <phase> [/ <body>] [EXCEPT <overrides>]
```

Resolves against **this same document first** (earlier blocks, by textual order), then the
live DB. Fills only empty target cells — never overwrites a value you wrote explicitly.
A source that can't be resolved, or an `EXCEPT` form that isn't supported for its group,
**STOPs the whole conversion — zero files written**, not a partial one. Every filled cell
gets a provenance note in the review printout.

- **`phase attributes`** — source: same model+generation only (a sibling phase of the SAME
  car). Copies exactly `safety_rating`, every `ncap_*` field, `towing_capacity_kg` — nothing
  else. **Never** `price_range_min_eur`/`price_range_max_eur`/`avg_market_price_eur`/
  `typical_mileage_range`/`resale_value_rating` — those must always be given explicitly in
  the target phase's own table.
- **`dimensions`** — source: same model+generation+body_type, unless `FORCE` lifts all
  three (`INHERIT FORCE dimensions FROM ...` — needed to inherit from a different model, or
  a different body on the same car). Copies the 11 real dimension columns (everything on
  `dimensions.csv` except `phase_label`/`body_type` themselves). `EXCEPT <field> = <value>`
  overrides one copied field after the copy — only a field from that same 11-column list is
  valid.
- **`configs`** — source: any phase sharing the same `platform_code` (model/generation
  unconstrained — reflects how gearbox/engine combinations are genuinely shared across
  platform-mate cars, e.g. the same MQB Evo engine+gearbox pairing reused across several
  different cars in this catalog). Copies the whole engine × gearbox × drivetrain matrix,
  keeping only rows whose body is among the TARGET phase's own declared bodies (a body the
  target doesn't have is silently dropped, not an error). **`EXCEPT no <code>` is the one
  supported override** — removes that engine's rows entirely from the copied matrix.
  Multiple exclusions chain as repeated `EXCEPT no <code>` clauses
  (`EXCEPT no CVNA, EXCEPT no CSWB`). Confirmed rule: this is allowed whenever the result
  stays a subset of the source (which "no `<code>`" always guarantees, since it only ever
  removes) — any other `EXCEPT` form on a `configs` INHERIT is unsupported and STOPs (no
  field-value override exists for this group; real facelift-to-facelift drift tends to be
  cell-level engine/gearbox changes, not expressible that way regardless).
- **`trims`** — inheritance is never supported, `FORCE` or not. Always explicit, every
  phase, every time.

## 10. Worked example — the real Audi A4 (B9) intake document

This is a real document, not a hypothetical — every rule above was checked against it. As
shown here (after `ML401`/`DL382`/`AL552` were added to `transmission_units`, and `torsen_t3`
was resolved to the already-live `quattro_torsen` — the real B9 V6 Tiptronic quattro system,
confirmed the same physical thing, not a new one), it runs through `intake-to-template.mjs`
with **0 STOPs**, all 32 `INHERIT` fills applied correctly, every file written. Still useful
to re-run after any change to this file or the script, as a known-clean baseline — a
regression would show up as a STOP where there wasn't one before.

Running it further through `reconcile.mjs`/`validate-template.mjs` (this script's own job
stops at INHERIT + REUSE/NEW + transmission/drivetrain resolution, deliberately — see §9)
still correctly surfaces this document's two remaining real content issues, both pre-existing
in the source data, neither this script's responsibility to catch: `emission_standard`
`'Euro 6'` (the space — `validate-template.mjs`'s job, not this one's) and fault `severity`
`'severe'` (not in the `critical`/`moderate`/`minor` vocabulary). Both would need fixing
before a real seed could be generated from this document.

```markdown
# Intake — Audi A4 (B9)

## A. CAR
| field | value |
|---|---|
| brand | Audi |
| brand_country | Germany |
| model | A4 |
| segment | D |
| origin_country | german |

## B. PHASES

### Pre-facelift
| field | value |
|---|---|
| generation_code | B9 |
| phase_label | Pre-facelift |
| year_from | 2015 |
| year_to | 2019 |
| display_name | A4 (B9) Pre-facelift |
| platform_code | MLB Evo |
| safety_rating | 5 |
| ncap_year | 2015 |
| ncap_adult_pct | 89 |
| ncap_child_pct | 87 |
| ncap_pedestrian_pct | 75 |
| ncap_safety_assist_pct | 75 |
| price_range_min_eur | 13000 |
| avg_market_price_eur | 18500 |
| price_range_max_eur | 32000 |
| typical_mileage_range | 80000 - 220000 km |
| resale_value_rating | holds_well |
| towing_capacity_kg | 1800 |

### Facelift
| field | value |
|---|---|
| generation_code | B9 |
| phase_label | Facelift |
| year_from | 2019 |
| year_to | 2024 |
| display_name | A4 (B9) Facelift |
| platform_code | MLB Evo |
| price_range_min_eur | 21000 |
| avg_market_price_eur | 28500 |
| price_range_max_eur | 48000 |
| typical_mileage_range | 30000 - 120000 km |
| resale_value_rating | holds_well |

INHERIT phase attributes FROM Audi A4 B9 Pre-facelift

## C. BODIES × PHASE

### Pre-facelift
| phase | body_type | length_mm | width_mm | height_mm | ground_clearance_mm | curb_weight_kg | boot_capacity_liters | boot_max_liters | seats_count | gross_vehicle_weight_kg | payload_kg | fuel_tank_capacity_liters |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Sedan 4-door | 4726 | 1842 | 1427 | 135 | 1450 | 480 | 965 | 5 | 1965 | 515 | 54 |
| Pre-facelift | Estate | 4725 | 1842 | 1434 | 135 | 1535 | 495 | 1495 | 5 | 2095 | 560 | 54 |

### Facelift
INHERIT dimensions FROM Audi A4 B9 Pre-facelift / Sedan 4-door EXCEPT length_mm = 4762
INHERIT dimensions FROM Audi A4 B9 Pre-facelift / Estate EXCEPT length_mm = 4762

## D. ENGINES
*(Note: Longitudinal EA211, EA888 Gen3/Gen3b, and EA288/EA897 diesels. Timing replacement is NULL for chain-driven engines).*

| code | power_kw | fuel_type | hybrid_type | display_name | alt_codes | displacement_cc | torque_nm | cylinders | emission_standard | timing_type | engine_oil_capacity_liters | timing_replacement_km |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CVNA | 110 | petrol | NULL | 1.4 TFSI 110kW | NULL | 1395 | 250 | L4 | Euro 6 | belt | 4.0 | 120000 |
| CVKB | 140 | petrol | NULL | 2.0 TFSI ultra 140kW | DEMA | 1984 | 320 | L4 | Euro 6 | chain | 5.2 | NULL |
| CYRB | 185 | petrol | NULL | 2.0 TFSI 185kW | DKNA | 1984 | 370 | L4 | Euro 6 | chain | 5.2 | NULL |
| CWGD | 260 | petrol | NULL | 3.0 TFSI S4 260kW | NULL | 2995 | 500 | V6 | Euro 6 | chain | 7.5 | NULL |
| DEUA | 110 | diesel | NULL | 2.0 TDI 110kW | DEUB | 1968 | 320 | L4 | Euro 6 | belt | 4.7 | 210000 |
| DETA | 140 | diesel | NULL | 2.0 TDI 140kW | DESA | 1968 | 400 | L4 | Euro 6 | belt | 4.7 | 210000 |
| CSWB | 160 | diesel | NULL | 3.0 TDI 160kW | NULL | 2967 | 400 | V6 | Euro 6 | chain | 6.1 | NULL |
| CRTC | 200 | diesel | NULL | 3.0 TDI 200kW | NULL | 2967 | 600 | V6 | Euro 6 | chain | 6.1 | NULL |

## E. GEARBOXES
| unit_code |
|---|
| ML401 |
| DL382 |
| AL552 |

## F. DRIVETRAIN
| drivetrain |
|---|
| FWD |
| quattro_ultra |
| quattro_torsen |

## G. CONFIG MATRIX

**Pre-facelift (2015 – 2019):**
- Pre-facelift: CVNA 110kW + ML401 / DL382 + FWD → [Sedan 4-door, Estate]
- Pre-facelift: CVKB 140kW + DL382 + FWD → [Sedan 4-door, Estate]
- Pre-facelift: CYRB 185kW + DL382 + quattro_ultra → [Sedan 4-door, Estate]
- Pre-facelift: CWGD 260kW + AL552 + quattro_torsen → [Sedan 4-door, Estate]
- Pre-facelift: DEUA 110kW + ML401 / DL382 + FWD → [Sedan 4-door, Estate]
- Pre-facelift: DETA 140kW + ML401 / DL382 + FWD → [Sedan 4-door, Estate]
- Pre-facelift: DETA 140kW + DL382 + quattro_ultra → [Sedan 4-door, Estate]
- Pre-facelift: CSWB 160kW + DL382 + quattro_torsen → [Sedan 4-door, Estate]
- Pre-facelift: CRTC 200kW + AL552 + quattro_torsen → [Sedan 4-door, Estate]

**Facelift (2019 – 2024):**
INHERIT configs FROM Audi A4 B9 Pre-facelift EXCEPT no CVNA, EXCEPT no CSWB, EXCEPT no CRTC

## H. TRIMS
| name | tier | phase | features |
|---|---|---|---|
| Basis | 1 | Pre-facelift, Facelift | 16/17-inch alloy wheels, xenon/LED headlights, 3-zone deluxe climate control, MMI Radio plus with 7-inch display (10.1-inch touch in Facelift). |
| sport | 2 | Pre-facelift | 17-inch wheels, sport front seats, aluminum interior accents, sport radiator grille in twilight gray. |
| design | 2 | Pre-facelift | 17-inch wheels, chrome exterior package, specific interior fabric, comfort-oriented setup. |
| advanced | 2 | Facelift | Replaced sport/design in Facelift. 17-inch alloy wheels, matte aluminum exterior package. |
| S line | 3 | Pre-facelift, Facelift | 18-inch wheels, S line sport suspension (-20mm), S sport bumpers, illuminated door sills, sport seats with embossed S logo. |

## I. FAULTS
| component_type | target_code | fault | severity |
|---|---|---|---|
| gearbox | DL382 | Clutch vibration and mechatronic solenoid valve clogging due to premature fluid degradation in severe stop-and-go driving. | moderate |
| engine | CWGD | Rocker arm bearing wear on early EA839 V6 engines leading to camshaft scoring and misfires if oil changes were neglected. | severe |
| engine | DETA | Coolant leak from the vacuum-controlled coolant pump shroud (water pump housing) requiring complete assembly replacement. | moderate |
```

---

## Rules / common mistakes

- **NULL over invention.** An unknown value stays the literal token `NULL` (or just blank
  in a hand-filled CSV). Never fabricate NCAP percentages, specs, dimensions, prices, fault
  text, or a configuration that "probably" existed.
- **Split an engine into two rows when hardware or emissions generation genuinely changed**
  (Euro 2 → Euro 3, a turbo/hardware revision) — e.g. `AGR`/`ALH` are two rows, not one with
  `alt_codes`. `alt_codes` is only for the **same physical unit at the same power**.
- **Never match a gearbox by speed count.** A "5-speed manual" is not evidence of the same
  unit as another 5-speed manual already in the DB — match by the real code (or `alt_codes`)
  against `transmission_units` only.
  - A gearbox with no matching `transmission_units` row **STOPS the import** — it does not
    get created inline as part of this car's seed.
- **Mark body availability honestly.** No estate version just because the estate body type
  exists elsewhere in the car's lineup, and no GTI trim in an estate body if it never
  existed from the factory — every line in section G is a real factory combination, not a
  plausible one.
- **Check live spellings before inventing a new name** — brand, model, and body-type names
  all REUSE the exact existing spelling if the row already exists (`Škoda` not `Skoda`,
  `Hatchback 5-door` not `5-door Hatchback`). Query first, never assume. This is also
  machine-checked now (normalized brand/model match → STOP; `catalog_brands` additionally
  has a schema-level normalized-uniqueness index).
- **A brand-new engine that looks like it duplicates an already-live one under a different
  code is a STOP**, not a silent CREATE — see section D's `distinct_reason` note above. Fill
  in `distinct_reason` once you've confirmed (e.g. a different physical casting/platform
  installation) it's genuinely a different engine; don't fill it in just to make the STOP
  go away without actually checking.
- **An `alt_code` that's actually someone else's real primary code is always wrong** — this
  is checked for `catalog_engines` (`validate-template.mjs` checks 8/9) and, as of this
  rule, for `transmission_units` too, globally, not just within this car's own template.
- **Reconcile before writing anything.** Whether you use the markdown path or fill the CSVs
  by hand, every engine and gearbox gets checked against the live DB (automatically, if
  using `intake-to-template.mjs`; via `node scripts/reconcile.mjs` otherwise) before the
  seed is generated — REUSE/CREATE for engines, RESOLVED/MISSING (never CREATE) for
  gearboxes.
