# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js version warning

This project pins `next@16.2.7`, which is newer than most training data and has breaking changes vs. the Next.js you may know (APIs, conventions, file structure). **Before writing or changing any Next.js-specific code** (routing, route handlers, config, data fetching), check `node_modules/next/dist/docs/` for the current API and heed any deprecation notices there.

## Stack & versions

Exact resolved versions (from `package-lock.json` — `next` and `react`/`react-dom` are pinned exact in `package.json`, not `^` ranges; treat that as deliberate, don't loosen them):

| package | version |
|---|---|
| next | 16.2.7 |
| react / react-dom | 19.2.4 |
| @supabase/supabase-js | 2.108.0 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | 4.3.0 |
| eslint | 9.39.4 |
| eslint-config-next | 16.2.7 (kept in lockstep with `next`) |

No state library beyond React's own `useState`/`useMemo` (no Redux/Zustand/Jotai/Context for app state). Test framework: vitest, scoped to a scoring-regression snapshot suite (see Commands). Package manager is npm (`package-lock.json`, lockfileVersion 3) — don't introduce a second lockfile (yarn.lock/pnpm-lock.yaml).

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)
- `npm test` — vitest, runs `tests/recommend.scoring.test.ts` (snapshots `calcResults` scoring output for 5 of the 20 `scripts/score-audit-profiles.json` profiles against frozen fixture cars). Run this after any DB write to confirm scoring hasn't shifted (see Supabase/data-access rules).

Environment variables (in `.env.local`, gitignored) required for the app to function: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. In practice every route handler uses the **service-role key** server-side (see Supabase/data-access rules below) — the anon key is present in the env but not currently read by any route handler.

## Architecture

This is a single-purpose Next.js App Router app: a car-buying advisor that walks a user through a quiz and recommends vehicles from a Supabase-backed catalog, plus a separate unscored browse experience ("Prehľad").

**Data store**: Supabase, 7 tables — `vehicles`, `engines`, `transmissions` (joined by `vehicle_id`), plus four reference/junction tables added since the original three: `safety_features`, `vehicle_safety_features`, `transmission_units`, `drivetrain_systems` (see table below). Accessed only from server-side route handlers via the **service-role key**; there is no server-side auth layer.

| table | rows | purpose |
|---|---|---|
| `vehicles` | 334 | primary catalog table — identity, dimensions, pricing, NCAP safety, `equipment_trims`/`body_variants`/`common_faults` (JSONB), `tags text[]` |
| `engines` | — | per-`vehicle_id`, one row per engine variant |
| `transmissions` | 594 | per-`vehicle_id`; `unit_id` FK → `transmission_units`; `drivetrain_id`/`engine_id` FKs exist but are unpopulated |
| `transmission_units` | 65 | reference table — real gearbox units (`code` unique, `family` CHECK-constrained) plus authored `reliability_note`/`maintenance_note` |
| `drivetrain_systems` | 0 | reference table, schema only — see Known Issues, can't be populated by string-matching |
| `safety_features` | 17 | reference vocabulary — 9 GSR2-mandated + 8 beyond-baseline, static, same for every car |
| `vehicle_safety_features` | — | presence-only junction (`vehicle_id, feature_slug, availability`) — absence means "not available," never an explicit negative |

**Route handlers** (`app/api/*/route.ts`):
- `cars/route.ts` (GET) — loads all vehicles + engines + transmissions and flattens/derives them into the `CarData` shape the frontend consumes (fuel types, best reliability, AWD flag, avg consumption, pricing, safety, etc.), plus a server-computed `categories: string[]` tag (every Path B category slug the car matches — see `CATEGORY_PREDICATES`). Supports optional query params (`category`, `fuel`, `transmission`, `drivetrain`, `brand`, `priceMin`, `priceMax`, `sort`) for direct API/curl use; `/prehlad` fetches it bare (no params) once and filters/sorts client-side off the `categories` tag instead of re-fetching per category. `page.tsx` also calls it bare on mount to populate its car list.
- `detail/route.ts` (POST, takes `{ vehicleId }`) — fetches full per-vehicle engine/transmission/fault/safety detail (richer than the `cars` payload) for the expanded card view, including the `transmission_units` join (`unit.reliability_note`/`unit.maintenance_note`) and per-car `vehicle_safety_features` rows (`sf[]`). Called lazily per-car from the frontend.
- `recommend/route.ts` (POST, takes the quiz `Answers` object) — the live scoring endpoint. Fetches vehicles server-side (same fetch+transform pattern as `cars/route.ts`), runs the full recommendation pipeline (`hardFilter` → `score*` → `scoreCar` → `calcResults`), and returns the top 10 `ScoredCar[]`. This is the source of truth for recommendation behavior — `page.tsx` calls it directly.
- `safety-features/route.ts` (GET) — serves the static `safety_features` reference vocabulary (17 rows, same for every car). Fetched once on mount by `PrehladView`, not per-vehicle.

