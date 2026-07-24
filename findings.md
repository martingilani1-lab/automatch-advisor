Pushed. `main` is now at `f7af544`, rebased cleanly on top of PR #1's merge — no conflicts. `findings.md` was deleted as scratch and not committed.

## Path B (Browse) — Step 1 data audit

Queried the live `vehicles` table (334 rows) directly to answer the three
pre-flight questions before building the `/api/cars` query-param / predicate
map work.

**1. Distinct `body_type` values + counts:**

```
suv: 85       hatchback: 75    crossover: 60
sedan: 53     coupe: 19        minivan: 11
van: 10       city_car: 8      pickup: 7
estate: 6
```

`city_car`, `van`, `crossover` are real values, spelled exactly as used in the
predicate map. **`liftback` is NOT a `body_type` value anywhere** — it only
ever appears as a `body_variants[].style` string. So for `sedan_liftback`,
the `body in [sedan, liftback]` half of the OR will never match on body type;
the category only works via the variant-style half of the OR (`liftback` /
`sportback` / `fastback` in `body_variants`). Not a bug, just don't expect
`liftback` to hit via the body-type check.

**2. `length_mm` NULL count: 0 / 334.** No nulls at all — the `city_small`
tile's `length < 4200` predicate won't silently drop anything. No
null-handling decision needed.

**3. `body_variants[].style` strings containing "tour": zero matches.**
Full distinct style list across all 334 vehicles: `avant`, `cross_country`,
`cross_turismo`, `estate`, `fastback`, `liftback`, `mcv_estate`,
`shooting_brake`, `sport_turismo`, `sportbrake`, `sportback`, `suv`,
`crossover`, `hatchback`, `hatchback_3d`, `hatchback_5d`, `sedan`, `coupe`,
`convertible`, `cabriolet`, `targa`, `gran_coupe`, `hybrid`, `ev`, `mpv_5seat`,
`mpv_7seat`, `lounge_7seat`, `suv_5seat`, `suv_7seat`, `van_9seat`, `stepway`,
`proceed`, `long`, `long_xl`, `short`, `short_m`, `standard`,
`4door_unlimited`, `110_5door`, `130_lwb`, `90_3door`, `2door`. None contain
the substring `"tour"` — not `touring`, not `tourer`, not `grand_tour`. No
Tourneo/Grand-Tourer collision risk in the current data; the `ESTATE_STYLES`
LIKE pattern doesn't need narrowing right now.

Side note (not asked, flagging for later): `sport_turismo` and
`cross_turismo` are Porsche/Audi shooting-brake-style wagons that won't match
any current `ESTATE_STYLES` term — `"turismo"` isn't in that list. Pre-existing
gap in `ESTATE_STYLES` itself, not introduced by this audit. Left untouched.

Stopped here per instructions — predicate map / query-param implementation
not started yet.

## Path B (Browse) — Step 1 implementation

Implemented the predicate map and query-param filtering for `/api/cars`.
No UI, no scoring — Step 2 not started.

**Changes:**
- `app/api/recommend/route.ts` — exported `ESTATE_STYLES` (read-only, no
  logic touched).
