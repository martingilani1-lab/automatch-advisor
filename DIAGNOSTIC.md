# DIAGNOSTIC.md

Read-only analysis of the automatch-advisor codebase, produced before drafting/merging
project rules into `CLAUDE.md`. Captured here for reference — this file is a point-in-time
snapshot, not maintained guidance (see `CLAUDE.md` for that).

## Caveats on this analysis

- **No Supabase MCP tool was available in this session.** A `claude mcp add --transport http
  supabase https://mcp.supabase.com/mcp` command and a "Tool loaded" message appeared in
  the conversation, but a `ToolSearch` for "supabase" returned no match — that command
  registers an MCP server in Claude Code's own config and needs to run in a terminal, then
  typically needs a fresh session to take effect. Database access below used the same
  direct `supabase-js` + service-role-key method established earlier in the session.
- **The database was unreachable when this analysis was written.** `curl` against the
  project's Supabase URL failed with `Could not resolve host` — a DNS failure specific to
  that hostname, while general internet connectivity was confirmed fine (`google.com`
  resolved). Consistent with (but not proof of) the Supabase project being paused. The
  schema section below reflects the schema as confirmed via successful live queries
  **earlier in the same session**, not a fresh read at write time — labeled accordingly.

## 1. Dependencies

Exact resolved versions, from `package-lock.json`:

| package | package.json | resolved |
|---|---|---|
| next | `16.2.7` (exact pin) | 16.2.7 |
| react / react-dom | `19.2.4` (exact pin) | 19.2.4 |
| @supabase/supabase-js | `^2.108.0` | 2.108.0 |
| typescript | `^5` | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | `^4` | 4.3.0 |
| eslint | `^9` | 9.39.4 |
| eslint-config-next | `16.2.7` (exact pin, matches Next) | 16.2.7 |

- **State management**: none — plain `useState`/`useMemo`, no Redux/Zustand/Jotai/Context
  beyond React's own.
- **Testing**: no framework configured at all — no jest/vitest/playwright, no test script,
  nothing under `__tests__`.
- **Package manager**: npm (`package-lock.json`, lockfileVersion 3).
- Both `next` and `react`/`react-dom` are exact pins, not `^` ranges — deliberate, matches
  the Next-version warning already in `CLAUDE.md`.

## 2. Architecture

- **App Router**, confirmed — `app/` at repo root (no `src/`), `route.ts` handlers, no
  `pages/` directory anywhere.
- **4 route handlers**: `app/api/{cars,detail,recommend,safety-features}/route.ts`.
- **No `components/` directory** — components are co-located: `app/page.tsx` (the
  ~1500-line quiz, single client component) and `app/prehlad/*.tsx` (`CarDetail`,
  `CarRow`, `FilterPanel`, `PrehladView`, `TagBar` — the browse route).
- **Shared logic in `app/lib/`**: `carFields.ts` (display/derivation accessors + the
  `CarData` type), `carFilters.ts` (filter-predicate functions + `FilterOption` types),
  `tags.ts` (lifestyle-tag vocabulary).
- **No dedicated `types/` directory** — DTOs for the browse route live in
  `app/prehlad/types.ts`; the core `CarData` shape is inferred
  (`ReturnType<typeof buildCar>`) inline in `app/api/cars/route.ts` and re-exported via
  `carFields.ts`.
