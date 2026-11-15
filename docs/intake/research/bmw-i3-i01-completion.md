# BMW i3 (I01) completion — pilot for the city + EV category

**Scope:** close every gap listed by Martin for both phases (Pre-facelift 2013–2017,
Facelift 2017–2022). Nothing in this document has been written to the database — see
`supabase/migrations/` for the two proposed SQL files (INSERTs and UPDATEs, both
review-only, neither run).

**Method:** live catalog read first (Supabase MCP, read-only). Reused the already-verified
facts from `bmw-i3-i01-facelift-perplexity-test.md` (same session, same car) wherever they
already answered a gap, instead of re-researching. New Perplexity calls were small and
scoped; every returned value was independently verified against its source (WebFetch,
direct PDF download + text extraction, or a plain web search) before being used here —
Perplexity's own citations were not trusted at face value, and one of its quotes turned out
to be a straight transcription error (caught below).

---

## Perplexity call log

| # | tool | topic | duration | outcome |
|---|---|---|---|---|
| 1 | `perplexity_research` | i3 reliability, faults, maintenance cost, gearbox | ~3m35s | Completed. Explicitly declined to invent per-engine 1–5 ratings ("editorial judgement, not a verified result") — correct behaviour, rating is done by hand below from the sourced facts it found. |
| 2 | `perplexity_ask` | towing homologation + original (2013) Pre-facelift body specs | ~45s | Partial. Ground clearance found; one of its two cited sources turned out to be a dead link (caught in verification, see Gap 4). |

**2 of 8 calls used.** Everything else (gearbox detail, towing confirmation, Pre-facelift
weights, trim-feature classification, tag-rule simulation) resolved through the already-cited
sources, a plain web search, or by reading the repo's own existing rule logic — no further
Perplexity calls were needed.

---

## Gap 1 — Engine reliability, maintenance, pros/cons

Pros/cons were already filled for all 5 engines (checked live — not a gap). The gap was
`reliability_rating`, `yearly_maintenance_eur_min/max`, `maintenance_note`, all `NULL` on all 5.

**New verified evidence (this pass):**
- BMW Service Action **SI B61 31 14** (Dec 2014, model "I01 (i3 and i3 REx)"): *"A faulty
  capacitor fitted in the convenience charging electronics (KLE) could cause increased
  vehicle charging times"* — confirms the existing 60 Ah/94 Ah KLE fault as a real,
  factory-acknowledged campaign, not just an owner-forum pattern. Verified by downloading
  the PDF directly (`static.nhtsa.gov/odi/tsbs/2014/MC-10148185-9999.pdf`).
- NHTSA recall **19V-599** (Aug 2019): *"Approximately 27 vehicles contain an Electric
  Motor Electronics (EME) module that may not have been produced to specifications"* for
  **2019 BMW i3 BEV** specifically (a separate line item from the i8 and the i3 REx in the
  same report) — *"The EME module would detect this condition and, appropriately, shut down
  high-voltage electrical power"*, and *"A shut down of high-voltage electrical power would
  result in a loss of propulsion, increasing the risk of a crash."* Narrow scope: production
  dates **Jan 9 – Feb 25, 2019 only**, remedied free under warranty. Verified by downloading
  and reading the full NHTSA Part 573 report. **This is a new fault, not yet in the catalog** —
  proposed as an INSERT below, scoped to `i3-120Ah` only (the report does not separately name
  the i3s, so I have not extended it there — flagged as an open question, not assumed).
- What Car? reliability survey: **97.4%**, *"Faults were reported with electric motors,
  steering and suspension"* — verified directly on the page.
- MotorEasy/TheCarExpert extended-warranty data: **69–70%** ("middling"), *"The most
  commonly reported problems with the i3 relate to the car's electrical and suspension
  systems"* — verified directly on the page. This measures claims-rate, not owner
  satisfaction, so it isn't contradicting What Car?'s figure — different metric.
- ADAC reliability note: *"In der ADAC Pannenstatistik 2024 deuten die wenigen verfügbaren
  Zahlen auf hohe Zuverlässigkeit hin"* (the limited data available points to high
  reliability) — verified directly on the page.

**Caught in verification — do not use:** Perplexity quoted ADAC's first-service cost as
*"Wartung 1.270 €"*. Re-fetching the live page directly shows the real figure is
**"Wartung 1 — 270 €"** (due at "0 km / 24 Monate", i.e. first scheduled service) — Perplexity
misread the German thousand-separator formatting as a decimal point, inflating the real
figure by roughly 5×. This would have been a real error in the data if not caught.