**Frontend** (`app/page.tsx`, single client component, ~1500 lines): the quiz and results UI live here; the scoring engine itself lives server-side in `app/api/recommend/route.ts` (see above).
- `QUESTIONS` defines the 16-question quiz (`QuizQuestion[]`), driving a `phase` state machine: `hero → quiz → loading → results`.
- On mount, all cars are fetched once from `/api/cars` into a `DB` state array (used for the car-count display, not for scoring).
- Quiz answers accumulate into an `Answers` object keyed by question id.
- Once the quiz completes, `page.tsx` POSTs the `Answers` object to `/api/recommend`, which fetches vehicles, runs the recommendation pipeline (`hardFilter` → `scorePractical`/`scoreFinancial`/`scorePreference`/`scoreSafety` → `scoreCar` → `calcResults`), and returns the top 10 `ScoredCar[]`, already sorted and flagged with `isBest`.
- A few small pure helpers (`getResaleRelevance`, `getConsumptionForFuel`, `faultRelevant`) are intentionally duplicated in both `page.tsx` and `app/api/recommend/route.ts`, since both the server scorer and the client display code (score reasons, fault badges, displayed consumption) need them.
- Expanding a result card lazily calls `/api/detail` per vehicle and caches the response in `faultDB`.
- "Prehľad" (Path B) is a separate, unscored browse route at `/prehlad` (`app/prehlad/`), reached from a secondary hero link — not a `phase` of this component. It is unscored by design and must never call `/api/recommend` or show match percentages — only the quiz ranks cars. It has its own component set (`PrehladView`, `CarRow`, `CarDetail`, `FilterPanel`, `TagBar`) and its own DTO types (`app/prehlad/types.ts`) shaped around `/api/detail`'s richer per-variant payload. Shared RAW/NORMALISED car-field accessors (`carPriceMin`, `carRel`, etc.) live in `app/lib/carFields.ts`, imported by both `page.tsx` and the `/prehlad` components; filter-matching predicates live in `app/lib/carFilters.ts`; the lifestyle-tag vocabulary lives in `app/lib/tags.ts`.

When changing recommendation behavior, edit the pipeline in `app/api/recommend/route.ts` (`hardFilter` → `score*` functions → `scoreCar` → `calcResults`) — that's what actually drives the UI now. Don't change the `.slice(0, 10)` cutoff in `calcResults` without being asked, same as the score-cap rule below.

## Where new files go

- **New route handler**: `app/api/<name>/route.ts`, export `GET`/`POST` per Next's route-handler convention (check `node_modules/next/dist/docs/` first, per the version warning above). Instantiate its own `createClient(...)` inline (see Supabase/data-access rules) — there is no shared DB client module to import.
- **New Prehľad (browse) component**: `app/prehlad/<Name>.tsx`, PascalCase, default export. Add its DTO/prop types to `app/prehlad/types.ts` if it consumes `/api/detail` or `/api/safety-features` data; otherwise type it against the shared `CarData` from `app/lib/carFields.ts`.
- **New shared accessor/predicate** (used by both `page.tsx` and `/prehlad`, or reusable across `/prehlad` components): `app/lib/carFields.ts` (display/derivation off `CarData`) or `app/lib/carFilters.ts` (filter-matching predicates + `FilterOption` shapes) — follow whichever of the two the new function is closer to, don't create a third general-purpose lib file without a reason.
- **New quiz-only logic**: stays inline in `page.tsx` unless it's genuinely shared with `/prehlad`, matching the existing duplication convention noted above (`getResaleRelevance`, `getConsumptionForFuel`, `faultRelevant`).
- **New DB table**: a new file under `supabase/migrations/`, timestamp-prefixed (`YYYYMMDDHHMMSS_description.sql`), written for review — **never run it yourself**, the user runs migrations (see Supabase/data-access rules). Follow the existing frozen-vocabulary `CHECK` constraint pattern for any enum-like column (see `transmission_units.family`, `safety_features.category`).
- **New one-off data-authoring/backfill task**: `scripts/`, plain Node/TS, generate reviewable `.sql` to a file first. A pure additive `INSERT` seed MAY be executed via the Supabase MCP once the user has reviewed the file; anything touching `UPDATE`/`DELETE`/`ALTER`/schema stays file-only for the user to run (see Supabase/data-access rules).