- `app/api/cars/route.ts` — added `BROWSE_ESTATE_STYLES` (a separate
  constant that spreads `ESTATE_STYLES` + `sport_turismo` / `cross_turismo`,
  so `applyBestVariant()`'s scoring-path use of `ESTATE_STYLES` is untouched),
  the 9-category `CATEGORY_PREDICATES` map, and query-param filtering
  (`category`, `fuel`, `transmission`, `drivetrain`, `brand`, `priceMin`,
  `priceMax`, `sort`) — all whitelisted, unknown values ignored. Bare
  `GET /api/cars` behavior unchanged (verified: still 334 rows).

**Category counts (9):**

| category | count |
|---|---|
| city_small | 39 |
| hatchback | 75 |
| estate | 57 |
| sedan_liftback | 60 |
| suv_crossover | 145 |
| seven_seats | 32 |
| pickup_work | 17 |
| coupe_convertible | 19 |
| electric | 58 |

Sum of counts: **502** (overlap expected — `seven_seats`, and to a lesser
extent the variant-style checks, deliberately cut across body type, e.g. a
7-seat SUV counts in both `suv_crossover` and `seven_seats`).

**Coverage check:** computed the actual union of vehicle IDs across all 9
categories against the full 334-id list — **0 vehicles match no category**.
Full coverage.

**Combined filter/sort test** (`suv_crossover&fuel=diesel&sort=price_asc`),
top 3 by price:

```
Peugeot 3008 I (T84)       — €2,500
Dacia Duster I (HS)        — €3,500
Kia Sportage III (SL)      — €4,000
```

`tsc --noEmit` clean. `npm run lint` shows only pre-existing
`@typescript-eslint/no-explicit-any` errors (40 before this change → 44
after, same convention already used throughout both files, not a new
pattern — confirmed via `git stash` diff). Dev server stopped after
testing.

## Path B (Browse) — Step 2 implementation

Static UI only for the new `/prehlad` route — no data fetching, no filtering
logic. Confirmed via `package.json` that this project has no shadcn/ui,
Radix, or Framer Motion; styling is custom CSS classes in `globals.css`.

**New files:**
- `app/prehlad/page.tsx` — server component. Wraps the client view in
  `<Suspense>` per the Next 16 `useSearchParams` doc
  (`node_modules/next/dist/docs/.../use-search-params.md`): a static page
  calling `useSearchParams` from a Client Component must sit inside Suspense
  or the production build fails during prerendering. Verified this actually
  matters — `npm run build` shows `/prehlad` as `○ (Static)`, i.e.
  successfully prerendered with the dynamic search-params consumer isolated
  inside the boundary.
- `app/prehlad/PrehladView.tsx` — `"use client"`, reads `cat` from
  `useSearchParams()`, renders the search input, the 9 category tiles, and
  the back link. Clicking a tile is a plain `<Link href="/prehlad?cat=slug">`
  — no client state, no fetch. The active tile gets `.opt-btn.sel` (existing
  quiz selected-answer style) purely from the `cat` URL param.

**Class reuse (as instructed):** `.opt-btn` for both the search input and
each of the 9 tiles (already renders label + `.opt-desc` sub-line — exact
shape needed), `.results-hdr` for the page heading, `.restart` for the
"← Back" link to `/`. One new class was added, `.cat-grid` (2-col CSS grid,
mirrors the unused `.id-grid` already in the file) — none of the four named
classes provide grid layout, so this was the minimal addition needed. No
Tailwind utility classes introduced, no new dependencies.

**Hero link:** per your call to replace rather than add alongside, the
existing hero button (`🔎 Prehľad — browse & compare`, which called
`setPhase("browse")` for the old in-page unscored browse view) now is a
`next/link` `Link` to `/prehlad` instead. That old `phase === "browse"`
render block (and its `bCat`/`bFuel`/`bPriceMax`/`bPowerMin`/`bSort` state)
is now dead code — unreachable from the UI but left in place, since removing
it is a bigger change than this step asked for. Flagging in case you want it
cleaned up in a later step.

**Verification:** `npx tsc --noEmit` clean. `npm run build` succeeds,
`/prehlad` listed as `○ (Static)`. Dev server smoke-tested with curl (no
browser extension available this session): bare `/prehlad` returns 200 and
contains `cat-grid`, all 9 tile labels, `results-hdr`, `restart`, and 10
`opt-btn` elements (1 input + 9 tiles); `/prehlad?cat=electric` returns 200
with exactly one `opt-btn sel` match, confirming URL state correctly drives
the active tile.

Stopped here per instructions — step 3 (counts, real data) not started.

## Path B (Browse) — Step 3 implementation

Two parts: cleanup of the dead in-page browse code, then the real row
component + list view for `/prehlad`.

**Part 1 — cleanup:**
- New `app/lib/carFields.ts` — salvaged `carPriceMin`, `carPriceMax`,
  `carRel`, `carStars`, `carAdult`, `carMileage`, `carFuelMatch`, and
  `REL_RANK` out of `app/page.tsx` verbatim, plus a `CarData` type matching
  the RAW `/api/cars` shape (these accessors exist specifically to read
  either the RAW shape from `/api/cars` or the NORMALISED shape from
  `/api/recommend`'s `norm()`, keyed off the `_n` flag).
- `app/page.tsx` now imports only `carStars`/`carAdult` from that module
  (the only two still used, in `renderMorePanel`) — everything else was
  exclusively consumed by the dead browse block being deleted.
- Deleted: the entire `phase === "browse"` render block, the `BrowseCat`
  interface, `BROWSE_CATS` (the old **six**-category use-based tile set —
  Rodina/Mesto/Práca/Zábava/SUV/Všetko — which directly contradicted the
  **nine** shape-based categories in `CATEGORY_PREDICATES`), the
  `bCat`/`bFuel`/`bPriceMax`/`bPowerMin`/`bSort` state and their `reset()`
  lines, and `"browse"` from the `Phase` union. Also fixed a stale comment
  referencing `bFuel` that survived in `renderMorePanel`.
- Verified: `npx tsc --noEmit` clean, `npm run build` passes (`/prehlad`
  still `○ Static`), and directly POSTed a full `Answers` payload to
  `/api/recommend` — 10 scored cars returned, top match 99% — confirming the
  quiz pipeline is untouched and still works end to end after the deletion.
  (Noted one pre-existing, unrelated dead stub — a `function setShowScroll`
  redeclared after the component's closing brace, shadowed by the real
  `useState` setter inside the component — confirmed via `git diff` it
  predates this session; left alone as out of scope.)

**Part 2 — row component + list:**
- `app/prehlad/CarRow.tsx` — one row per car. Duplicates
  `getConsumptionForFuel`/`getPowerForFuel` locally (same small-pure-helper
  duplication convention already established between `page.tsx` and
  `recommend/route.ts`). Builds a fixed-width, monospace **spec line**
  (price / consumption / power / gearbox / drivetrain, each field
  `.padEnd()`-ed) so columns actually line up down the list — rendered with
  `white-space: pre` in a monospace stack, inside an `overflow-x: auto` row
  so long gearbox strings never break the layout. Gearbox reads
  `transmissions` (raw `specific_type` strings, e.g. `"DSG DQ200 (7-speed
  dry)"`) and drivetrain reads `drivetrains` (raw `AWD`/`FWD`/`RWD`) exactly
  as returned — no normalisation, since neither a `transmission_units` nor a
  `drivetrain_systems` reference table exists yet.
- Photo slot: `.row-photo`, a `repeating-linear-gradient` diagonal stripe
  placeholder (not blank grey), no image data exists yet.
- **Per-fuel display fix**, verified against live data: for the `electric`
  category, `fuelContext="electric"` is passed into
  `getConsumptionForFuel`/`getPowerForFuel` instead of using
  `avgConsumption`/`maxPowerKw` directly. Confirmed with real rows this
  matters — 7 multi-powertrain models in the `electric` category
  (Kia Niro I/II, BMW 5 Series/i5, Hyundai Kona, Peugeot 208/2008, Škoda
  Citigo) have a blended `avgConsumption` that differs sharply from their
  actual electric-only figure, e.g. Hyundai Kona (OS): blended `9.0` vs.
  electric-forced `15.4`; Peugeot 208 II: blended `8.9` vs. `15.5`.
- `app/prehlad/PrehladView.tsx` — on mount, fetches all 9 categories in
  parallel (`/api/cars?category=<slug>`, no other params — filtering/sorting
  is step 4) and caches the results keyed by slug. Tile grid now shows a
  live `{n} cars` count per tile once that first load resolves (`"…"` while
  it's in flight); after that, switching between any already-visited
  category is instant — no fetch, no spinner. Selecting a tile
  (`/prehlad?cat=<slug>`) swaps the grid for the row list for that category;
  an unrecognized `cat` value falls back to the grid. No score column, no
  match percentage — this route only ever reads `/api/cars`, never
  `/api/recommend`.

**Verification:**
- `npx tsc --noEmit` clean, `npm run build` passes, `/prehlad` still
  `○ Static`.
- Row counts rendered per category (confirmed both via `/api/cars` counts,
  unchanged from step 1, and by running the exact row-building logic
  against every real row from the live API with zero exceptions):

| category | rows |
|---|---|
| city_small | 39 |
| hatchback | 75 |
| estate | 57 |
| sedan_liftback | 60 |
| suv_crossover | 145 |
| seven_seats | 32 |
| pickup_work | 17 |
| coupe_convertible | 19 |
| electric | 58 |

  (502 total, matching step 1's sum exactly — data/category logic is
  untouched this step.)
- Quiz confirmed still working end to end post-cleanup (see Part 1).

Stopped here per instructions — no filtering/sorting (step 4) implemented.