**`yearly_maintenance_eur_min/max` — resolved by Martin, source M (2026-11-12): min 120,
max 150.** No independent SK/CZ EV-service price was found in research (the only cost
figure found, ADAC's real €270, is a German main-dealer price at first service — the
research pack's STANDARDS table says a main-dealer price goes to "gaps & doubts", not the
value itself). Per `docs/intake/RESEARCH-PROCESS.md`'s NULL/N/A/0/M convention, this is now
Martin's own market/experience figure rather than a researched one: *"BEV: brake fluid every
2 years, cabin filter, Vehicle Check at an SK/CZ BMW service."*

**`maintenance_note` updated to carry Martin's reasoning** (same wording all 5 engines):
*"BEV: brake fluid every 2 years, cabin/pollen filter, and a Vehicle Check at an SK/CZ BMW
service (source M, Martin). No oil changes, timing belt, or spark plugs. Coolant level check
for the EME drive-electronics cooling circuit, and 12 V auxiliary battery replacement when it
ages."* The earlier draft wording wasn't a literal BMW quote — the one BMW CBS schedule PDF
Perplexity cited for it (`bmwtechinfo.bmwgroup.com/sib_attachments/B000420...pdf`) is a
**dead link** (404, confirmed directly) — so Martin's own source-M figure replaces it as the
authoritative reason, with the already-verified EV-mechanical facts (no oil/belt/plugs) kept
alongside it.

### Proposed reliability ratings (table — current | proposed | reason | backing fault)

| engine | current | proposed | reason | backed by |
|---|---|---|---|---|
| i3-60Ah @125kW (Pre-facelift only) | `NULL` | **3** | Factory KLE charging-electronics campaign (critical, now mostly remediated under warranty) + motor-mount wear (moderate) + 12V drain (minor) — a real critical fault, but addressable, not "common and unfixed" | existing faults (3) |
| i3-94Ah @125kW (both phases) | `NULL` | **3** | Same severity profile as 60 Ah: on-file KLE/AC-charger failure (critical) + motor-mount wear (moderate) + 12V (minor) | existing faults (3) |
| i3s-94Ah @135kW (Facelift) | `NULL` | **4** | Only a minor 12V fault currently on file — fits the rubric's "4 = known moderate/minor issues only". **Flag for Martin:** this shares the exact same charging hardware as i3-94Ah, which has a critical fault on file; I found no source naming i3s-94Ah specifically for the same issue, so I did not insert one just to force parity — but the gap between a "3" and "4" here may be an artifact of what's been researched, not a real reliability difference | existing fault (1, minor) — not backing a ≤3, so rubric doesn't require more |
| i3-120Ah @125kW (Facelift) | `NULL` | **3** | 12V minor (existing) + the new 2019 EME recall (critical, but narrow — one ~2-month production window, ~27 vehicles, free warranty remedy) — "a critical one limited to some years" per the rubric | existing fault + **new proposed fault** (2) |
| i3s-120Ah @135kW (Facelift) | `NULL` | **4** | Only the minor 12V fault on file. **Flag for Martin:** the 2019 EME recall report names "2019 BMW i3 BEV" without separating i3s — plausible it's covered, not confirmed, so I did not insert an unsupported fault row for it | existing fault (1, minor) |

---

## Gap 2 — The i3's gearbox (`transmission_units`, `generic:Single-speed EV`)

**Confirmed shared, not i3-only**: this exact row is also used by Renault Zoe Phase 2 (2
configs). Proposals below are deliberately generic — nothing BMW-specific was written onto
a row other cars also reference.