## TypeScript & coding conventions

- `strict: true` in `tsconfig.json`, but the codebase is pragmatically **not** `any`-free — `any` is idiomatic for an untyped raw Supabase row inside a `.map()` transform (`vEngines.map((e: any) => ...)`) in route handlers, but should be **zero** in `.tsx` display components — type those against the shared `CarData`/`DetailData`/`SafetyFeature` shapes. Don't add `any` to a component's props or a utility function's signature; do use it freely for a raw untransformed DB row.
- `import type {...}` for type-only imports, kept on its own line even when importing both types and values from the same module (two `import` statements, not one merged one).
- Path alias `@/*` → repo root (see `tsconfig.json` `paths`). Prefer it over relative `../../` chains that cross top-level directories (`app/lib`, `app/prehlad`, etc.); same-directory imports use `./`.
- Naming: PascalCase for component files and their default-exported function; camelCase for utility functions/accessors (`carPriceMin`, `buildCar`); UPPER_SNAKE for module-level constant maps/whitelists (`ORIGIN_FLAGS`, `BODY_TILE_MAP`, `TILE_WHITELIST`).
- DB columns are snake_case (Postgres convention). Remap them to camelCase explicitly inside the route handler's transform function (`v.production_years` → `gen`/`years`) — the raw DB row shape should never leak past that transform into a type consumed by a component.
- Components: `export default function ComponentName(props: ComponentNameProps) { ... }` — function declarations, not arrow-function consts, not `React.FC`. Props typed via a colocated `interface XProps` directly above the component.
- Heavy *why*-not-*what* commenting is the strongest convention in this codebase — architectural rationale, explicit "this is deliberate, don't change it" callouts, and data-provenance notes are the norm, not the exception. Match that density in new code, especially near anything non-obvious.

## Supabase/data-access rules

- Every route handler instantiates its own client inline:
  ```ts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  ```
  There is no shared `lib/supabase.ts` client module and no repository/DAO layer — don't introduce one without being asked; the existing pattern is query-and-transform inline in the route handler.
- **Error handling is identical across all 4 route handlers** — match it exactly in any new one:
  ```ts
  try {
    const [aRes, bRes] = await Promise.all([...]);
    if (aRes.error) throw aRes.error;
    if (bRes.error) throw bRes.error;
    // ...transform...
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/route-name]", err);
    return NextResponse.json(<typed-empty-fallback>, { status: 500 });
  }
  ```
  Never let a raw Supabase error reach the client. The fallback shape must still type-check as valid output (`[]` for array endpoints, a fully-keyed-but-empty object for `detail`) — never `null`/`undefined`.
