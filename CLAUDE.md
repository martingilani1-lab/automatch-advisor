# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js version warning

This project pins `next@16.2.7`, which is newer than most training data and has breaking changes vs. the Next.js you may know (APIs, conventions, file structure). **Before writing or changing any Next.js-specific code** (routing, route handlers, config, data fetching), check `node_modules/next/dist/docs/` for the current API and heed any deprecation notices there.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)

There is no test suite/framework configured in this repo.

Environment variables (in `.env.local`, gitignored) required for the app to function: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Architecture

This is a single-purpose Next.js App Router app: a car-buying advisor that walks a user through a quiz and recommends vehicles from a Supabase-backed catalog.

**Data store**: Supabase, three tables — `vehicles`, `engines`, `transmissions` (joined by `vehicle_id`). Accessed only from server-side route handlers via the anon key; there is no server-side auth layer.

**Route handlers** (`app/api/*/route.ts`):
- `cars/route.ts` (GET) — loads all vehicles + engines + transmissions and flattens/derives them into the `CarData` shape the frontend consumes (fuel types, best reliability, AWD flag, avg consumption, pricing, safety, etc.). This is the only endpoint the frontend uses to populate its car list.
- `detail/route.ts` (POST, takes `{ vehicleId }`) — fetches full per-vehicle engine/transmission/fault detail (richer than the `cars` payload) for the expanded card view. Called lazily per-car from the frontend.
- `recommend/route.ts` (POST, takes the quiz `Answers` object) — the live scoring endpoint. Fetches vehicles server-side (same fetch+transform pattern as `cars/route.ts`), runs the full recommendation pipeline (`hardFilter` → `score*` → `scoreCar` → `calcResults`), and returns the top 10 `ScoredCar[]`. This is the source of truth for recommendation behavior — `page.tsx` calls it directly.
- `debug/route.ts` (GET) — introspection helper that dumps table counts, distinct brands, and sample rows/columns from Supabase. Useful for checking the current DB schema, not used by the UI.

**Frontend** (`app/page.tsx`, single client component, ~1500 lines): the quiz and results UI live here; the scoring engine itself lives server-side in `app/api/recommend/route.ts` (see above).
- `QUESTIONS` defines the 16-question quiz (`QuizQuestion[]`), driving a `phase` state machine: `hero → quiz → loading → results`.
- On mount, all cars are fetched once from `/api/cars` into a `DB` state array (used for the car-count display, not for scoring).
- Quiz answers accumulate into an `Answers` object keyed by question id.
- Once the quiz completes, `page.tsx` POSTs the `Answers` object to `/api/recommend`, which fetches vehicles, runs the recommendation pipeline (`hardFilter` → `scorePractical`/`scoreFinancial`/`scorePreference`/`scoreSafety` → `scoreCar` → `calcResults`), and returns the top 10 `ScoredCar[]`, already sorted and flagged with `isBest`.
- A few small pure helpers (`getResaleRelevance`, `getConsumptionForFuel`, `faultRelevant`) are intentionally duplicated in both `page.tsx` and `app/api/recommend/route.ts`, since both the server scorer and the client display code (score reasons, fault badges, displayed consumption) need them.
- Expanding a result card lazily calls `/api/detail` per vehicle and caches the response in `faultDB`.

When changing recommendation behavior, edit the pipeline in `app/api/recommend/route.ts` (`hardFilter` → `score*` functions → `scoreCar` → `calcResults`) — that's what actually drives the UI now. Don't change the `.slice(0, 10)` cutoff in `calcResults` without being asked, same as the score-cap rule below.

## Spec vs. current state — DO NOT auto-correct

These look like inconsistencies or magic numbers at a glance. They are deliberate. Do not "fix," refactor, or align them with what seems more idiomatic without being explicitly asked.

1. Progressive disclosure (car detail expansion) uses expandable panels, not a Shadcn `Dialog`. This is deliberate. Do not convert expandable panels to a dialog/modal component.
2. Scoring uses base values in the 6–8 range and `Math.min(35, s)` caps on each dimension score (`scorePractical`, `scoreFinancial`, `scorePreference`, `scoreSafety`), and `scoreCar` clamps the combined result at 200 (`Math.min(200, ...)`) in `app/api/recommend/route.ts`. These weights/caps are deliberately calibrated — never change these numbers.

**Conventions to preserve:**
- Quiz option values (in `QUESTIONS`) are exact strings matched elsewhere in scoring logic — don't rename/reword option values without updating every `ans[...] === "..."` comparison that depends on them.
- `origin_country` values are lowercase (e.g. `'german'`, not `'German'`) — matches `ORIGIN_FLAGS` keys in `app/api/cars/route.ts`.
- Pickups have `NULL boot_capacity_liters` in the DB by design; scoring accounts for this via `effBoot` in `app/api/recommend/route.ts` (e.g. `body === "pickup" ? Math.max(boot, 1000) : boot`) rather than expecting real boot data for that body type.
- Per-fuel-type data (e.g. consumption) follows the `consumptionByFuel` pattern established in `app/api/cars/route.ts` — an object keyed by lowercase fuel type, not a flat/averaged single value.

## Styling

Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config`; config lives in `postcss.config.mjs` + `app/globals.css`). Fonts are `Geist`/`Geist_Mono` loaded via `next/font/google` in `app/layout.tsx`.