| field | current | proposed | reason |
|---|---|---|---|
| `speeds` | `NULL` | **1** | Safe for any row in this `single_speed` family, by definition — not i3-specific |
| `maker` | `NULL` | **stays `NULL` — approved exception, not a gap** | Martin, 2026-11-12: *"in-house BMW eDrive reduction gear, no named supplier."* Confirms there's genuinely no third-party maker to record for the i3's own unit. Also structurally correct regardless: BMW produces its own transmission in-house at Dingolfing (*"The BMW plant in Dingolfing produces the battery, the transmission and the aluminium Drive module structure"*, verified on BMW's own press site) — but that's a BMW-specific fact, and this row is shared with Renault's Zoe (a different physical unit), so writing "BMW" here would misattribute Renault's own reducer |
| `reliability_rating` | `NULL` | **5** | No verified failure pattern for the physical reduction-gear unit itself, from any brand, found in this research. The one documented i3-family gearbox/differential failure (a PMM Online teardown) was on a **REx** car — out of scope, not a BEV fault. This is a category-level judgement ("single-speed EV reducers as a class are very reliable"), consistent with the row's own existing note, not an i3-specific finding — flagged as such |
| `service_interval_km/years`, `service_cost_eur_min/max` | `NULL` | **not filled, by design** | The Autopian, quoting BMW: *"BMW... has decided not to prescribe an oil change interval for the BMW i3's rear differential"* and *"BMW considers it a 'Filled For Life' gearbox"* — verified directly on the article. This confirms there genuinely is no interval to record, matching the row's existing `maintenance_note` ("Reducer oil is often 'lifetime'") |
| `pros` / `cons` | `NULL` | **not filled** | Nothing found beyond what the existing `reliability_note` already says; didn't want to pad with near-duplicate text |

---

## Gap 3 — Faults

One new fault proposed (see Gap 1 above): `i3-120Ah` engine, the 2019 EME recall, `critical`
severity, affected years noted as the narrow Jan–Feb 2019 production window. No gearbox fault
proposed (see Gap 2 — nothing verified for the BEV). No new vehicle-level faults found beyond
what's already on file (suspension/A-C-compressor, both phases).

---

## Gap 4 — Body: GVW/payload (both phases), ground clearance + boot sill (Pre-facelift)

**Pre-facelift — verified from BMW's own original launch document** (BMW Media Information,
07/2013, recovered via a working newsroom download link after the first-cited URL turned out
to be dead — see note below): dimensions in this PDF (3999 × 1775 × 1578 mm) match the live
catalog's stored Pre-facelift dimensions exactly, confirming it's the right document.

| field | current (Pre-facelift) | proposed | quote |
|---|---|---|---|
| `ground_clearance_mm` | `NULL` | **140** | "Ground clearance mm 140" |
| `boot_sill_height_mm` | `NULL` | **not filled** | Genuinely absent from BMW's own original spec sheet — no boot-sill line exists in the document at all, confirmed by reading all 2 pages |
| `gross_vehicle_weight_kg` | `NULL` | **1620** | "Max permissible weight / load kg / kg 1620 / 425" |
| `payload_kg` | `NULL` | **425** | same line |

**Caught in verification:** Perplexity's first attempt cited
`bmwtechinfo.bmwgroup.com/sib_attachments/B000114_Attachment_1_tech_data.pdf` for the 140 mm
figure — that URL is **dead (404, confirmed directly)**. I found the same fact independently
via a different, live BMW source (the Bulgarian press-kit landing page's own PDF attachments,
`newsroom.bmwgroup.com/emea/download/...-151.pdf`), which is the genuine July 2013 BMW Media
Information document. Used that instead; the dead link was not used as evidence.

**Known representational gap, both phases:** GVW/payload genuinely differ per engine/battery
(a heavier battery raises both), but `phase_body_dimensions` stores one row per
(phase, body_type), not per engine — same limitation already flagged in the Facelift research
doc. The Pre-facelift figures above (1620/425) are specifically the **60 Ah** car's; the
94 Ah-engined Pre-facelift car (same body, heavier pack) would be slightly higher, unverified.
For **Facelift**, this was already resolved in the prior research pass: i3-94Ah 1670/425,
i3-120Ah 1710/440, i3s-94Ah 1700/425, i3s-120Ah 1730/440 (all from BMW's own 11/2017 and
11/2018 spec PDFs, already verified then). Proposing the base i3-94Ah figures (1670/425) for
the Facelift body row, with the same per-engine caveat noted.

---

## Gap 5 — Towing

**Resolved by Martin, source M (2026-11-12): `towing_capacity_kg = 0`, both phases.**
*"No trailer homologation for I01; aftermarket hitches are approved for bike carriers only."*

Research alone had not been enough to justify `0` — three separate BMW manufacturer spec
documents across the car's life (July 2013 original, 11/2017, 11/2018 — all three
independently downloaded and read in full this session) **contain no towing-capacity line at
all** (not a stated zero, just absent from a table that otherwise lists axle loads, GVW,
payload, and every other weight figure in detail), and a plain web search found secondary
sources (GreenCarGuide, CarsGuide AU) reporting 0 kg but no literal BMW "not approved for
towing" quote. Per `docs/intake/RESEARCH-PROCESS.md`'s own convention, *absence from spec
sheets alone is not enough to write `0` — that stays `NULL` and goes to Martin.* Martin's own
confirmation is what makes it `0` rather than `NULL`.