- A missing/not-yet-migrated table degrades gracefully via `.data || []`, not an explicit error check — e.g. `/api/detail`'s `vehicle_safety_features` query assumes a possibly-missing table just means "no rows" (every safety feature reads as unavailable) rather than a 500. Follow this pattern for any query against a table that might not exist yet in every environment.
- **The Supabase MCP server is live (read-write) and connected.** DB-access rules now split by what the SQL *does*, not a blanket no-execute rule:
  - **Reads MAY run directly via MCP, and should.** Prefer querying live state (row counts, schema, spot-checking data) over inferring it from migration files, which may not have been run yet or may have drifted from what actually executed.
  - **Additive `INSERT` seeds MAY be executed via MCP — but only after the user has reviewed the file.** Write the seed to `supabase/migrations/` (or via the `scripts/` CSV→SQL flow) exactly as before, get explicit sign-off on that file, then run it through MCP. Never execute a seed the user hasn't seen yet, even if asked to skip the review step.
  - **Destructive or schema-changing SQL is still file-only, agent-never-executes — this gate does not move.** `DROP`, `DELETE`, `TRUNCATE`, `ALTER` (including new `CREATE TABLE` migrations), and `UPDATE` against existing hand-authored data all stay in a reviewable file for the user to run themselves. Do not call the MCP server (or any other tool) to execute these, even if asked to "just apply it."
  - **After any write executed via MCP, run `npm test`** to confirm scoring hasn't shifted before reporting the write as done.
- Frozen-vocabulary `CHECK` constraints (see `transmission_units.family`, `safety_features.category`, `drivetrain_systems.type`) are a deliberate closed-list pattern — if a new value is genuinely needed, that's a real migration (`ALTER TABLE ... DROP/ADD CONSTRAINT`), not a schema-less free-text column. Don't relax a `CHECK` constraint to "make an insert work" without flagging it.
- Presence-only junction tables (`vehicle_safety_features` is the existing example) store *only* positive facts — a row means "this car has this," and absence means "not available." Never add an explicit negative/false row to a table using this pattern.

## Adding a new car / model

The repeatable process for seeding a new car into the `catalog_` schema (`catalog_brands` → `catalog_models` → `catalog_phases` → `catalog_vehicle_configurations`, referencing `catalog_engines`/`catalog_transmissions`/`transmission_units`/`drivetrain_systems`), given a full spec: phases, configs, engines w/ codes, transmissions w/ codes, drivetrain, faults, trims + equipment.

1. **Dictionary reconcile (reuse before create).** For every engine, transmission, and drivetrain system in the spec, query the LIVE DB via MCP (read-only) and resolve REUSE vs CREATE — never infer reuse-vs-create from migration files on disk, which can be stale or not yet run against the live DB:
   - Engine: `(code, power_kw)` matches an existing `catalog_engines` row on EITHER the primary `code` OR anywhere in `alt_codes` → REUSE that id. Else CREATE. An engine already in the DB under an alt code must be reused, not duplicated under what looks like a "new" code.
   - Transmission: match by the real gearbox family/code (e.g. `02J`, `MQ250`, `DQ200`) → REUSE. **Never match by speed count alone** — a "5-speed manual" is not evidence it's the same unit as another 5-speed manual already in the DB (the Octavia I 1U case: the real code is `02J`, not `MQ200`/`MQ250`, despite matching speed counts). If the real code doesn't match, it's CREATE, even if the speeds do.
   - Drivetrain system: `code` matches an existing `drivetrain_systems` row → REUSE. Else CREATE.

   Report a REUSE/CREATE table before writing any seed. Never create a second row for something that already exists — resolve every FK to the existing id via its code (subquery/CTE), never a hand-typed UUID.

2. **Seed.** Write to a review-only migration file:
   - `catalog_brands`/`catalog_models`: reuse if a name match exists, else create.
   - `catalog_phases`, `catalog_vehicle_configurations`, `catalog_trims`, `catalog_trim_features`, `catalog_component_faults`: always new per car — resolve every FK (engine by `(code, power_kw)`, transmission/drivetrain by `code`) to the dictionary entry, reused or newly created.
   - Additive `INSERT`s may run via MCP once reviewed (per Supabase/data-access rules above); any `DELETE`/destructive step stays file-only for the user to run.

3. **Verify.** After the seed runs, query the live DB and confirm: row counts match expectations, and no duplicate dictionary rows exist — count grouped by engine `(code, power_kw)` and by transmission `code` must be 1 each.

## Spec vs. current state — DO NOT auto-correct

These look like inconsistencies or magic numbers at a glance. They are deliberate. Do not "fix," refactor, or align them with what seems more idiomatic without being explicitly asked.

