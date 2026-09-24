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
  `ground_clearance_mm`, `curb_weight_kg`, `boot_capacity_liters`, `boot_max_liters`, plus
  `gross_vehicle_weight_kg`, `payload_kg`, `fuel_tank_capacity_liters`. These columns are
  NOT on `catalog_phases` (the move migration has run). Everything else phase-level (NCAP,
  seats, towing, prices, mileage, resale, `platform_code`) stays on `catalog_phases`.
- If MCP is unavailable, ask the human to run the read queries and paste results.

## Steps

1. **Human supplies the full spec.**
   - Phases, including the facelift boundary and `platform_code`.
   - Configurations (phase × body × engine × transmission × drivetrain) — real factory
     combinations only.
   - Engines: code, power, torque, cylinders, emission standard, timing type, oil capacity.
   - Transmissions (real gearbox codes), drivetrain system.
   - Trims + features, component faults.
   - Attributes: model (segment, origin_country); phase (NCAP, seats, towing, prices,
     mileage, resale); phase × body (dimensions, weight, boot, GVW, payload, fuel tank);
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

2. **Reconcile → REUSE/CREATE table.** Query the live DB for every engine
   (`code`, `power_kw`, and `alt_codes`), transmission (`code`) and drivetrain (`code`).
   Present a REUSE/CREATE table and get human sign-off before writing any seed.

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

4. **Verify** (after the human runs it, via live read queries):
   - filter by `generation_code`; config count per phase matches the spec;
   - zero duplicate dictionary rows (engines grouped by `(code, power_kw)`, transmissions
     by `code`, each count 1);
   - attributes populated, or explicitly NULL where unknown.

5. **Human runs it** — each file in a FRESH SQL editor tab — verifies in the live DB, and
   commits. Run `npm test` after any write that could affect scoring.

## Done means
Every attribute area was addressed: filled where real data exists, NULL where genuinely
unknown. Not "every field non-null".
