# Renault Zoe (X10) Phase 2 completion — second city / EV pilot

Researched 2026-11-15 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
`docs/intake/FIELD-LEVELS.md`, the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`.
Goal: bring the live Zoe to the depth of the BMW i3 (I01), finished 2026-11-15.

**Scope (Martin, 2026-11-15): Phase 2 only.** The catalog has one Zoe phase — `Phase 2`, 2019–2024,
Z.E. 50 / E-Tech, 52 kWh. Phase 1 (2012/13–2019, 22 / 41 kWh, Q210 / R240 / R90 / Q90 / R110) was
never imported and stays a separate import with its own pass-1 configuration approval.

Evidence refs (`E…`) are in section 8. "Found by": **C** = Claude's own search / download;
**P→C** = Perplexity lead, source opened and quote checked by Claude.

---

## 0. Martin's decisions

| # | topic | question | Claude's recommendation | status |
|---|---|---|---|---|
| D1 | curb weight | Renault SK 2022, Renault DE 2019 and ADAC all give **1 577 kg** (EU, incl. driver). Live configs say 1 502 (Renault SK 03/2020 list, which states the same "incl. 75 kg driver" footnote but is contradicted by Renault SK's own 2022 list and by 1 988 − 486 = 1 502 → mass **without** driver). | 1 577 on the body row and both configurations | **accepted** (Martin 2026-11-15) |
| D2 | payload | ADAC "Zuladung 411 kg" (= 1 988 − 1 577). Renault SK gives a range "425–486" (486 = 1 988 − 1 502, i.e. driver counted as payload, the same way BMW's i3 "1620 / 425" is built). | **486** (manufacturer, lightest version, same convention as the i3's 425) | **486** (Martin 2026-11-15) |
| D3 | towing | Renault DE price list 09/2019, technical data: "Zulässige Anhängelast (kg) -/-" with the legend "- = nicht verfügbar"; Renault CH 02/2024: "Anhängelast gebremst -" | `towing_capacity_kg = 0` (manufacturer document says not available); config towing N/A | **accepted** (Martin 2026-11-15) |
| D4 | ISOFIX | Renault **SK** price lists (2020, 2022): ISOFIX "na zadných bočných sedadlách" (rear outer seats only). Renault **DE** 09/2019 and ADAC: also on the front passenger seat. | Keep live `isofix_count = 2`, `isofix_front_passenger = false` (SK document = target market); note DE in R | **accepted** (Martin 2026-11-15) |
| D5 | market | SK has only **5** Phase 2 listings (below the 10 minimum). CZ has **19** usable listings. | Phase price from the **CZ** column: min **13 430**, avg (median) **16 000**, max **22 340**; mileage `135 - 128,329 km` — see section 6 | **accepted**, but mileage **`10,860 - 128,329 km`** (Martin 2026-11-15: the 135 km nearly-new car stays in the price sample, not in the mileage range) |
| D6 | resale | New in SK 31 900–35 500 € list (27 900–31 500 € promo, 03/2020); 2020–2023 cars now ask a CZ median of 16 000 €, SK median 14 690 €. | keep `depreciates_fast` | **accepted** (Martin 2026-11-15) |
| D7 | motor rating | R110 / R135 have costly moderate faults (motor bearings, on-board charger) plus fixed HV-battery recalls; ADAC Pannenstatistik 2024 nevertheless lists the Zoe among the most reliable 3–10-year-old small cars. | **3** for both (rubric 4 needs "cheap or preventable"; a €2 500+ bearing job and a €4 700 charger quote are neither) | **accepted** (Martin 2026-11-15) |
| D8 | fault costs | see section 4 table — only forum / dealer-estimate figures exist, no SK / CZ price | use the figures in section 4; NULL where none | **accepted** (Martin 2026-11-15) |
| D9 | fault frequency | no source states a rate for any fault | word classes as for the i3 (rare 0.005, occasional 0.02, wear 1/N) — proposal in section 4 | **accepted** (Martin 2026-11-15) |
| D10 | trims | live trim features contradict both Renault SK price lists (see section 5): CCS is a €1 000 option on every trim (live: standard on Intens), auto climate and rear sensors are options on Zen (live: standard). "R.S. Line / Iconic" appears in no SK / CZ document. | rewrite Life / Zen / Intens from the SK lists; delete "R.S. Line / Iconic" | **accepted** (Martin 2026-11-15) |
| D11 | gearbox maker | `generic:Single-speed EV (Zoe Ph2)` has `maker` NULL; Renault builds the reducer with the motor. | approved exception like the i3 (in-house EV reduction gear, no named supplier) | **accepted** (Martin 2026-11-15) |
| D13 | 12 V cost | no source gives a repair price | left NULL (the i3's 250 is not carried over) | as recommended |
| D12 | Z.E. 40 | Phase 2 was also sold as **R110 Z.E. 40** (41 kWh, 06/2019–02/2022) in DE (ADAC), and such cars are on the CZ market. Neither SK price list offers it. | don't add (not an SK configuration); listings with 41 kWh are excluded from the market sample | **accepted** (Martin 2026-11-15) |

**Migration files (2026-11-15):**
- `20261115200000_renault_zoe_x10_faults_insert.sql` — 14 new fault rows (additive INSERT; may run
  via MCP after Martin has reviewed it).
- `20261115200500_renault_zoe_x10_completion_updates.sql` — phase, body, configurations, engines,
  existing faults, trims (UPDATE / DELETE) — Martin ran it 2026-11-15, rows read back. INSERT file ran via MCP. Tag-rule preview: nothing pending; `npm test` 144/144.

---

## 1. Gap check — live rows vs FIELD-LEVELS.md (read 2026-11-15, Supabase MCP, read-only)

Live rows: 1 phase (`8874774e…`), 1 phase × body row (Hatchback 5-door), 2 engines (`R110@80`
`8895faeb…`, `R135@100` `819a6771…`), 2 configurations, 1 gearbox (`generic:Single-speed EV (Zoe Ph2)`
`a169a262…`), 4 trims / 18 features, 4 faults, tags `city_commuter` + `green_zone` on both configs,
1 photo.

| area | field | level | live | finding |
|---|---|---|---|---|
| Phase | generation_code, years, platform, chassis, cycle | required | filled | OK (X10, 2019–2024, monocoque, WLTP; ADAC: facelift 06/2019, production end 03/2024 — E5) |
| Phase | safety_rating, ncap_year, 4 × ncap % | required / cond. | 0, 2021, 43/52/41/14 | OK, re-confirmed (E12) |
| Phase | price min / avg / max, typical_mileage_range | **required** | NULL | **gap** → section 6, D5 |
| Phase | resale_value_rating | required | depreciates_fast | needs market evidence → D6 |
| Phase | towing_capacity_kg | **required** | NULL | **gap** → D3 (0) |
| Body | length / width / height | required | 4087 / 1787 / 1562 | OK (E1, E2, E3) |
| Body | curb_weight_kg | **required** | NULL | **gap** → D1 (1 577) |
| Body | gross_vehicle_weight_kg, payload_kg | **required** | NULL | **gap** → 1 988 (E1, E2, E3), payload D2 |
| Body | boot 338 / 1 225, seats 5 | required | filled | OK (E1, E2, E3) |
| Body | isofix_count, isofix_front_passenger | required | 2 / false ("verify") | sources disagree by market → D4 |
| Body | fuel_tank, boot sill, 7-seat, off-road | conditional | NULL | N/A (pure EV, hatchback, 5 seats, not off-road) |
| Engine | code, power, fuel, display_name, torque | required | filled | OK (E1, E2: 80 kW / 225 Nm, 100 kW / 245 Nm) |
| Engine | battery 52 net, AC 22, DC 50, heat pump `standard` | conditional | filled | OK (E2, E3, E4: 52 kWh net; AC 22; DC 50 kW = €1 000 option; heat pump standard on every SK trim) |
| Engine | battery_thermal_management `active_air` | conditional | filled | **not re-verified** — no Renault document found that describes the pack's cooling; kept, listed in R |
| Engine | combustion columns, hybrid_type, DPF / AdBlue | conditional | NULL / false | N/A (pure EV) |
| Engine | reliability_rating | **required** | NULL ×2 | **gap** → D7 |
| Engine | pros, cons | **required** | NULL ×2 | **gap** → section 3 |
| Engine | maintenance_note | **required** | NULL ×2 | **gap** → section 3 |
| Engine | yearly_maintenance_eur | conditional | NULL | N/A (pure EV, Martin 2026-11-14) |
| Gearbox | family, speeds | required | single_speed, 1 | OK |
| Gearbox | maker | required | NULL | exception → D11 |
| Gearbox | rating 5, notes, pros, cons | required | filled | OK (split migration `20261114120000`); no reducer fault found in this pass either |
| Gearbox | service interval / cost | conditional | NULL | N/A (single-speed reducer, no Renault interval — already in its maintenance_note) |
| Config | kWh/100 km, cycle, 0–100, top speed | required | filled | OK — 17.2 / 17.7 WLTP, 11.4 / 9.5 s, 135 / 140 km/h (E1, E2, E3) |
| Config | curb_weight_kg | required | 1 502 ×2 | **conflict** → D1 |
| Config | ev_range_km | conditional | 395 / 386 | OK (E2, E3). Renault CH 02/2024 gives 385 km for the 2024 R135 E-Tech (E4) — later homologation, live value kept |
| Config | co2, towing, secondary fuel, tank override | conditional | NULL | N/A (pure EV; towing N/A once D3 = 0) |
| Trims | ≥ 1 trim | required | 4 | OK, but contents wrong → D10 |
| Trims | feature_group on every feature | **required** | NULL on all 18 | **gap** → section 5 |
| Trims | safety_feature_slug | conditional | NULL on all | **gap** → section 5 |
| Faults | ≥ 1 vehicle fault | required | 1 | OK |
| Faults | cost min / max, annual_probability | **required** | NULL on all 4 | **gap** → D8, D9 |
| Faults | affected years | conditional | NULL | engines are Phase 2-only, so only the recall rows need years (section 4) |
| Faults | engine fault when rating ≤ 3 | conditional | 2–3 per engine | OK once D7 = 3 (backed by bearing + charger faults) |
| Tags | rule-based | required | city_commuter, green_zone | re-run after the writes |
| Tyre wear | 4 columns | optional | NULL | left NULL (front-driven, generic set applies) |
| Media | photo | optional | 1 | OK |

---

## 2. Phase and body (passes 2–3)

| field | live | proposed | evidence |
|---|---|---|---|
| towing_capacity_kg | NULL | **0** (D3) | E2 "Zulässige Anhängelast (kg) -/-", legend "- = nicht verfügbar"; E4 "Anhängelast gebremst -" |
| curb_weight_kg (body) | NULL | **1 577** (D1) | E1 "Leergewicht (EU) 1577 kg"; E2 "Leergewicht¹ 1.577 / 1.577 / 1.577", footnote "Leergewicht mit Fahrer 68 kg und Gepäck 7 kg, ermittelt nach der RL 92/21/EWG"; E3b "prevádzková hmotnosť (kg) 1 577 / 1 577", "v údajoch je započítaná hmotnosť vodiča (75 kg)" |
| gross_vehicle_weight_kg | NULL | **1 988** | E1 "Zul. Gesamtgewicht 1988 kg"; E2 "Zulässiges Gesamtgewicht (kg) … 1.988"; E3b "maximálna povolená celková hmotnosť (kg) 1 988" |
| payload_kg | NULL | **486** or 411 (D2) | E3b "maximálne užitočné zaťaženie (kg) 425–486"; E1 "Zuladung 411 kg" |
| isofix | 2 / false | keep (D4) | E3 "Systém ISOFIX – príprava na upevnenie detskej sedačky na zadných bočných sedadlách"; contra E2 "ISOFIX-Kindersitzbefestigung auf dem Beifahrersitz und den hinteren Außenplätzen", E1 "Isofix - Bezeichnung: Vorn und hinten" |
| ground_clearance_mm | 120 | keep | E1 "Bodenfreiheit maximal 120 mm"; E2 "120" |
| roof_load_kg, nose_weight_kg | NULL | NULL | not published in any document opened (optional) |

Configuration `curb_weight_kg`: **1 577** on both rows (D1), same evidence.

---

## 3. Engines R110@80 and R135@100 (pass 4)

### 3a. Proposed values

| field | R110@80 | R135@100 |
|---|---|---|
| reliability_rating | **3** (D7) | **3** (D7) |
| rating reason | Moderate but costly faults on file: drive-motor bearing wear (ADAC "vermehrt auftretende Motorschäden (Lagerung)") and on-board charger failures; HV-battery recalls in narrow build windows were fixed by campaigns and don't lower the rating. ADAC breakdown figures are good (E7), the 12 V battery is the main breakdown cause. | same |
| maintenance_note | "Renault service every 30 000 km or 12 months (ADAC lists service 1 at €120 and service 2 at €130 at a German dealer). No oil, timing belt or spark plugs. Routine items: brake fluid, cabin filter, coolant for the motor / power-electronics circuit as the Renault maintenance document specifies, and the 12 V battery when it ages — ADAC names the Zoe's 12 V battery as relatively breakdown-prone." | same |
| pros | "52 kWh usable battery: 395 km WLTP" ; "22 kW three-phase AC charging (Caméléon) standard -- about 3 h on a 22 kW wallbox" ; "Heat pump standard on every trim sold in Slovakia" | "52 kWh usable battery: 386 km WLTP" ; "100 kW / 245 Nm: 0-100 km/h in 9.5 s" ; "22 kW three-phase AC charging (Caméléon) standard -- about 3 h on a 22 kW wallbox" ; "Heat pump standard on every trim sold in Slovakia" |
| cons | "DC fast charging (CCS, 50 kW) was a €1 000 option -- many cars have no CCS socket; with it, about 70 min to 80 %" ; "80 kW: 0-100 km/h in 11.4 s, 135 km/h top speed -- slow on the motorway" ; "Some German-market cars were sold with a rented battery (until 11/2020) -- check the battery is owned" | "DC fast charging (CCS, 50 kW) was a €1 000 option -- many cars have no CCS socket; with it, about 70 min to 80 %" ; "Some German-market cars were sold with a rented battery (until 11/2020) -- check the battery is owned" |

Evidence: 395 / 386 km, 0–100, top speed, "rýchlonabíjanie DC s adaptérom CCS Combo (50 kW) 1 000 €"
on Life / Zen / Intens, "22 kW … 3 h", "rychlonabíjanie DC 50 kW (0–80 %) 1 h 10", heat pump "•" on
all three trims — E3, E3b. Battery rental: ADAC E5 "11/2020 alle Varianten nur noch mit
Batteriekauf erhältlich"; Renault DE E2 prices the car "MIT BATTERIEMIETE" and "MIT BATTERIEKAUF".
Service interval: E2 "Wartungsintervalle 30.000 km/1 Jahr"; ADAC E5 "Wartung 1 120 … 30000/12",
"Wartung 2 130 … 60000/24". 12 V battery: E7.

`yearly_maintenance_eur_min/max`: **N/A** (pure EV — the Costs tab leaves the line out; Martin
2026-11-14). The ADAC figures are German dealer prices, quoted in the note only.

### 3b. Gearbox `generic:Single-speed EV (Zoe Ph2)`

No change except D11 (maker exception). Nothing new found: Renault DE E2 "Getriebeart:
Automatisches Untersetzungsgetriebe, Anzahl der Gänge 1"; no reducer fault in ADAC, Safety Gate or
the forums read. The motor-bearing fault (section 4) is filed on the motor rows, not the reducer.

---

## 4. Faults (pass 4)

Existing rows get costs / frequency; new rows are added. Costs are repair prices out of warranty;
no SK / CZ price was found for any of them, so every figure below is a German forum / dealer
estimate and needs Martin's OK (D8). Frequency words → `annual_probability` as for the i3 (D9).

| # | target | fault (DB text) | severity | years | cost EUR | frequency → prob. | pre_purchase_check | evidence |
|---|---|---|---|---|---|---|---|---|
| F1 (live ×2) | R110, R135 | Onboard "Chameleon" charger faults — AC charging stops or won't start on some wallboxes (earth / leakage sensitivity). | moderate | — | **4 700** (single Renault-dealer estimate, 2019 R110 Z.E. 50, 33 000 km) | occasional → 0.02 | AC-charge the car on a 22 kW / three-phase wallbox before buying | E8 (P→C) |
| F2 (live R110, **new R135**) | R110, R135 | 12 V battery drain — the car won't wake up although the traction battery is full. | minor | — | NULL → Martin (i3 used 250) | wear, 4-year life → 0.25 | — | E7 (ADAC: "relativ pannenanfällige Starterbatterie") |
| F3 (live) | Phase 2 | Heat-pump / AC refrigerant leaks; heating falls back to the weaker resistive heater. | minor | — | NULL → Martin | occasional → 0.02 | — | (live row; no new source) |
| F4 **new** | R110, R135 | Drive-motor rotor bearings wear — a hum or whine that rises with speed; a Renault dealer replaces the whole motor, independent EV specialists replace only the bearings. | moderate | — | **2 500 – 3 500** (independent specialist estimates) | occasional → 0.02 | Listen for a speed-dependent hum at 30–80 km/h on the test drive | E5 (ADAC: "fressende Lager im Antriebsmotor"), E9 (P→C) |
| F5 **new** | Phase 2 (vehicle, climate) | A/C compressor failure — no cooling and, with the heat pump, weak heating. | moderate | — | **1 900 – 2 200** (dealer estimate, 2019 R110 Z.E. 50) | occasional → 0.02 | Check that the A/C blows cold and the heating works on the test drive | E5 ("defekte Klimakompressoren"), E8 (P→C) |
| F6 **new** | Phase 2 (vehicle, suspension) | Front suspension wears early (control-arm bushes) — knocking over bumps. | moderate | — | NULL → Martin | occasional → 0.02 | Check the front control-arm bushes on a lift | E5 ("die vorderen oft ausgeschlagenen Achsaufhängungen") |
| F7 **new** | Phase 2 (vehicle, brakes) | Brake discs rust because regenerative braking leaves them little work — grinding, uneven braking, MOT findings. | minor | — | NULL → Martin | occasional → 0.02 | Look at the disc surfaces; rusty, scored discs need replacing | E5 ("rostende Bremsscheiben") |
| R1 **new** | R110, R135 | Recall: 2019 Zoe built 23.9.–18.12.2019 (Renault campaign 0DA5) — a production defect in the traction battery may cause a short circuit and fire. Recall campaign; check it was done. | critical | 2019–2019 | N/A (fixed recall) | N/A | Ask a Renault dealer to confirm campaign 0DA5 is closed for the VIN | E10a |
| R2 **new** | R110, R135 | Recall: 2021 Zoe built 3.1.–22.2.2021 with the 52 kWh battery (campaign 0DKQ) — a battery-module defect may cause an internal short circuit and fire; the battery is checked and the module replaced if needed. | critical | 2021–2021 | N/A | N/A | Ask a Renault dealer to confirm campaign 0DKQ is closed for the VIN | E10b |
| R3 **new** | R110, R135 | Recall: 2023 Zoe built at Flins 1.–28.9.2023 (campaign 0EBN) — a manufacturing issue may cause a short circuit in the high-voltage battery and fire. | critical | 2023–2023 | N/A | N/A | Ask a Renault dealer to confirm campaign 0EBN is closed for the VIN | E10c |
| R4 **new** | Phase 2 (vehicle, steering) | Recall: Zoe (X10) built 04–10/2019 (campaign 0D9V) — the steering-column motor control may fail, with loss of power steering. | critical | 2019–2019 | N/A | N/A | Ask a Renault dealer to confirm campaign 0D9V is closed for the VIN | E10d |
| R5 **new** | Phase 2 (vehicle, interior) | Recall: Zoe built 14.11.–3.12.2022 (campaign 0E1E) — the rear seat backrest may not lock; passengers and luggage can be thrown forward in a crash. | moderate | 2022–2022 | N/A | N/A | Check the rear backrest locks; confirm campaign 0E1E | E10e |

Not filed (looked for, not enough evidence): charging-flap actuator (one €680 quote, car not
identified as Phase 2); traction-battery heater faults (none found); battery degradation (only single
readings, 89–94 % SoH at 60 000–225 000 km — no pattern of failure, E11).

---

## 5. Trims (pass 3) — from the Renault Slovensko price lists (E3 03/2020, E3b 01/2022)

SK sold **Life, Zen, Intens** (R110 in Life / Zen, R135 in Zen (2020) / Intens). Features follow the
i3 convention: a higher tier lists only what it adds. Charging hardware (CCS) is not a trim feature —
it lives on the engine row (`max_dc_charging_kw`) and in the engine cons.

| trim | feature | std / opt | feature_group | safety slug |
|---|---|---|---|---|
| Life | Front and side airbags for driver and passenger, passenger airbag can be switched off | std | airbags | airbags |
| Life | ESC stability control with traction control | std | NULL | esc |
| Life | Tyre pressure monitoring | std | NULL | tyre_pressure_monitoring |
| Life | ISOFIX on the rear outer seats | std | seats | NULL |
| Life | Cruise control with speed limiter | std | cruise | NULL |
| Life | Full LED headlights (LED Pure Vision) | std | headlights | NULL |
| Life | Rain and light sensor | std | light_rain_sensors | NULL |
| Life | 15-inch steel wheels | std | wheels | NULL |
| Life | Manual air conditioning | std | climate | NULL |
| Life | Heat pump | std | climate | NULL |
| Life | 10-inch digital instrument cluster | std | instruments | NULL |
| Life | Easy Link 7-inch multimedia system | std (03/2020) | infotainment | NULL |
| Life | Hands-free key card | std | locking | NULL |
| Life | Rear parking sensors | opt | parking | reversing_detection |
| Life | Winter pack: heated front seats and heated steering wheel | opt | seat_comfort | NULL |
| Zen | Lane keeping assist with active steering correction | std | NULL | emergency_lane_keeping |
| Zen | Blind-spot warning | std | NULL | blind_spot_monitoring |
| Zen | 16-inch alloy wheels | std | wheels | NULL |
| Zen | Automatic high beam | std | headlights | NULL |
| Zen | Recycled-fabric (Recytex) upholstery | std | interior_trim | NULL |
| Zen | Faux-leather steering wheel | std | steering_wheel | NULL |
| Zen | Electric rear windows, 1/3-2/3 split rear seat | std | windows | NULL |
| Zen | Wireless smartphone charging | std (03/2020) | smartphone | NULL |
| Zen | Automatic climate control | opt | climate | NULL |
| Zen | Front fog lights with cornering function | opt | fog_lights | NULL |
| Intens | Traffic sign recognition with speed warning | std | NULL | isa |
| Intens | Front and rear parking sensors with reversing camera | std | parking | reversing_detection |
| Intens | Automatic climate control | std | climate | NULL |
| Intens | Front LED fog lights with cornering function | std | fog_lights | NULL |
| Intens | Easy Link navigation, 9.3-inch screen (standard in 2020 via Pack Navigácia Plus) | std (03/2020) | infotainment | NULL |
| Intens | Black diamond-cut 16-inch alloy wheels; 17-inch optional | std | wheels | NULL |
| Intens | Electrically folding heated mirrors, dark-tinted rear windows | std | mirrors | NULL |
| Intens | Bose audio | opt | sound | NULL |
| Intens | Easy Park Assist (front, rear and side sensors, automatic steering) | opt | parking | parking_assist |

Notes for Martin:
- **Life / Zen 7-inch screen**: 03/2020 Life has Easy Link 7" standard; 01/2022 Life has only
  "príprava pre rádio" with Easy Link 7" in a €600 pack. Proposal stores the 2020 state; the
  difference goes in R.
- **Zen wireless charging**: 03/2020 Zen "•"; 01/2022 Intens only. Same treatment.
- `isa`: the SK list says "systém rozpoznávania dopravných značiek s upozornením na prekročenie
  povolenej rýchlosti" (traffic-sign recognition with speed warning) — a warning, which is what the
  `isa` slug's GSR2 definition covers in its warning form. If Martin reads `isa` as active limiting
  only, that slug goes to NULL.
- **AEB** ("systém aktívneho núdzového brzdenia s detekciou chodcov a cyklistov") appears only in the
  01/2022 list (Intens standard, Zen pack City). Not in the 2020 list → left out of the trims, listed
  in R. (Renault made AEB standard on orders from 03/2022 — E12 coverage.)
- **E-Tech trims 2022–2024** (Equilibre / Evolution / Techno / Iconic in FR; evolution / iconic in CH
  02/2024 — E4) — no SK / CZ document found. Not added.

---

## 6. Market (pass 5) — listings read 2026-11-15

CZK → EUR at the ECB reference rate of 2026-11-13, **24.424 CZK/EUR** (E13). Asking prices.
Included: Phase 2 (R135, or R110 with 52 kWh stated / Z.E. 50 / first registered after the Z.E. 40 was
dropped), battery owned, undamaged, 5-seat passenger car. Excluded rows are listed with the reason.

### 6a. SK (5 usable — below the 10 minimum)

| # | site | id | 1st reg. | config | km | price EUR |
|---|---|---|---|---|---|---|
| S1 | bazos.sk | 197536404 | 6/20(21) | R135 Riviera | 149 000 | 13 990 |
| S2 | bazos.sk | 195862934 | 09/2020 | R110 Experience (DE import) | 13 360 | 16 990 |
| S3 | autobazar.eu | Am-1s2XYdVx | 04/2021 | R110 Life | 61 000 | 14 690 (same car as bazos.sk 196807679, 14 590 — counted once) |
| S4 | autobazar.eu | AeiJ1G24eHA | 06/2021 | R110 Life | 35 950 | 13 900 |
| S5 | autobazar.eu | AmBaR752TAk | 01/2022 | R110 Life | 45 050 | 16 000 |
| x | bazos.sk | 197445634 / 197445426 | 2019 | 80 kW, battery unknown, "momentálne n…" | — | 5 000 — excluded (not running / phase unclear) |
| x | bazos.sk | 197273420 | 2019 | 41 kWh, damaged | 154 000 | 5 500 — excluded |
| x | bazos.sk | 197193633 | 2019 | R90 41 kWh (Phase 1) | 100 000 | 11 000 — excluded |

SK: n 5 · median **14 690** · 13 900 – 16 990 · 13 360 – 149 000 km.

### 6b. CZ (19 usable)

| # | site | id | 1st reg. | config | km | price | EUR |
|---|---|---|---|---|---|---|---|
| C1 | sauto.cz | 211028562 | 04/2021 | R135 Riviera, CCS | 112 000 | 379 900 CZK | 15 554 (= bazos.cz 226334469, counted once) |
| C2 | sauto.cz | 211085346 | 12/2023 | Iconic EV50 135 (DE import offer) | 33 750 | 545 710 CZK | 22 343 |
| C3 | sauto.cz | 211085382 | 04/2023 | EV50 135 (DE import offer) | 12 737 | 632 830 CZK | 25 910 |
| C4 | sauto.cz | 211085412 | 12/2023 | Iconic R135 (DE import offer) | 23 450 | 566 280 CZK | 23 186 |
| C5 | sauto.cz | 211232103 | 2020 | Zen, 80 kW, "54 kWh" (gross Z.E. 50) | 75 000 | 348 000 CZK | 14 248 |
| C6 | sauto.cz | 211335297 | 05/2021 | ZE50 R135 | 22 943 | 450 000 CZK | 18 425 |
| C7 | sauto.cz | 211364427 | 11/2021 | R135 Intens (= bazos.cz 225776516) | 59 499 | 428 000 CZK | 17 524 |
| C8 | sauto.cz | 211404531 | 2021 | 50 kWh (= bazos.cz 226071086) | 81 000 | 269 000 CZK | 11 014 |
| C9 | sauto.cz | 211405077 | 11/2021 | R135 Intens (= bazos.cz 226300965) | 41 726 | 439 900 CZK | 18 011 |
| C10 | sauto.cz | 211444314 | 01/2022 | R135 Intens ZE50 | 65 000 | 330 000 CZK | 13 511 |
| C11 | sauto.cz | 211448616 | 02/2021 | R110 Experience 52 kWh (= bazos.cz 226391223) | 64 285 | 388 800 CZK | 15 919 |
| C12 | sauto.cz | 210849491 | 05/2024 | R110 Evolution | 135 | 469 999 CZK | 19 243 |
| C13 | bazos.cz | 224463014 | 08/2020 | ZE50 R135 Intens | 128 329 | 338 000 CZK | 13 839 |
| C14 | bazos.cz | 224463022 | 12/2020 | ZE50 52 kWh | 100 537 | 328 000 CZK | 13 430 |
| C15 | bazos.cz | 224875582 | 02/2020 | R135 Edition One 52 kWh | ~121 000 | 328 000 CZK | 13 430 |
| C16 | bazos.cz | 226466608 | — | R135 52 kWh | 96 000 | 299 000 CZK | 12 242 |
| C17 | autobazar.eu | Aej7GzEfYtP | 2020 | R135 (ČSAO Praha) | 10 860 | 450 000 CZK | 18 425 |
| C18 | autobazar.eu | AerrbDKh2eB | 2020 | R135 (ČSAO Praha) | 12 018 | 480 000 CZK | 19 653 |
| C19 | bazos.sk | 197165460 | 10/2020 | Intens R135 52 kWh (Czech seller) | 39 892 | 16 000 € | 16 000 |
| x | sauto.cz | 211246191 | 05/2021 | R110 "Business" 2-seat commercial | — | — | excluded (van body) |
| x | sauto.cz | 211290570 | 07/2019 | 41 kWh Limited (Phase 1) | — | — | excluded |
| x | sauto.cz | 211431237 | 10/2021 | ZE40 R110 (Phase 2, 41 kWh — D12) | — | — | excluded |
| x | sauto.cz | 211443957 | 06/2020 | "po celkové opravě" | — | — | excluded (rebuilt) |
| x | bazos.cz | 224463038 | 03/2022 | Life R110, 41 kWh (D12) | — | — | excluded |
| x | bazos.cz | 225416571 | 2020 | damaged, parts | — | — | excluded |

CZ, lowest 2 and highest 2 cut (~10 %): n 15 · median **16 000** · **13 430 – 22 343** ·
mileage of the kept listings **135 – 128 329 km** (median 59 499).

### 6c. DE reference (mobile.de, `cn=DE`, damaged hidden, first registration from 2020; first result page of 272)

13 usable (Z.E. 50 / R135 / 52 kWh stated, battery bought): 13 700 – 18 290 €, median after cutting
1 at each end **15 990 €**, 30 145 – 73 500 km. Excluded on the same page: 3 battery-rental cars
("zzgl. Batteriemiete"), 5 with the battery size not stated, 2 duplicates. Ids: 50854148245664,
55315035342016, 54805067444992, 46101343627488, 51876253552672, 449147048, 55615315514752,
50744045143200, 49292759530496 (= 50536395929888), 50333454612864, 55783939854304,
55868221904000 (= 55969145601312), 50358936420736.

### 6d. Proposal (D5, D6)

| field | value | why |
|---|---|---|
| price_range_min_eur | **13 430** | CZ, cheapest after the cut |
| avg_market_price_eur | **16 000** | CZ median; SK 14 690 and DE 15 990 agree within 10 % |
| price_range_max_eur | **22 340** | CZ, dearest after the cut (a 2023 Iconic) |
| typical_mileage_range | **`10,860 - 128,329 km`** | kept CZ listings without the 135 km nearly-new car (Martin, 2026-11-15) |
| resale_value_rating | **depreciates_fast** (unchanged) | Renault SK list 31 900 – 35 500 € in 2020 → ~14 700 – 16 000 € asking 4–6 years later, below half the list price |

---

## 7. Perplexity log (budget 8, used 1)

| # | tool | topic | duration | outcome |
|---|---|---|---|---|
| 1 | `perplexity_research` | Phase 2 recalls, faults, ADAC, battery health, service | ~4 min | Useful leads. Every recall PDF, the ADAC report and the two forum costs were opened by Claude (E5, E7–E10). Its battery-health and carchecker.pro figures were not used (single readings / aggregator). |

Everything else came from Claude's own downloads: Renault SK / DE / CH price lists, ADAC pages,
Safety Gate PDFs, sauto.cz API, bazos, autobazar.eu and mobile.de in the browser pane.

---

## 8. Evidence

| ref | source | quote |
|---|---|---|
| E1 | ADAC Autokatalog, Zoe R110 Z.E. 50 Life (10/19–02/22) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/renault/zoe/1generation-facelift/301605 and R135 Experience …/301231/ | "Leergewicht (EU) 1577 kg", "Zul. Gesamtgewicht 1988 kg", "Zuladung 411 kg", "Bodenfreiheit maximal 120 mm", "Batteriekapazität (Netto) in kWh 52,0", "Ladeleistung AC:2,3-22,0 DC:50", "Isofix - Bezeichnung: Vorn und hinten" |
| E2 | Renault Deutschland, ZOE Preise und Ausstattungen, gültig ab 1. September 2019 https://professional.auto-motor-und-sport.de/static-download/news/1775221/pl_zoe_0919.pdf | "GEWICHTE IN KILOGRAMM 1.577 … Zulässiges Gesamtgewicht … 1.988 … Zulässige Anhängelast (kg) -/-"; "- = nicht verfügbar"; "ISOFIX-Kindersitzbefestigung auf dem Beifahrersitz und den hinteren Außenplätzen"; "Wartungsintervalle 30.000 km/1 Jahr" |
| E3 | Renault Slovensko, cenník Nové Renault ZOE, platnosť od 1. 3. 2020 https://autostyl.sk/data/documents/cennik-renault-zoe-06-2020-sf1z2.pdf | "Life R110 Z.E. 52 kWh 31 900 €"; "Systém ISOFIX – príprava na upevnenie detskej sedačky na zadných bočných sedadlách • • •"; "Rýchlonabíjanie DC s adaptérom CCS Combo (50kW) 1 000 1 000 1 000"; "Systém vykurovania - tepelné čerpadlo • • •"; "Prevádzková hmotnosť (kg) 1 502" |
| E3b | Renault Slovensko, cenník ZOE, platnosť od 1. 1. 2022 https://www.autostyl.sk/data/documents/cennik-renault-zoe-01-2022-u03vx.pdf | "prevádzková hmotnosť (kg) 1 577 1 577"; "maximálne užitočné zaťaženie (kg) 425–486"; "maximálna povolená celková hmotnosť (kg) 1 988"; "v údajoch je započítaná hmotnosť vodiča (75 kg)"; "rychlonabíjanie DC 50 kW (0–80 %) 1 h 10"; "homologovaný dojazd – kombinovaný cyklus 395 386" |
| E4 | Renault Schweiz, ZOE E-Tech Electric Preisliste Nr. 18.0 ab Februar 2024 https://cdn.group.renault.com/ren/ch/renault-new-cars/pricelists/Renault_Neuer_ZOE_PL_d.pdf.asset.pdf/bc0df63545.pdf | "Anhängelast gebremst -"; "Homologierte Reichweite (km) laut WLTP 385"; trims "evolution", "iconic"; "Seitenairbags vorne (Oberkörper)" |
| E5 | ADAC Gebrauchtwageninfo Renault Zoe (2013-2024) https://assets.adac.de/image/upload/Autodatenbank/GWInfo/gw0272-renault-zoe-2013-2024-bericht.pdf | "Bekanntes Problemfelder sind fressende Lager im Antriebsmotor und defekte Klimakompressoren"; "vermehrt auftretende Motorschäden (Lagerung)"; "die vorderen oft ausgeschlagenen Achsaufhängungen sowie rostende Bremsscheiben"; "11/2020 alle Varianten nur noch mit Batteriekauf erhältlich"; "Wartung 1 120 … 30000/12" |
| E7 | ADAC Pannenstatistik 2024 https://assets.adac.de/image/upload/v1743002144/ADAC-eV/KOR/Text/PDF/Pannenstatistik-2024_qeltwz.pdf | "Der Renault Zoe war im Bestand des Erstzulassungsjahres 2020 stark vertreten und hat eine relativ pannenanfällige Starterbatterie."; Zoe in "Zuverlässigste Baureihen zwischen drei und zehn Jahren" |
| E8 | zoe-forum.de, user jayberlin https://www.zoe-forum.de/forum/user-post-list/2842-jayberlin/ | "Renault Zoe Phase 2 Z.E. 50 R110", "Baujahr: 2019", "ca. 33.000 km"; "Für diese Reparatur wurden ca. 4.700 € veranschlagt" (on-board charger); "Der Kostenvoranschlag für die Reparatur liegt hier bei ca. 1.900 € bis 2.200 €" (A/C compressor) |
| E9 | zoe-forum.de thread "Werkstatt für Motorinstandsetzung / Lagertausch Zoé Z.E. 50" https://www.zoe-forum.de/forum/thread/1762-werkstatt-f%C3%BCr-motorinstandsetzung-lagertausch-zo%C3%A9-z-e-50/ | "Renault wird den Motor nur als gesamtes Bauteil tauschen"; remote estimate "ca 2500" for bearings; "bei manchen ZOEs die motoren bei 60TKM den Lagerschaden erleiden" |
| E10a | EU Safety Gate, recall 0DA5 https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/10001095/en | "23.9.2019 to 18.12.2019"; "A production defect in the battery may lead to a short circuit … increasing the risk of fire" |
| E10b | EU Safety Gate, recall (Renault 0DKQ) https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/10005369/en | "ZOE equipped with battery BT4 XLR (Extra Long Range)"; "3.01.2021 - 22.02.2021"; "internal short circuit … increased risk of fire" |
| E10c | EU Safety Gate, recall 0EBN https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/10012405/en | "between 1 September 2023 and 28 September 2023"; "Vehicles manufactured at FLINS factory"; "a short circuit may occur within the high voltage battery" |
| E10d | EU Safety Gate, recall 0D9V https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/10000649/en | "Captur II, Clio V, Zoe Neo"; "Types: XJA, XJB, X10"; "manufactured between April and October 2019"; "loss of steering assistance" |
| E10e | EU Safety Gate, recall 0E1E https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/10009512/en | "14/11/2022 - 3/12/2022"; "The backrest of the rear seat may be faulty" |
| E11 | battery-health readings (Perplexity, not used) | single readings 89–94 % SoH — no pattern; listed for completeness |
| E12 | InsideEVs, 2021-12 https://insideevs.com/news/553158/renault-zoe-euroncap-0stars-crashtest/ | "43% Adult Occupant, 52% Child Occupant, 41% Vulnerable Road Users and 14% Safety Assist" (euroncap.com result page not reachable from here, 404) |
| E13 | ECB https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml | 2026-11-13: CZK 24.424 |
| E14 | listing pages in section 6 (sauto.cz API `api/v1/items/<id>`, auto.bazos.sk / .cz, autobazar.eu, suchen.mobile.de) | all seen 2026-11-15 |

---

## 9. R — gaps and doubts

| item | what is missing / unclear | where looked |
|---|---|---|
| battery_thermal_management `active_air` | no Renault document describing the Z.E. 50 pack's cooling was found; one owner (Perplexity lead, not opened) says the pack has no active heating | Renault SK / DE / CH price lists, ADAC |
| curb weight 1 502 vs 1 577 | Renault SK 03/2020 says 1 502 "incl. 75 kg driver", Renault SK 01/2022 and Renault DE say 1 577 → D1 | E2, E3, E3b |
| ISOFIX front passenger | SK lists: rear only; DE list and ADAC: front passenger too → D4 | E1, E2, E3 |
| fault costs | no SK / CZ repair price for any fault; German dealer / forum figures only | ADAC, zoe-forum.de, Perplexity |
| fault frequency | no source states a yearly rate | same |
| AEB | only in the 01/2022 SK list (Intens std, Zen pack) | E3, E3b |
| E-Tech trims 2022–2024 SK / CZ | no SK / CZ price list found | renault.sk / autostyl.sk search |
| 2024 R135 range | Renault CH 02/2024: 385 km WLTP vs live 386 (E3b, ADAC, 2019–2022) | E4 |
| SK market | 5 listings only | autobazar.eu, bazos.sk |
| Z.E. 40 Phase 2 | real configuration in DE (ADAC), not in SK lists → D12 | E5, E3, E3b |
