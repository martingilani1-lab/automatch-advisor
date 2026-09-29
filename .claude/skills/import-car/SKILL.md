---
name: import-car
description: Importing/adding one new car (a model, its phases, configurations, engines, transmissions, trims, faults and attributes) into AutoMatch's catalog_ schema from a human-supplied spec. Use whenever the task is to add or seed a car/model/generation into the catalog_ tables. Produces reviewable seed SQL files and a REUSE/CREATE reconcile table; never executes destructive SQL.
---

# Importing a car into the catalog_ schema (AutoMatch)

The guardrail RULES are in CLAUDE.md → "Adding a new car / model — RULES". This skill is
the ordered mechanics. If a step here conflicts with a rule there, the rule wins.

## Before you start
- **Current schema (settled):** per-body dimensions live in `phase_body_dimensions`, keyed
  by `(phase_id, body_type_id)`: `length_mm`, `width_mm`, `height_mm`,
  `ground_clearance_mm`, `curb_weight_kg`, `boot_capacity_liters`, `boot_max_liters`,
  `gross_vehicle_weight_kg`, `payload_kg`, `fuel_tank_capacity_liters`, and `seats_count`.
  These columns are NOT on `catalog_phases` (both move migrations have run). `seats_count`
  moved here specifically because it varies by body, not just by phase — the Audi TT (8N)
  Coupe seats 4 (2+2), the Roadster seats 2, and a single phase-level value can't represent
  both. Everything else phase-level (NCAP, towing, prices, mileage, resale, `platform_code`)
  stays on `catalog_phases`.
- If MCP is unavailable, ask the human to run the read queries and paste results.
- **Use the intake template + its scripts** (`scripts/new-car-template/`, read its own
  README first) instead of taking the spec free-form in chat: it's the pre-seed checklist
  that guarantees every attribute area gets *addressed*, and three read-only scripts do the
  reconcile, the config-grid columns, and a pre-seed sanity check for you — `node
  scripts/reconcile.mjs`, `node scripts/gen-config-grid.mjs`, `node
  scripts/validate-template.mjs`. The template folder is disposable working state per car,
  refilled each time — the committed seed migration is the permanent record, not the
  template.

## Steps

1. **Human supplies the full spec.**
   - Phases, including the facelift boundary and `platform_code`.
   - Configurations (phase × body × engine × transmission × drivetrain) — real factory
     combinations only.
   - Engines: code, power, torque, cylinders, emission standard, timing type, oil capacity.
   - Transmissions (real gearbox codes), drivetrain system.
   - Trims + features, component faults.
   - Attributes: model (segment, origin_country); phase (NCAP, towing, prices, mileage,
     resale); phase × body (dimensions, weight, boot, GVW, payload, fuel tank, seats);
     config (0-100, top speed, consumption, CO2, EV specs); media; tires.
   - **Source of attributes — check the old `vehicles` table first.** Query it (live,
     read-only) for the car. If it has an old `vehicles` row (~334 legacy cars): COPY its
     attributes from that row — it is real data, do not re-author it. If it has no old row
     (a genuinely new car): author fresh from a real source supplied by the human. Either
     way, a genuinely unknown value stays NULL — never guessed.
   - Old→new mapping when copying: `typical_milage_range` (sic) → `typical_mileage_range`;
     old per-generation dimensions/boot/weight go to `phase_body_dimensions`, duplicated
     onto each real body of the phase (per-body precision is authored later).
   - Anything the human doesn't supply stays NULL — do not fill gaps by guessing.

2. **Reconcile → REUSE/CREATE table.** Run `node scripts/reconcile.mjs` — it queries the
   live DB for every engine (`code`, `power_kw`, and `alt_codes`) and transmission (`code`)
   in the filled `engines.csv`/`transmissions.csv`, prints the REUSE/CREATE table with
   resolved ids, and flags alias collisions (a code that's already another row's primary
   code or already sits in another row's `alt_codes` — the León `BCB`→`AUS` case). Doing
   this by hand instead is fine too, but match on the same keys:
   - **Engine** = `(code, power_kw)`, also checking `alt_codes`.
   - **Transmission** = the real gearbox `code` — **NEVER speed count** (a "5-speed manual"
     is not evidence of the same unit as another 5-speed manual already in the DB).
   - **Drivetrain system** = `code`.
   Get human sign-off on the table before writing any seed.

3. **Seed, in dependency order**, into review-only file(s) in `supabase/migrations/`
   (timestamp-prefixed, comments explain *why*):
   brand/model (reuse if present) → phases → NEW dictionary entries only (engines,
   transmissions, drivetrain) → configurations → trims/features → component faults →
   attributes (model, phase, phase × body dimensions) → media → tires.
   - Resolve every FK by code/name via subquery or CTE — never a hand-typed UUID.
   - Idempotency: `ON CONFLICT` only where a real unique constraint exists; otherwise
     `INSERT … WHERE NOT EXISTS`.
   - Row-count guards (`get diagnostics` + raise) on any UPDATE of existing rows.
   - Destructive steps (UPDATE of existing data, DROP, DELETE): one transaction,
     verify-before-drop, human-run only.
   - **ALWAYS cast every literal in every `WITH v(...) AS (VALUES ...) SELECT ... INSERT`
     block explicitly** — `::integer`, `::numeric`, `::text`, matching each target column.
     This is not optional and not case-by-case: a `VALUES`-CTE's column type is inferred
     from the literals present in *that column alone*, independent of the eventual INSERT
     target, unlike a bare `INSERT ... VALUES (...)` (which takes its types straight from
     the target table). A column that's `NULL` on every row of the car being seeded — the
     Golf IV and León seeds both hit this on their all-NULL NCAP columns — has no typed
     literal anywhere to infer from, defaults to `unknown`/text, and the INSERT fails with
     "column X is of type integer but expression is of type text". Cast every literal from
     the start; don't wait to hit the error. `validate-template.mjs` (next bullet) warns
     about columns that are empty on every row so you see this before generating SQL, but
     the fix belongs in the generator, every time, not as a one-off patch.
   - Before finalizing, run `node scripts/validate-template.mjs` against the filled
     template: it catches config rows referencing an engine/gearbox not in the template,
     fault severities outside `critical`/`moderate`/`minor`, orphan engines never used in
     any config, and the all-NULL-column warning above. Fix reported problems before
     generating the seed, not after.

4. **Verify** (after the human runs it, via live read queries):
   - filter by `generation_code`; config count per phase matches the spec;
   - zero duplicate dictionary rows (engines grouped by `(code, power_kw)`, transmissions
     by `code`, each count 1);
   - attributes populated, or explicitly NULL where unknown.

5. **Human runs it** — each file in a FRESH SQL editor tab. A stale or uncommitted
   transaction left open in an old tab silently swallows writes: "Success, no rows
   returned" with the data missing means an uncommitted transaction from a previous run,
   not a no-op — don't re-interpret it as "nothing needed to happen." Verify in the live DB
   after running, and commit. Run `npm test` after any write that could affect scoring.

## Done means
Every attribute area was addressed: filled where real data exists, NULL where genuinely
unknown. Not "every field non-null".