1. Progressive disclosure (car detail expansion) uses expandable panels, not a Shadcn `Dialog`. This is deliberate. Do not convert expandable panels to a dialog/modal component.
2. Scoring uses base values in the 6–8 range and `Math.min(35, s)` caps on each dimension score (`scorePractical`, `scoreFinancial`, `scorePreference`, `scoreSafety`), and `scoreCar` clamps the combined result at 200 (`Math.min(200, ...)`) in `app/api/recommend/route.ts`. These weights/caps are deliberately calibrated — never change these numbers.

**Conventions to preserve:**
- Quiz option values (in `QUESTIONS`) are exact strings matched elsewhere in scoring logic — don't rename/reword option values without updating every `ans[...] === "..."` comparison that depends on them.
- `origin_country` values are lowercase (e.g. `'german'`, not `'German'`) — matches `ORIGIN_FLAGS` keys in `app/api/cars/route.ts`.
- Pickups have `NULL boot_capacity_liters` in the DB by design; scoring accounts for this via `effBoot` in `app/api/recommend/route.ts` (e.g. `body === "pickup" ? Math.max(boot, 1000) : boot`) rather than expecting real boot data for that body type.
- Per-fuel-type data (e.g. consumption) follows the `consumptionByFuel` pattern established in `app/api/cars/route.ts` — an object keyed by lowercase fuel type, not a flat/averaged single value.
- Car objects from `fetchCarData` are mutated in place by `norm()` (`_n` short-circuit) and `applyBestVariant()` (`body`/`boot`). Safe in production — fresh fetch per request — but any harness scoring multiple profiles from one fetch MUST deep-clone per profile or later profiles score against leftover state.

## Known issues

- **Reliability is optimistic for multi-engine models.** Reliability is computed as `bestRel` (best-rated engine's tier) in `/api/cars` and `/api/recommend`. For multi-engine models this is optimistic — e.g. BMW 1 Series (F20) engines rated [Good, Poor, Good] display as "Good", hiding the Poor variant. Affects quiz scoring AND display. Needs a dedicated pass with full 20-profile re-test. Do NOT quietly change `bestRel` without that re-test — the calibration depends on current behaviour. (The Prehľad browse card's reliability pill now shows the honest worst–best range once per-engine detail loads — see `CarDetail.tsx` — but this does not touch `bestRel` itself, the quiz card, or scoring.)
- **`drivetrain_systems` (from the `transmission_units`/`drivetrain_systems` migration, `supabase/migrations/20260724120000_...`) cannot be populated by string-matching the way `transmission_units` can.** There is no dedicated hardware-system column anywhere in the schema — `engines.drivetrain` only holds `AWD`/`FWD`/`RWD`. Brand AWD-system names (`quattro`, `xDrive`, `4MATIC`, `4MOTION`, `AWD-i`) only exist as substrings buried inside `engines.label`/`engine_code` free text, and even those don't reliably map to a physical system: e.g. `quattro` covers both Torsen-based longitudinal Audis (A4, A6, Q5, RS4 Avant) and Haldex-based transverse ones (A3, Q2, Q3, TT) with no way to tell them apart from the string alone. A literal "Haldex" or "Torsen" string does not exist anywhere in the data (checked all 758 engine rows). Populating this table for real requires per-model automotive-platform knowledge, not a data audit — do not attempt to bulk-populate `drivetrain_id` from `engines.label` substrings without that manual review.
- **`transmission_units.family` includes a plain `'dct'` value** (alongside `dct_dry`/`dct_wet`) added specifically for generic/unidentified-unit rows (e.g. `generic:7-speed dct`) where the source data doesn't say whether the clutch is dry or wet. This is an intentional third state, not a placeholder to "clean up" into one of the other two — don't assume every DCT row can or should be dry/wet-classified.
- **`vehicles.equipment_trims` features are suspiciously uniform**: every one of the 991 trim rows across all 334 cars has *exactly* 5 features, no variation — a strong signal the original content was synthetically templated rather than sourced from real spec sheets. If re-authoring this data, don't feel bound to preserve the "always 5" pattern; it's not a real constraint, just an artifact of how the placeholder content was generated.

## Styling

Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config`; config lives in `postcss.config.mjs` + `app/globals.css`). Fonts are `Geist`/`Geist_Mono` loaded via `next/font/google` in `app/layout.tsx`.