**Consequence for configuration-level towing columns**: every i3 configuration's
`towing_braked_kg`/`towing_unbraked_kg` are **N/A** (a car with no trailer homologation has no
per-configuration figure to give). N/A stores as `NULL`, same as it already was, so no
database change there — just no longer an open gap, now a confirmed N/A.

---

## Gap 6 — Facelift configuration missing `ev_range_km`

Only `i3-94Ah @125kW` on the Facelift phase has `ev_range_km = NULL` (the other 3 Facelift
configs already have it). **Already resolved — no new research needed.** From the prior,
already-verified research pass (`bmw-i3-i01-facelift-perplexity-test.md`): BMW's own
South-Africa launch document gives this car's NEDC range as *"290 to 300 kilometres"* — a
range, not the single scalar the schema wants.

**Proposed value: 290** (the conservative/lower end of BMW's own quoted range — avoids
overclaiming a buyer-facing figure). Flagged clearly: this is a judgement call on which end
of a real range to store as a single number, not a precision BMW itself gave. Martin may
prefer the upper bound or a midpoint instead — easy one-line change either way.

---

## Gap 7 — Trim features: `feature_group` + `safety_feature_slug`

All 32 rows classified by hand against the live `catalog_trim_features_feature_group_check`
constraint and the live `safety_features` reference table (both read directly, not assumed
from the docs) — no external research needed, this is pure classification.

| feature (as stored) | feature_group | safety_feature_slug | note |
|---|---|---|---|
| 19-inch alloy wheels / 20-inch alloy wheels | wheels | — | |
| Front and side airbags | airbags | **airbags** | |
| DSC | `NULL` | **esc** | `safety_features.esc` row's own `marketing_names` includes "DSC" — verified |
| ISOFIX on the rear seats | seats | — | no ISOFIX slug exists in `safety_features` |
| Professional or Business navigation | infotainment | — | |
| automatic air conditioning | climate | — | |
| eucalyptus or carbon-look dashboard trim | interior_trim | — | |
| Grey cloth with recycled fibres | interior_trim | — | |
| LED headlights | headlights | — | |
| open-pore eucalyptus dashboard | interior_trim | — | |
| Leather / wool upholstery | interior_trim | — | |
| heated seats | seat_comfort | — | |
| 135 kW motor | `NULL` | — | spec fact, not an equipment feature — no group fits |
| Sport driving mode | `NULL` | — | no "drive mode" group exists |
| sport suspension (-10 mm) | suspension | — | |
| wider track | `NULL` | — | chassis dimension, not equipment — no group fits |
| Harman Kardon audio | sound | — | |
| Brown full-grain leather | interior_trim | — | |
| eucalyptus wood trim | interior_trim | — | |

(Full per-row mapping, including which of the two phases each duplicate applies to, is in
the UPDATE migration.)

---

## Gap 8 — Rule-based tags

**Rules exist — applied them, by hand-simulating against the live rule SQL rather than
writing new ones.** Three already-written, already-reviewed migrations define them:
`20261102230000_create_catalog_tags.sql` (schema), `20261102233000_seed_auto_configuration_tags.sql`,
`20261103090000_seed_rule_based_tags.sql`, `20261104203000_seed_dilemma_tags.sql`. All three
seed files are additive `INSERT ... SELECT ... ON CONFLICT DO NOTHING` over **live** data —
they were run before the i3 existed in the catalog, so the i3 currently has zero tags, but
**re-running the exact same files would pick it up** — no new tag SQL was needed or written.

Hand-simulated result against the i3's actual (and proposed) data:

| tag | applies? | why |
|---|---|---|
| **green_zone** | **yes, all 6 configs** | `fuel_type = 'electric'` — this is the one tag that will actually land once `20261102233000` is re-run |
| representative / head_turner | no | segment is `B`, rule needs `D` or `S` |
| family_ideal / stroller_friendly / cargo_van | no | boot is 260 l; thresholds are 500/550/1000 l |
| city_commuter | no | body/fuel match, but `kw <= 81` — the i3's 125/135 kW fails this threshold. **Worth flagging**: this rule's power ceiling is calibrated to ICE engines; a small EV hatch's instant-torque power figures read much higher than an equivalent petrol city car's, even though the i3 is, in every practical sense, a city commuter |
| highway_cruiser / hot_hatch / sleeper / ultra_efficient | no, structurally | each requires `fuel_type IN ('petrol','diesel')` explicitly — **no EV can ever match these four rules as written**, regardless of its actual character (an i3s is arguably a "hot hatch" EV, but the rule can't see it) |
| winter_ready / true_offroad | no | i3 is RWD-only, no AWD system, monocoque chassis |
| seven_seater / isofix_3x | no | 4 seats, isofix_count = 2 |
| heavy_tower | no | depends on `towing_braked_kg >= 2000`, and towing is not applicable (Gap 5) |
| bulletproof_reliability | no | needs engine `reliability_rating = 5` AND gearbox `>= 4` — the proposed engine ratings (3–4) don't clear this even with the gearbox proposed at 5 |

**Not a new rule, just an observation for Martin's decision** (per "if rules don't cover it,
list what you'd assign and why"): the existing tag rule set has **no EV-aware branch** for
what would be the electric equivalent of `city_commuter` or `hot_hatch` — every EV in the
catalog will hit the exact same wall the i3 did. If EV coverage matters for this pilot
category, that's a rule-design decision, not something I should quietly patch into this car's
own data.

---

## Fields the current intake format doesn't ask for, but this car needed

Input for revising `scripts/new-car-template/INTAKE.md` / `GEMINI-RESEARCH-PACK.md`:

1. **No way to record "genuinely not applicable, confirmed by absence across every
   manufacturer source checked" vs "just not researched yet"** for a field like towing.
   Both currently look identical — `NULL`. A `N/A`-with-evidence convention (the intake
   *document* format has this for section-level N/A, but the live schema doesn't distinguish
   it from an unresearched gap) would have made Gap 5's actual state clearer without this
   write-up.
2. **No per-engine/per-variant body-dimension or GVW/payload slot.** Hit this twice now (the
   i3 vs i3s dimension split in the prior research pass, and the 60Ah-vs-94Ah GVW split in
   this one) — `phase_body_dimensions` is keyed by (phase, body_type) only. Not something to
   fix via this car's data; a schema question for Martin.
3. **No field for "this fault was a narrow, dated, warranty-remedied recall" vs "this is an
   ongoing pattern reported by current owners."** The i3-120Ah EME fault and the i3-60/94Ah
   KLE fault are both real and both "critical" by severity, but very different in what a
   buyer today should actually worry about — currently only distinguishable by how I phrase
   the free-text `fault` string, not a structured field.
4. **Reliability-rating sourcing for EVs leans on recall/TSB databases** (NHTSA, not ADAC
   Pannenstatistik, which explicitly said it has too few i3 registrations to publish a
   verdict) — worth noting in the research pack's source-priority list as a fallback for
   low-volume/niche cars, not just the five sources it currently lists.

---

## Summary

| | |
|---|---|
| **Gaps closed** (proposed value + source, ready for review) | Pre-facelift ground clearance, GVW, payload; Facelift GVW/payload (base engine); gearbox speeds + reliability_rating; engine reliability_rating ×5 + maintenance_note ×5 + yearly_maintenance_eur ×5 (source M); 1 new fault (i3-120Ah EME); 32 trim-feature classifications; Facelift ev_range_km gap; towing_capacity_kg = 0 on both phases (source M) |
| **Still `NULL`, with reason** | Boot sill height (Pre-facelift) — genuinely absent from BMW's own doc; gearbox service interval/cost — BMW explicitly prescribes none ("filled for life") |
| **Approved exception** | Gearbox `maker` — stays `NULL` by Martin's explicit sign-off (2026-11-12): in-house BMW eDrive reduction gear, no named supplier; recording a maker here would also misattribute Renault Zoe's own unit, since the row is shared |
| **Marked not applicable (N/A)** | Every i3 configuration's `towing_braked_kg`/`towing_unbraked_kg` — a direct consequence of `towing_capacity_kg = 0` |
| **Perplexity calls** | 2 of 8 used — 1 `perplexity_research` (~3m35s), 1 `perplexity_ask` (~45s). Total ~4m20s of call time |
| **Cost to check in console** | One `perplexity_research` call (the more expensive tier) + one `perplexity_ask` call, both against the account that had credits added mid-session (two earlier 403s before that, no cost) |
| **Fields the intake format doesn't ask for** | See section above — 4 items, input for revising `INTAKE.md`/the research pack |

**Values changed from what's already in the catalog:** none proposed here contradict an
existing non-NULL catalog value — every proposal above fills a currently-`NULL` cell. Nothing
triggered the "verified manufacturer source contradicts an existing value" case.