- **No server actions** (`"use server"` doesn't appear anywhere) — client components call
  route handlers via `fetch`.
- **No repository/DAO layer** — each route handler instantiates its own
  `createClient(...)` and queries directly; the transform logic (`buildCar`, etc.) lives
  inline in the same file as the query.
- **`supabase/migrations/`** — 5 hand-written SQL migrations, never auto-run by the
  agent; review-then-user-runs is the established discipline for this whole project.
- **`scripts/`** — a large body of one-off Node/TS data-authoring + SQL-generation tools
  (not part of the app runtime) — CSV-driven batch editing with reviewable generated SQL,
  same discipline as migrations.

## 3. Database

Schema as last verified via successful live queries earlier in the session — **not**
re-confirmed at write time (see Caveats above). 7 tables:

- **`vehicles`** — the ~35-column primary table: identity/segment/body, origin, NCAP
  safety fields, dimensions/capacities, pricing, resale rating, `equipment_trims`/
  `body_variants`/`common_faults` as JSONB, `tags text[]`.
- **`engines`** — per-`vehicle_id`: code/label, fuel type, power/displacement/torque,
  `drivetrain` (FWD/RWD/AWD only), consumption/CO2/battery/range, reliability rating,
  faults/pros/cons.
- **`transmissions`** — per-`vehicle_id`: type/subtype (5-value frozen vocab), speeds,
  maintenance interval, reliability, faults/notes/pros/cons, `unit_id` FK →
  `transmission_units`, plus `drivetrain_id`/`engine_id` FKs that exist but are
  unpopulated.
- **`transmission_units`** — reference table, 65 rows, fully authored: `code` (unique),
  `family` (CHECK-constrained), `maker`, `speeds`, `reliability_note`,
  `maintenance_note`.
- **`drivetrain_systems`** — reference table, schema exists, **0 rows populated** — can't
  be bulk-populated by string-matching (documented as a Known Issue in `CLAUDE.md`).
- **`safety_features`** — reference table, 17 rows (9 GSR2-mandated + 8
  beyond-baseline), static vocabulary.
- **`vehicle_safety_features`** — presence-only junction table: `vehicle_id,
  feature_slug, availability` — absence means "not available," never an explicit
  negative.

No RLS/constraint metadata available via this method (`supabase-js` reads don't surface
policy info) — would need real SQL access.

## 4. Coding style

From `app/api/cars/route.ts`, `app/prehlad/CarRow.tsx`, `app/prehlad/types.ts`,
`app/lib/carFields.ts`:

- **TypeScript**: `strict: true`, but pragmatically not `any`-free — 64 total `any`
  usages, 61 of which concentrate in the 4 route handlers + `page.tsx` (raw Supabase row
  shapes before transform, e.g. `(v: any) => ...`), essentially zero in `.tsx` display
  components (`CarDetail`/`CarRow`/`FilterPanel`/`PrehladView` are fully typed against
  `CarData`/`DetailData`/`SafetyFeature`). Real convention: `any` is fine for an untyped
  raw DB row inside a `.map()` transform, never in component code or exported function
  signatures.
- **Imports**: `import type {...}` used consistently for type-only imports, kept
  separate from value imports even from the same module. Path alias `@/*` → repo root
  (tsconfig `paths`). No relative `../../` chains crossing top-level dirs; same-directory
  imports use `./`.
- **Naming**: PascalCase for component files/functions (`CarRow.tsx` exports `CarRow`),
  camelCase for utility functions and accessors (`carPriceMin`, `carRel`, `buildCar`),
  UPPER_SNAKE for module-level constant maps/whitelists (`ORIGIN_FLAGS`,
  `BODY_TILE_MAP`, `TILE_WHITELIST`). DB columns are snake_case (Postgres convention)
  and are explicitly remapped to camelCase in transform functions (`v.brand` → `make`,
  `v.production_years` → `gen`/`years`) — the DB shape never leaks past the route
  handler's transform step.
- **Components**: function declarations (`export default function X(props: XProps)
  {...}`), not arrow-function consts; props typed via a colocated `interface XProps`
  immediately above; no `React.FC`.
- **Error handling**: uniform across all 4 route handlers — `try { ...; if (res.error)
  throw res.error; ...; return NextResponse.json(result); } catch (err) {
  console.error("[/api/routename]", err); return NextResponse.json(<typed-empty-
  fallback>, { status: 500 }); }`. Never lets a Supabase error reach the client raw;
  always logs with a `[/api/name]` prefix and degrades to an empty-but-correctly-shaped
  fallback.
- Extensive inline comments explaining *why*, not *what* — the single strongest,
  most consistent convention across every file read.
