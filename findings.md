# Migration: scoring engine moved from `app/page.tsx` to `app/api/recommend/route.ts`

Algorithm-testing phase ended; this migration moves the live recommendation
pipeline server-side per the approved plan. Notes below are what came up
during the move, not action items — recorded for anyone touching either
file next.

## What moved vs. what stayed

Moved verbatim (no scoring numbers/thresholds changed): `norm`,
`matchesTx`, `applyBestVariant`, `hardFilter`, `scorePractical`,
`scoreFinancial`, `scorePreference`, `scoreSafety`, `scoreCar`,
`calcResults` (with `.slice(0, 20)` → `.slice(0, 10)`), plus their helpers
(`parseBudget`, `parseKm`, `getCapabilityScore`, `AGE_MAP`,
`ESTATE_STYLES`, `MISSION_WEIGHTS`) and a vehicle fetch+transform copied
from `app/api/cars/route.ts`'s pattern.

Deliberately duplicated in **both** `page.tsx` and `recommend/route.ts`:
`getResaleRelevance`, `getConsumptionForFuel`, `faultRelevant`. Each is a
small pure function needed on both sides — server-side for scoring,
client-side for display (`getScoreReason`, the displayed consumption
figure, and the critical/high fault badges on result cards). Splitting
them into a shared lib module was considered and rejected as
over-abstraction for three ~10-line functions; if either copy changes,
the other must be updated by hand — there's no compiler check tying them
together.

Not moved: `getRecommendedFuel`, `getRecommendedTransmission`,
`getFuelReason`, `getTransReason` — these only read the in-progress `ans`
object and drive the fuel/transmission recommendation badges shown
*during* the quiz, before submission. Out of scope for this migration.

## Bug surfaced by adding an explicit return type

`CarData.fuelTankLiters` was typed `number | undefined` in the original
`page.tsx` interface, but the field is actually built as
`Math.max(...) || null` (see `app/api/cars/route.ts` and the new
`app/api/recommend/route.ts`) — so it's really `number | null`. This was
never caught by `tsc` before because nothing in `page.tsx` explicitly
typed the array coming back from `fetch("/api/cars")` as `CarData[]`
(the `any` from `.json()` flowed straight into `useState<CarData[]>`
without a check). Giving `fetchCarData()` an explicit
`Promise<CarData[]>` return type in the new route surfaced the mismatch
immediately (`tsc --noEmit` failed). Fixed by widening the field to
`number | null` in both files' `CarData` interface — a type-only fix,
no behavior change.

## Self-inflicted scope slip (caught and reverted)

While deleting the `AGE_MAP` block, the adjacent (unrelated, unused)
`let _advancing = false;` line got swept up and deleted along with it.
Plan explicitly said to leave pre-existing dead code (`_advancing`,
`LIFTBACK_STYLES`) untouched. Caught via a lint-diagnostic diff against
the pre-change baseline (unused-var warning count dropped by one more
than expected) and restored. Worth remembering: large sed/Edit deletions
around dead code that sits adjacent to code you *do* want to remove are
an easy way to over-delete — diffing lint/diagnostic counts before/after
against a stashed baseline caught it here.

## Verification performed

- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds, `/api/recommend` builds as a dynamic route.
- `npm run lint` — no new *kind* of issue; the only increase is
  `@typescript-eslint/no-explicit-any` inside the new route file, matching
  the pre-existing convention already used in `app/api/cars/route.ts`'s
  fetch/transform code.
- Live dev server, direct POST to `/api/recommend`:
  - Family/SUV profile (budget 15k-25k, mission=family, space=large,
    priorities=[safety,comfort]) → top 5 all SUVs (Mazda CX-5, RAV4,
    Kodiaq, Tiguan, Tiguan Allspace), exactly 10 results, `isBest` on #1.
  - Driver's-car profile (budget 40k-60k, mission=drivers_car,
    priorities=[driving_pleasure,looks], transmission=prefer_manual) →
    top 5 all coupes (BMW 4 Series, Porsche 911, Audi TT, Cayman/Boxster,
    BMW 2 Series Coupe).
  - `/api/cars` still returns 334 vehicles unaffected.
