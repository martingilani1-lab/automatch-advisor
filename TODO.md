# AutoMatch — TODO

Working task list for the catalog_ / car-page work. Agents (Claude, Claude Code) work through it top to bottom
per section: pick the first unchecked task they can do, finish and verify it, tick it (`- [ ]` → `- [x]`),
move on. A task tagged `owner:martin` or `needs:martin` is a stop point — do the prep, then wait.

**Tags**
- `owner:claude` — an agent can do it end-to-end · `owner:martin` — Martin does it · `needs:martin` — agent preps, Martin finishes/decides
- `type:code` · `type:data` · `type:migration` · `type:content` · `type:photo` · `type:decision`
- `prio:high` / `prio:normal` / `prio:low`

**Rules that apply to every task**
- Database changes go through a reviewable migration in `supabase/migrations/` — agents never run them, Martin runs them in a fresh Supabase SQL tab. A migration task is only ticked after Martin confirms it ran (verify with a live read).
- Git: branch → `npm test` (+ `npm run build` for code) → fast-forward merge → push. See the `git-workflow` skill.
- NULL over invention; check live DB state, never infer it from migration files.
- Car photos: one main front photo per phase + body; pre-facelift and facelift never share a photo.

---

## Photos (`catalog_media`)
- [ ] León 1M **Facelift** (2003–2006), Hatchback 5-door — needs a photo different from the yellow pre-facelift one `type:photo` `needs:martin` `prio:normal`
- [ ] Octavia 1Z **Pre-facelift** (2004–2008) — no photo yet `type:photo` `needs:martin` `prio:normal`
- [ ] Octavia 1Z **Facelift** (2009–2013) — no photo yet `type:photo` `needs:martin` `prio:normal`
- [ ] Remaining phases without a photo (list them live: phases with no `catalog_media` row) `type:photo` `needs:martin` `prio:low`
- [ ] Replace stand-in photos with true phase photos when found: Kamiq NW4 FL, León KL FL, Golf CD1 FL, Fabia PJ FL, Ibiza KJ FL, Octavia 1U PF, A3 8L PF `type:photo` `needs:martin` `prio:low`

## Data — reference content
- [ ] Drivetrain content for the 18 unused `drivetrain_systems` (xDrive, 4MATIC, HTRAC, Subaru, …): rating, pros, cons, faults with severity `type:content` `needs:martin` `prio:low`
- [ ] Vehicle faults (rust, electrics, body) — `catalog_component_faults` with `component_type='vehicle'`, currently 0 rows `type:content` `needs:martin` `prio:normal`
- [ ] 0–100 km/h and top speed — empty on all configurations; decide the data source first `type:data` `needs:martin` `prio:low`
- [ ] Missing "In this car" gearbox notes (`catalog_phase_unit_notes`) for phase + gearbox pairs without one `type:content` `needs:martin` `prio:low`

## Data — fixes
- [ ] Kodiaq NS7 pre-facelift DFHA@140: both DQ381 and DQ500 configs exist — keep both or delete one `type:decision` `owner:martin` `prio:normal`
- [ ] DKZA@150 (A3 8Y, Cupra León KL): engine code looks wrong — check a VIN / parts catalogue, then fix `type:decision` `needs:martin` `prio:normal`
- [ ] Remove the empty duplicate gearbox record `VW DQ400e` (0 references; `DQ400e` is the real one) `type:migration` `owner:claude` `needs:martin` `prio:normal`
- [ ] A4 B9 engine display names without litres → e.g. "2.0 TDI (35 TDI)", "2.0 TFSI (45 TFSI)" for DEZE, DTPA, DLVB, DMSA, DKNA `type:migration` `owner:claude` `needs:martin` `prio:normal`
- [ ] ARY@132: emission standard, oil capacity, belt interval are NULL `type:data` `needs:martin` `prio:low`
- [ ] CDAA@118: engine with no configurations — keep for future cars or delete `type:decision` `owner:martin` `prio:low`
- [ ] `drivetrain_systems.type`: haldex_gen1 is `on_demand`, the other Haldex gens are `haldex` — unify `type:migration` `owner:claude` `needs:martin` `prio:low`
- [ ] Normalise `catalog_phases.typical_mileage_range` to one format ("N - N km"; 14 rows use "N-N km") `type:migration` `owner:claude` `needs:martin` `prio:low`

## Code — UI
- [ ] Car list: move from the old lime accent `#e8ff47` / `#0e0e0f` background to the "Garage" palette used on the car page (orange accent, zinc-950/900) `type:code` `owner:claude` `prio:normal`
- [ ] Body filter on the car page (so the header photo follows the selected body) — no selection state exists yet `type:code` `owner:claude` `prio:low`
- [ ] Car page: show only the fields that actually have data, then review which empty sections are worth filling (decides the data tasks above) `type:code` `owner:claude` `prio:normal`

## Code — UI — Car-list widget (`/db-test`, `CarRow.tsx`)
Requested 2026-10-19. All seven are pure display/computation work off data that's already
live (no missing content, no migration) -- classified `type:code` `owner:claude` throughout.
- [ ] Show every body type a model has, not just the primary one (e.g. "Liftback, Estate") -- `phase_body_dimensions` already has one row per body type, just needs a `bodyNames: string[]` field instead of the current single `body` string `prio:normal`
- [ ] Shorten the mileage range display: "280000 - 450000 km" → "280k - 450k km" `prio:normal`
- [ ] Remove fuel tank capacity from the car-list widget (stays on the vehicle page, untouched) `prio:low`
- [ ] Show engine power range per model, e.g. "55 kW – 165 kW" -- `minPowerKw`/`maxPowerKw` are already computed server-side in `app/api/db-test/route.ts`, this is display-only `prio:normal`
- [ ] Show consumption range per model, e.g. "4.5 – 10.5 l/100 km" (min to max across all configs) -- needs new `minConsumption`/`maxConsumption` fields `prio:normal`
- [ ] Add a tag for a named AWD drivetrain system (quattro, Haldex, xDrive, ...) when the model has one -- plain FWD stays untagged `prio:normal`
- [ ] Show reliability as a small transparent tag, top-right corner, above the make/model row (best engine tier among the phase's configs, same convention as the legacy schema's `bestRel`) `prio:normal`

Found while scoping the consumption-range item above, fixed alongside it:
- [ ] `/api/db-test`'s `avgConsumption`/`consumptionByFuel` read `fuel_consumption_combined`, a column confirmed 0%-filled across all 1550 `catalog_vehicle_configurations` rows (see `app/catalog/lib/configDisplay.ts`'s own comment) -- both fields have been silently always-null since this route was written, never caught because `CarRow.tsx` never displayed either one. Should read `fuel_consumption_l100km` instead, same column the Configurations tab already uses correctly. `type:code` `owner:claude` `prio:normal`

## Process
- [ ] Decide whether agents may run additive `INSERT` migrations themselves (e.g. photo rows) instead of Martin pasting SQL `type:decision` `owner:martin` `prio:low`