- **Not verified**: the actual browser UI (quiz → loading → results
  render). No `chromium-cli` or Playwright available in this container.
  The `page.tsx` wiring change (fetch call, loading-gate `Promise.all`,
  `norm(car)` → `car`) is covered by the type-check/build passing, not by
  visual confirmation.

## Follow-up: exhaustive diff, `fetchCarData` (recommend) vs `GET` (cars)

Requested after a report that consumption values differed between the two
endpoints. Extracted both function bodies (`awk '/^export async function
GET\(\)/,/^}$/'` on `cars/route.ts`, `awk '/^async function
fetchCarData/,/^}$/'` on `recommend/route.ts`) and diffed with leading
whitespace stripped from every line, so indentation depth (the two
functions sit at different nesting levels) doesn't produce false
positives. Full list of every difference found:

1. **Function signature.** `export async function GET() { try {` (cars)
   vs. `async function fetchCarData(): Promise<CarData[]> {` (recommend).
   Structural — one is a route handler, the other a plain helper called
   by the `POST` handler. No behavioral difference.
2. **Assign-then-return vs. direct return.** `const cars = (vehiclesRes
   .data || []).map(...)` then later `return NextResponse.json(cars)`
   (cars) vs. `return (vehiclesRes.data || []).map(...)` (recommend).
   Same `.map()` call, same callback, just returned one statement
   earlier since `fetchCarData` doesn't need to wrap the array in a
   `NextResponse`. No behavioral difference.
3. **Trailing response/error wrapper.** `cars/route.ts` ends with
   `return NextResponse.json(cars); } catch (err) { console.error(...);
   return NextResponse.json([], { status: 500 }); }` — absent from
   `fetchCarData`, because `recommend/route.ts`'s `POST` handler does
   its own `try/catch` around `fetchCarData()` + `calcResults()`
   together (see the route's `POST` function). Same error-handling
   *intent* (log and return an empty array with a 500), just applied at
   the call site instead of inside the helper. No behavioral difference
   for a successful fetch; on a Supabase error, both paths still end up
   logging and returning `[]`/500.

**Everything inside the `.map((v) => {...})` callback is identical**,
confirmed by whitespace-stripped diff showing zero remaining line
differences in that region:
- `vEngines`/`vTrans` filtering by `vehicle_id`
- `fuelTypes` dedup/lowercase
- `bestRel`/`relOrder`/`relMap` reliability rollup
- `hasAWD` / `drivetrains`
- `yearTo` parsing
- `avgConsumption` (sum of all engines' `fuel_consumption_avg` / count,
  rounded to 1 decimal)
- **`consumptionByFuel`** — identical IIFE: groups `fuel_consumption_avg`
  by lowercased `fuel_type`, averages per group, rounds to 1 decimal,
  returns `null` if no groups. Byte-identical in both files.
- every field in the returned object literal — `id` through
  `minPowerKw` — same source column, same fallback (`|| null` / `|| ""`
  / `?? ""`), same order.

**Conclusion: no differences in `consumptionByFuel` or any car field
mapping.** The only 3 differences are the outer function-wrapper
mechanics (signature, return style, error-handling location), not
computation. Live-tested this too: same vehicle ID (Toyota Corolla E210)
queried from both `/api/cars` and `/api/recommend` returns byte-identical
`avgConsumption: 5.4` and `consumptionByFuel: {hybrid: 4.9, petrol: 6.5}`.
The previously-reported "5.4 → 4.9" was `avgConsumption` (blended across
all engines) vs. `consumptionByFuel.hybrid` (hybrid-only) for the *same*
car in the *same* response — a pre-existing, unchanged `getConsumptionForFuel`
fallback (picks the fuel-specific figure once a fuel answer is set),
not a migration regression.
