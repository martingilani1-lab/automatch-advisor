# BMW i3 (I01) — Range Extender (REx) variants: research (passes 1, 2, 4)

Researched 2026-11-14 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`. **Research only — no DB
writes, no seed files.** Scope: what the REx adds to or changes from the live i3 rows. Prices and
mileage (pass 5) are left NULL for Martin.

Live catalog read first (Supabase MCP, read-only, 2026-11-14):

| live row | value |
|---|---|
| phases | `Pre-facelift` 2013–2017, `Facelift` 2017–2022, platform `BMW LifeDrive`, `towing_capacity_kg = 0` |
| pure-EV engines | `i3-60Ah@125`, `i3-94Ah@125` (shared by both phases), `i3-120Ah@125`, `i3s-94Ah@135`, `i3s-120Ah@135` |
| gearbox | one `transmission_units` row (`31895502…`) on every i3 configuration (the other session is splitting it into `generic:Single-speed EV (i3 I01)`) |
| body dims (per phase) | Pre-facelift GVW 1620, payload 425, tank NULL; Facelift GVW 1670, payload 425, tank NULL |
| relevant CHECKs | `catalog_engines.fuel_type` ∈ petrol/diesel/electric/lpg/cng; `hybrid_type` ∈ MHEV/HEV/PHEV; `secondary_fuel_type` ∈ petrol/lpg/cng **and `secondary_consumption_l100km` between 1 and 30**; `emission_standard` has no `Euro6b` or `Euro6d-TEMP` |

Evidence refs (`E…`) are listed in section 7. "Found by": **C** = Claude's own search / download,
**P→C** = Perplexity lead, source opened and quote checked by Claude.

---

## 0. Martin's decisions (2026-11-15)

| # | topic | decision | what it means for the seed | status |
|---|---|---|---|---|
| M1 | schema | **Option C**: new `hybrid_type` value for range extenders; engine stays `fuel_type = 'electric'` | migration `20261115100000_vocab_erev_euro6d_temp_secondary_consumption.sql` adds `'EREV'` (upper case like MHEV/HEV/PHEV; Martin wrote "range_extender (or erev)") | migration written, **not run** |
| M2 | petrol figure | store 0.6 / 0.7 l/100 km as `secondary_fuel_type = 'petrol'` + `secondary_consumption_l100km`; lower that column's CHECK from 1–30 to **0.1–30** | same migration; `fuel_consumption_l100km` stays NULL on REx rows, `energy_consumption_kwh100km` carries the kWh figure. FIELD-LEVELS condition for the secondary pair must become "bi-fuel **or EREV**" | migration written; FIELD-LEVELS follow-up |
| M3 | emissions | add **`Euro6d-TEMP`** to `emission_standard` | same migration. Facelift REx 04/18–09/18 rows get `Euro6d-TEMP` | migration written |
| M4 | 60 Ah REx output | **28 kW** (BMW technical data 07/2016), not the 2013 launch kit's 25 kW | one REx engine spec for all builds | decided |
| M5 | engine code | W20 code stays **NULL** (W20K06A EU vs W20K06U0 US) | nothing in `alt_codes` | decided |
| M6 | oil service | **24 months**, **2.6 l** | `oil_change_interval_months = 24`, `engine_oil_capacity_liters = 2.6`, `oil_change_interval_km` NULL (time-based) — source M (repareo E15 agrees) | decided |
| M7 | rating | **4** for the REx | see 2f for the combined-row question | decided |
| M8 | F3 coolant tank | repair **€300–500** (source M: labour-heavy, tight packaging, cracked plastic) | `estimated_cost_eur_min/max = 300/500` | decided |
| M9 | F2 tank pressure sensor | repair **€250–400** (source M) | `estimated_cost_eur_min/max = 250/400` | decided |
| M10 | frequency | **occasional** for pre-facelift (2013–2016), **rare** for facelift | `annual_probability`: occasional = **0.02**, rare = **0.005** (Martin confirmed 2026-11-15). F2's BMW build range ends 04/2017, so it doesn't reach the facelift (built from 11/2017) — F2: pre-facelift only, 0.02. F3 has no build range → one row per phase: pre-facelift 0.02, facelift 0.005 | decided |

Still open from section 1: Martin's decisions imply **separate engine rows per emission
standard** (decisions 1–2: pre-facelift Euro6, facelift Euro6c, facelift Euro6d-TEMP) — to be
confirmed when the seed is written. Market data (pass 5) and yearly maintenance (source M) are
still needed before any seed ("No seed without market research").

## 1. Configuration list (pass 1) — approved by Martin 2026-11-15 (see section 0)

Every REx configuration sold in Europe. All: same electric motor as the matching pure-EV car,
same single-speed gearbox (fixed 9.665:1), rear-wheel drive, Hatchback 5-door, 4 seats.

| # | phase | configuration | motor | battery (gross / net) | REx engine | years (EU) | evidence |
|---|---|---|---|---|---|---|---|
| G1 | Pre-facelift | i3 (60 Ah) with Range Extender | 125 kW / 250 Nm | 21.6 / 18.8 kWh | 647 cc 2-cyl petrol generator, 9 l tank | 11/2013 – 07/2017 | E1, E3, E4, E10 |
| G2 | Pre-facelift | i3 (94 Ah) with Range Extender | 125 kW / 250 Nm | 33.2 / 27.2 kWh | same | 07/2016 – 08/2017 | E1, E5, E10 |
| G3 | Facelift | i3 (94 Ah) with Range Extender | 125 kW / 250 Nm | 33.2 / 27.2 kWh | same | 11/2017 – 09/2018 | E2, E6, E7 |
| G4 | Facelift | i3s (94 Ah) with Range Extender | 135 kW / 270 Nm | 33.2 / 27.2 kWh | same | 11/2017 – 09/2018 | E2, E8, E9 |

**Not offered in Europe:** a 60 Ah i3s (the i3s starts 11/2017, 94 Ah only) and **any 120 Ah REx**
(i3 or i3s). The REx was dropped in Europe with the 120 Ah update (11/2018) and kept only in
other markets (E10, E11; BMW NA bulletin E21 lists "i3 120 REx" for US model years 2020–21).

**Decisions for Martin before pass 2 is seeded:**

1. **Emission split on the facelift (rule 3).** ADAC lists G3 and G4 twice: 11/17–03/18 at
   *Euro 6c (NEFZ)* and 04/18–09/18 at *Euro 6d-TEMP (WLTP)*, every other figure identical
   (E6–E9). CLAUDE.md rule 3 says an emissions generation means separate engine rows. Choose:
   (a) two rows each (`…-REx` Euro6c and `…-REx` Euro 6d-TEMP), or (b) one row each with the
   earlier standard and the change noted. Either way `Euro6d-TEMP` is **not** in the
   `emission_standard` vocabulary (closest is `Euro6d`, which is a different, later stage) —
   that would be a CHECK migration, not a free-text value. Not decided here.
2. **Pre-facelift vs facelift 94 Ah REx** — the pure-EV `i3-94Ah` is one engine row shared by
   both phases. The REx can't be shared the same way if rule 3 applies (pre-facelift *Euro 6b*,
   facelift *Euro 6c*; E5 vs E6).
3. **Proposed engine codes** (pack rule 7, `<model>-<battery>` convention already used live):
   `i3-60Ah-REx@125`, `i3-94Ah-REx@125`, `i3s-94Ah-REx@135` — plus a suffix for any emission
   split from decision 1. These depend on the schema decision in section 3.
4. **REx engine output on the 60 Ah car.** BMW's 2013 launch kit says **25 kW / 34 hp** (E3,
   "All technical data are provisional"; ADAC's model history repeats 25 kW, E10); BMW's own
   technical data valid from 07/2016 says **28 kW (38 hp) / 56 Nm** for the 60 Ah REx too (E1).
   Two manufacturer documents disagree → NULL for 2013–mid-2016 builds until Martin decides
   (one 28 kW row from the later, non-provisional sheet is my suggestion, not a fact).

---

## 2. Data tables

### 2a. Range-extender engine (pass 1 / 2)

| field | value | source + verbatim quote | found by |
|---|---|---|---|
| engine code (EU) | **NULL** — see R1 | E15 (repareo, DE): "BMW i3/i3s Range Extender 2-Zylinder-Ottomotor W20K06A"; E12 (BMW NA 2018MY Product Guide, **US**): "-- - - W20K06U0 W20K06U0". No European BMW document naming the code was found | P→C |
| layout / cylinders | in-line, 2 cyl, 4 valves/cyl → `L2` | E2: "Config / no of cyls / valves … In-line / 2 / 4" | C |
| displacement_cc | 647 | E2: "Effective capacity cc … 647"; E1: "Hubraum … 647" | C |
| stroke / bore | 66 / 79 mm | E2: "Stroke / bore mm/mm … 66 / 79" | C |
| output (generator engine) | 28 kW (38 hp) at 5000 rpm (07/2016 on; see decision 4 for 2013–16) | E2: "Output at kW (hp) / rpm … 28 (38) / 5000"; E3 (07/2013): "two-cylinder petrol engine developing 25 kW/34 hp" | C |
| torque (generator engine) | 56 Nm at 4500 rpm (BMW); ADAC says 55 Nm | E2: "Torque / at Nm / rpm … 56 / 4500"; E6: "28 kW (38 PS) / 55 Nm" — manufacturer wins | C |
| compression / fuel | 10.6:1, RON 87–98, RON 95 recommended | E2: "Compression ratio / poss. petrol type (recommended type) … 10.6 / RON87-98 (RON95)". ADAC says "Super Plus" (E6) — manufacturer wins | C |
| fuel_type of the generator | petrol | E2 (above); E10: "mit Benzin (Tankgröße max. 9 Liter) betriebener Range Extender" | C |
| emission_standard | G1/G2 `Euro6` (BMW "EU6"; ADAC "Euro 6b (NEFZ)", not in vocabulary); G3/G4 11/17–03/18 `Euro6c`; G3/G4 04/18–09/18 **NULL** (Euro 6d-TEMP, not in vocabulary) | E1: "Abgasnorm / Kraftstoff … EU6 / ROZ 95"; E4/E5: "Schadstoffklasse Euro 6b (NEFZ)"; E6/E8: "Euro 6c (NEFZ) 36ZA-ZF"; E7/E9: "Euro 6d-TEMP (WLTP) 36AG-AI" | C |
| timing_type | chain | E6: "Nockenwellensteuerung Steuerkette" | C |
| injection_type | **NULL** — ADAC says only "Einspritzung" (E6), not port/direct | — | C |
| fuel tank (EU) | 9 l | E2: "Fuel tank capacity ltr … 9"; E3: "the nine-litre fuel tank is located in the front section of the car"; E6: "Tankgröße (2.Antrieb) 9,0 l". (US version 8.7 l, E12 — other market, not used) | C |
| engine_oil_capacity_liters | **NULL** — conflict, see R2 (2.6 l DE aggregator vs 2.7 l BMW US) | E15: "Motoröl BMW Longlife-04 SAE 0W-30, 2,6 l"; E12: "Engine oil (filling quantity) … liter - - 2.7 2.7" | P→C |
| role | generator only — never drives the wheels | E3: "The combustion engine … drives a generator to produce electricity" | C |

### 2b. Electric side — what changes vs the pure EV (pass 2)

| field | G1 i3 60 Ah REx | G2 i3 94 Ah REx | G3 i3 94 Ah REx (FL) | G4 i3s 94 Ah REx (FL) | source + verbatim quote | found by |
|---|---|---|---|---|---|---|
| motor power / torque | 125 kW / 250 Nm | 125 / 250 | 125 / 250 | 135 / 270 | E1: "Spitzenleistung kW (PS) 125 (170) … Drehmoment 250 / 0" (both REx columns); E2 i3s REx: "135 (184) … 270 / 0" | C |
| battery gross / net | 21.6 / 18.8 kWh | 33.2 / 27.2 | 33.2 / 27.2 | 33.2 / 27.2 | E1: "Energiekapazität (Brutto/Netto) kWh 21,6/18,8 … 33,2/27,2"; E2: "Power output (gross / net) … 33.2 / 27.2" | C |
| max AC charging | 7.4 kW | 11 kW | 11 kW | 11 kW | E1 (60 Ah REx col.): "~ 2:50 h an BMWi Wallbox (7,4 kW / 32 A)", 94 Ah: "~ 2:45 h an BMWi Wallbox (11 kW / 16 A)"; E2: "~ 2.45 h from BMW i Wallbox (11 kW / 16 A, three-phase)" | C |
| max DC charging | 50 kW | 50 kW | 50 kW | 50 kW | E1: "~25 min an 50 kW Gleichstrom" / "~39 min an 50 kW Gleichstrom"; E2: "~39 min on 50 kW DC" | C |
| gearbox | single-speed, 9.665:1 (same as BEV) | same | same | same | E1: "Automatikgetriebe, einstufig mit fester Übersetzung 9,665:1" (REx page); E2: "Automatic, single-speed with fixed ratio (9.665:1)" | C |
| drivetrain / body | RWD, Hatchback 5-door, 5 doors / 4 seats | same | same | same | E2: "Rear-wheel drive"; "No of doors / seats … 5 / 4" | C |
| tyres (rear differs from BEV i3) | 155/70 R19 / 175/60 R19 | same | same | 175/55 R20 / 195/50 R20 | E1: "155/70 R19 / 175/60 R19" (REx), BEV "155/70 R19 / 155/70 R19"; E2 i3s REx: "175/55 R20 / 195/50 R20" | C |

### 2c. Configuration facts (pass 2) — all NEDC, smallest standard wheel

| field | G1 | G2 | G3 | G4 | source + verbatim quote | found by |
|---|---|---|---|---|---|---|
| consumption_cycle | NEDC | NEDC | NEDC | NEDC | E2: "Consumption and emissions figures as well as ranges according to NEDC test cycle" | C |
| energy_consumption_kwh100km | 13.5 | 11.3 | 11.5 | 12.5 | E1: "Verbrauch im EU-Zyklus kWh / 100 km 13,5 … 11,3"; E2: "Consumption in EU cycle* kWh / 100 km 13.1 11.5" (BEV / REx), i3s "14.3 12.5" | C |
| petrol l/100 km (combined) | 0.6 | 0.6 | 0.6 | 0.7 | E1: "Liter/100 km / g … 0,6 / 13" (60 Ah), "0,6 / 12" (94 Ah, 19"); E2: "0.6 / 13" (i3 REx 19"), i3s "0.7 / 14" | C |
| co2_emissions_g_km | 13 | 12 | 13 | 14 | same quotes as the row above | C |
| ev_range_km (NEDC) | 170 | 240 | 235 | 220 | E1: "Reichweite im EU-Zyklus … 170 … 240"; E2: "Electric range in EU cycle … 300 … 235" (BEV / REx, 19"), i3s "280 220" | C |
| ev_range_wltp_km | N/A (pre-WLTP) | N/A | **NULL** (BMW 190–200; ADAC 204) | **NULL** (BMW 185–195; ADAC 190) | E2: "Electric range as per WLTP cycle … 235 - 255  190 - 200"; i3s "235 - 245  185 - 195"; E6: "Reichweite WLTP (elektrisch) 204 km" — BMW gives only a range, ADAC is outside it → R3 | C |
| curb_weight_kg (EU) | 1415 | 1440 | 1440 | 1460 | E1: "Leergewicht nach DIN/EU … 1340 / 1415" (60 Ah), "1365 / 1440" (94 Ah); E2: "1365 / 1440", i3s "1385 / 1460" | C |
| gross vehicle weight | 1755 | 1760 | 1760 | 1780 | E1: "Zul. Gesamtgewicht / Zuladung … 1755 / 415", "1760 / 395"; E2: "1760 / 395", i3s "1780 / 380" | C |
| payload (BMW figure) | 415 | 395 | 395 | 380 | same quotes; ADAC gives 340 / 320 / 320 / 320 (= GVW − EU weight, E4–E9) — see R4 | C |
| acceleration_0_100 | 7.9 | 8.1 | 8.1 | 7.7 | E1: "Beschleunigung 0-100 km/h s … 7,9 … 8,1"; E2: "Acceleration 0-100 km/h … 8.1" (REx), i3s REx "7.7" | C |
| top_speed_kmh | 150 | 150 | 150 | 160 | E1: "Höchstgeschwindigkeit km/h … 150 … 150"; E2: "Top speed … 150", i3s "160" | C |
| boot (seats up / folded) | 260 / 1100 | 260 / 1100 | 260 / 1100 | 260 / 1100 | E1: "Gepäckraumvolumen Liter … 260 - 1.100"; E3: "Specifying the range extender has no effect on luggage capacity" | C |
| ground clearance | 140 | 140 | 139 | 131 | E1: "Bodenfreiheit … 140"; E2: "Ground clearance … 139", i3s "131" | C |
| towing | N/A — phase is `0` (unchanged by REx) | | | | live phase row; nothing in E1/E2 permits towing | — |

### 2d. Service of the range extender (pass 4)

| field | value | source + verbatim quote | found by |
|---|---|---|---|
| oil_change_interval_months | **NULL** — conflict, see R2 (24 months DE aggregator vs 12 months BMW US) | E15: "INTERVALL (MONATE) … 24 Monate"; E14 (BMW NA, 2014 i3 REx): "1 Not applicable 12 Vehicle check. Replace the engine oil and filter (connected service)." | P→C |
| oil_change_interval_km | N/A — time-based only (CBS); repareo lists "0 km", BMW NA "Not applicable" (the column has a `> 0` CHECK, so NULL) | E14 (above); E15 | P→C |
| oil_spec | BMW Longlife-04 SAE 0W-30 (alternatives LL-01 0W-40/5W-30, LL-01 FE 0W-30) | E15: "Motoröl BMW Longlife-04 SAE 0W-30, 2,6 l"; corroborated by E13 (BMW NA 2019): "BMW recommends Original BMW Engine Oil SAE 0W-30 … If this oil is not available, use Original BMW Engine Oil SAE 5W-30" | P→C |
| spark plugs | no scheduled replacement (long-life) → `spark_plug_interval_km` N/A | E13: "the W20 engine's spark plugs and air filter are long-term rated, which do not need replacement." (BMW NA; same footnote in E14) | P→C |
| air filter | no scheduled replacement → `air_filter_interval_km` N/A | E13 (same quote) | P→C |
| timing chain | chain, no scheduled replacement → timing columns N/A | E6: "Nockenwellensteuerung Steuerkette" | C |
| other REx-only item | REx coolant level and antifreeze check (underfloor) at each vehicle check | E14: "Range Extender only: check the coolant level and anti-freeze concentration (underfloor)." | P→C |
| oil_service_cost_eur | **NULL** (German price only, R5) | E15: "Arbeitszeit 0,5 h 59,50 € … Gesamt inkl. MwSt. 128,00 €" | P→C |
| yearly_maintenance_eur_min/max | **NULL — needs Martin (source M)**; leads in R5 | E10 (ADAC, DE): "Wartung … i3 60 Ah 270, i3 REX 60 Ah 420 … bei km/Monate 0/24" | C |
| maintenance_note (draft) | "Range extender (W20, 647 cc): oil and filter by the service indicator (time-based; 12 or 24 months — see R2), ~2.6–2.7 l BMW Longlife 0W-30; spark plugs and air filter are long-life; REx coolant level checked at each vehicle check. Run the REx regularly — BMW's maintenance run starts it automatically if it hasn't run for a while. EV items as for the pure i3: brake fluid every 2 years, cabin microfilter, 12 V battery." | E13, E14, E15 — the "maintenance run" sentence has **no verified source** yet (Perplexity cited an owner's-manual page I did not open) — drop it unless Martin confirms | P→C |

### 2e. Faults and recalls — REx and its fuel system only (pass 4)

Existing i3 faults (battery modules, EME/KLE, 12 V battery, motor mount, A/C compressor, brake
corrosion, parking lock) still apply to REx cars and are not repeated here.

| # | component | fault + symptom | affected years | severity | cost EUR (SK/CZ) | annual_probability | pre_purchase_check | source + verbatim quote | found by |
|---|---|---|---|---|---|---|---|---|---|
| F1 | engine (REx) | **Recall:** fuel-tank ventilation line routed against the battery (B+) cable in the REx engine bay; it can chafe through and leak petrol vapour — fire risk. BMW checks for contact, replaces the vent line if needed and fits a spacer; free of charge (EU Safety Gate A12/0428/17, ADAC 2/2017). Fixed by the campaign. | built 09/2013 – 12/2016 (2013–2016) | critical (fixed) | N/A (fixed recall) | N/A | confirm the recall was carried out (BMW VIN check) | E16: "models with range extender (plug-in hybrid) … manufactured between 9 September 2013 and 30 December 2016 … fuel vapours may get into the engine compartment resulting in the risk of a fire"; E10: "Nur mit RangeExtender (REX): Die Tankentlüftungsleitung kreuzt im REX-Motorraum die Batterieleitung" | P→C |
| F2 | engine (REx) | Fuel-tank pressure-temperature sensor: its internal seal fails, the sensor reads wrong and sets an evaporative-system fault — engine warning light. Fix: new sensor (BMW part 16 14 7 426 661); the tank has to be drained and refilled for the job. | built 03/2014 – 04/2017 (2014–2017) | moderate | **NULL** | **NULL** | ask whether the sensor was replaced (service history) | E17 (BMW SI B16 03 18, Service Action): "i3 with REX produced from March 31, 2014 to April 19, 2017 … The internal sealing of the fuel tank pressure-temperature sensor may fail … This may lead to the Malfunction Indicator Lamp (MIL) being illuminated." Labour: "Replacing the pressure temperature sensor (Includes extracting fuel from the fuel tank and filling it back)". **US bulletin** — whether the same service action ran in the EU is not confirmed (R6) | P→C |
| F3 | engine (REx) | REx coolant expansion tank (or its hoses) leaks — engine warning light and "Drivetrain: only electric drive possible, limited driving range"; the REx is shut off. Fix: new expansion tank / hoses, bleed the circuit, test-run the REx for overheat damage. | not stated (I01 REx) | moderate | **NULL** | **NULL** | look for coolant traces at the REx expansion tank (under the luggage-area service cover) | E19 (BMW SI B17 04 16): "Check Control Message (CCM): "DRIVETRAIN: only electric drive possible, limited driving range, continued driving possible …" CAUSE Leaking coolant expansion tank." | P→C |

**Considered and not listed as faults** (leads for Martin, details in R7): US-only emission-warranty
extensions on the US PZEV/SULEV engine (fuel injectors SI B01 20 21, upstream O₂ sensor SI B01 03 21,
EVAP purge valve SI B01 05 24 — production 06/2016–10/2017 and later, BMW of North America); a
catalytic-converter false fault on first REx start, fixed by software in 2014 (SI B12 09 14, E20);
single owner reports (fuel-pump relay, timing-chain tensioner spring, generator replacement quote);
"stale fuel" (a usage advice, not a defect).

### 2f. Reliability rating of the range extender (pass 4)

| field | value | reason | found by |
|---|---|---|---|
| reliability_rating (REx unit on its own) | **4** (proposal) | Known issues are moderate and preventable: the vent-line fire-risk recall (F1) was fixed by the campaign; the tank pressure sensor (F2) and REx coolant expansion tank (F3) only switch on the warning light / disable the REx — the car still drives on electric. No source shows a common critical failure of the W20 itself. ADAC's overall verdict on the car: "die wenigen verfügbaren Zahlen deuten auf hohe Zuverlässigkeit" (E10). | C |
| combined engine row (if stored as one row, section 3 option A/C) | the lower of the pure-EV row's rating and 4 → `i3-60Ah-REx` 3, `i3-94Ah-REx` 3, `i3s-94Ah-REx` 4 | the battery / EME / KLE faults of the matching BEV row apply unchanged | — |

**Pros (REx engine, draft):** removes range anxiety — ADAC calls the REx "eine echte Empfehlung"
for longer trips, "wie bei einem seriellen Hybrid eine unbegrenzt lange Strecke" with refuelling
(E10) ; costs no boot space (E3) ; small and light enough to fit beside the motor above the rear
axle (E3).
**Cons (draft):** only a 9-litre tank (E2) ; about 120 kg heavier than the pure EV (EU 1440 vs
1320 kg, E2) — slower (0–100 in 8.1 vs 7.3 s, E2) and less electric range (NEDC 235 vs 300 km on
19", E2) ; adds engine servicing — ADAC's 24-month service is €420 vs €270 for the pure EV (E10,
German prices).

---

## 3. Schema question — how to store a REx configuration (PROPOSAL ONLY, Martin decides)

The facts to store per REx configuration: electric motor power, battery, charging (as the BEV);
a generator engine (647 cc, L2, 28 kW, chain, emission standard, oil service); a 9 l tank;
energy **and** petrol consumption on one cycle (11.5 kWh + 0.6 l/100 km, 13 g/km CO₂).
No CHECK constraint is relaxed in any option below.

| option | how | pros | cons |
|---|---|---|---|
| **A. Electric engine row carrying the REx columns** (no migration) | `catalog_engines`: `fuel_type = 'electric'`, `hybrid_type` NULL, `power_kw` = motor (125/135), battery/charging as BEV, **plus** `displacement_cc 647`, `cylinders 'L2'`, `timing_type 'chain'`, `emission_standard`, oil columns, `yearly_maintenance_eur_*`. Configuration: `energy_consumption_kwh100km 11.5` **and** `fuel_consumption_l100km 0.6`, `co2 13`, `ev_range_km`. `secondary_fuel_type` stays NULL. | No migration. The Costs tab already treats it right: `tco.ts` prices electric engines per kWh and shows the engine-service line for "an electric engine WITH a yearly figure — e.g. a range extender's petrol generator" (commit 705d7d0). EV-only tag rules (`city_commuter`) and EV filters keep working. FIELD-LEVELS already expects this (`yearly_maintenance` conditional "an EV with a range extender"). | "REx" is only implicit (an electric engine with `displacement_cc` set) — every query/UI that wants to say "range extender" has to infer it. No column for the generator's 28 kW (it would live in `display_name`/pros only). The 0.6 l of petrol is ignored by the running-cost calculation. `secondary_fuel_type = 'petrol'` is **not** usable: its CHECK requires 1–30 l/100 km and 0.6 fails — and it means bi-fuel, not a generator. |
| **B. Petrol + `hybrid_type = 'PHEV'`** (no migration) | Treat it like the live PHEVs (e.g. `DGEA@110`: `fuel_type petrol`, `hybrid_type PHEV`, config with both `fuel_consumption_l100km` and `energy_consumption_kwh100km`). ADAC and the type approval list it as "PlugIn-Hybrid" (E6, E16). | No migration; matches the homologation category; reuses an existing pattern. | Misleading to buyers: the engine never drives the wheels. The Costs tab would price it as a petrol car at 0.6 l/100 km and ignore electricity; EV filters/tags (`city_commuter`) would drop it; `power_kw` would be the motor's 125 kW on a "petrol" engine with 647 cc. Breaks the "same car as the BEV i3" view. |
| **C. Explicit range-extender value** (migration, human-run) | Option A, plus `hybrid_type` CHECK widened with a new value (e.g. `'REX'`) via `ALTER TABLE … DROP/ADD CONSTRAINT`, `scripts/catalog-vocabularies.json` updated in the same commit, RESEARCH-PACK / INTAKE vocabularies updated. Optionally a new `catalog_engines.generator_power_kw` column. | Explicit and queryable ("show range-extender cars"); keeps fuel_type `electric` so the Costs tab and EV rules behave as in A; future-proof for other REx cars (Mazda MX-30 R-EV, Opel Ampera / Chevrolet Volt-type). | A real migration plus touch points in the app (display of `hybrid_type`, any `hybrid_type`-driven logic), validate/intake scripts and docs. `hybrid_type` is a slight semantic stretch (a REx is a series hybrid). |

**Body-level fields, whichever option:** `phase_body_dimensions` is keyed by phase × body, so the
REx's 9 l tank, higher GVW (1755–1780) and different payload can't be stored apart from the pure
EV in the same phase (setting `fuel_tank_capacity_liters = 9` would claim the BEV has a tank).
This is the same open question as "variant body dimensions" in RESEARCH-PROCESS.md; until decided
these figures stay in this document (section 2c).

**Faults are per engine row:** with option A or C the REx gets new engine rows, so the battery /
EME / KLE / 12 V / motor-mount faults of the matching BEV rows have to be copied onto them (or the
fault rows attached at phase level instead) — otherwise the REx cars look more reliable than the
BEV.

My suggestion, for Martin to accept or reject: **C** if more REx cars are planned, otherwise **A**.
Not B.

---

## 4. Completeness check against FIELD-LEVELS.md (REx additions only)

| field (level) | status | why |
|---|---|---|
| engine `code` (req.) | **open** | depends on schema option + emission split (decisions 1–3); the W20 code itself is not stored as the engine code in A/C |
| `power_kw`, `torque_nm`, `fuel_type`, `display_name` (req.) | filled (motor values) / `display_name` to be written at seed time | 2b |
| `displacement_cc`, `cylinders`, `emission_standard` (cond.: combustion) | filled, except **emission_standard NULL for 04/18–09/18** (Euro 6d-TEMP not in vocabulary) | 2a |
| `timing_type` (cond.) | filled (chain) | 2a |
| `injection_type` (cond.) | **NULL** | ADAC only says "Einspritzung"; no source says port or direct |
| `engine_oil_capacity_liters` (cond.) | **NULL** | 2.6 l (repareo, DE) vs 2.7 l (BMW NA, US) — R2 |
| battery / charging (cond.: EV) | filled; `battery_thermal_management`, `heat_pump` same as the BEV rows (not re-researched) | 2b |
| `reliability_rating` + reason (req.) | proposal 4 (REx alone) / combined 3–4 | 2f |
| `yearly_maintenance_eur_min/max` (cond.: EV with REx) | **NULL → Martin (M)** | only German figures (ADAC €420 vs €270 per 24 months; repareo €128 oil service) |
| `pros`, `cons`, `maintenance_note` (req.) | drafts in 2d / 2f | |
| `oil_change_interval_months`, `oil_spec` (cond.) | interval **NULL** (R2); spec filled | 2d |
| `oil_change_interval_km` (cond.) | N/A (time-based only) | 2d |
| `timing_replacement_*` (cond.: belt) | N/A (chain) | |
| config consumption + cycle, 0–100, top speed, curb weight (req.) | filled for G1–G4 | 2c |
| `ev_range_km` (cond.) | filled (NEDC); `ev_range_wltp_km` NULL for G3/G4 | R3 |
| `co2_emissions_g_km` (cond.: combustion or PHEV) | filled | 2c |
| `secondary_fuel_type/_consumption` (cond.: LPG/CNG bi-fuel) | N/A (not bi-fuel; CHECK would reject 0.6 anyway) | section 3 |
| `fuel_tank_capacity_liters` (cond.: not a pure EV) | value known (9 l) but **no place to store it** separately from the BEV | section 3, body-level |
| GVW / payload (req., body) | values known per configuration, same storage problem | section 3 |
| faults: cost + annual_probability (req. on every fault) | **F2, F3 NULL → Martin**; F1 N/A (fixed recall) | no SK/CZ (or any EU) repair price found; no source states a rate |
| engine fault (cond.: rating ≤ 3) | satisfied if combined rows are 3 — the BEV battery/EME faults apply | 2e |
| pass 3 (trims, NCAP) | not researched — REx was an option on the same trims; NCAP same car | out of scope |
| pass 5 (market) | NULL by instruction | Martin supplies |

### R — gaps, conflicts and doubts

- **R1 Engine code.** EU sources give **W20K06A** (repareo E15; also MANN-FILTER's catalogue
  and a parts dealer, both seen only in search results — not opened); BMW of North America's
  product guide gives **W20K06U0** (E12; its header line even reads "W20K06U0 W20K06U1" for the
  two REx columns while the table row says W20K06U0 twice). The US car has its own PZEV/SULEV
  emission version and an 8.7 l tank, so the US code may be a US variant. No European BMW document
  naming it was found → NULL. Not needed as `catalog_engines.code` under options A/C; useful in
  `alt_codes` or `display_name` once confirmed.
- **R2 Oil interval and capacity.** BMW NA CBS tables (E13 2019, E14 2015) put the REx oil +
  filter at **12 months** ("connected service" at every vehicle check); repareo (DE) lists
  **24 months** and 2.6 l. ADAC's cost table (E10) prices the REx service at "0/24" km/months.
  BMW NA's 2014 schedule (seen only via Perplexity) distinguished cars built before / after
  8 Aug 2014 — not opened (dead link). Capacity: 2.6 l (repareo) vs 2.7 l (BMW NA E12). The US
  documents are another market (pack rule 3b), the EU ones are not BMW's own → both NULL; Martin
  or a BMW SK/CZ dealer's CBS printout settles it.
- **R3 WLTP electric range (facelift).** BMW 11/2017 gives ranges only ("190 - 200" i3 REx,
  "185 - 195" i3s REx, marked provisional); ADAC lists 204 and 190 km. Not the same figure →
  NULL. NEDC is the primary cycle for these configurations anyway.
- **R4 Payload convention.** BMW's "Zul. Gesamtgewicht / Zuladung" pairs give payload = GVW − DIN
  weight (415/395/395/380); ADAC's = GVW − EU weight (340/320/320/320). The live BEV rows store 425,
  which matches BMW's BEV figure (E1: "1630 / 425") — so BMW's convention was used live. Side
  observation, not changed: live pre-facelift GVW is 1620, BMW's 07/2016 sheet says 1630 (60 Ah)
  and 1670 (94 Ah).
- **R5 Service costs.** Only German figures: ADAC (E10) 24-month service €420 (REx) vs €270 (BEV);
  repareo (E15) oil service €128 incl. VAT (labour €59.50 at €119/h). By the STANDARDS table these
  stay NULL; Martin may supply an SK/CZ figure as source M.
- **R6 Fault scope.** F2 and F3 come from BMW of North America bulletins (published via NHTSA).
  F3 is a plain technical cause (not market-specific). F2 is a US *service action*; an EU campaign
  for the same sensor was not found. Parts-only US prices seen: sensor $178.94, expansion tank
  $122.15 (bmwpartsdeal.com, via Perplexity, not opened) — not used.
- **R7 Not imported.** US PZEV/SULEV warranty extensions (injectors, upstream O₂ sensor, EVAP
  purge valve — E21) apply to US-spec engines; no EU equivalent found. SI B12 09 14 (E20,
  catalytic-converter fault code on first REx start from manufacturing fluid, fixed by I-level
  14-07-502) — an early-2014 software issue, already fixed. Single owner reports
  (truedelta/Reddit/mybmwi3: fuel-pump relay, injector leak, timing-chain tensioner spring,
  $18,423 generator quote) — not a pattern, not opened.
- **R8 Years.** ADAC model dates are model-availability dates, not build ranges; the 60 Ah REx
  (to 07/2017) overlaps the 94 Ah REx (from 07/2016).
- **R9 Side observation (pure-EV rows, not changed).** Live `i3-94Ah` facelift config has
  `ev_range_km 290` with `13.1 kWh/100 km`; BMW 11/2017 (E2) pairs 13.1 kWh with 300 km (19")
  and 13.6 kWh with 290 km (20"). Worth a check by whoever owns the BEV rows.

---

## 5. Perplexity call log (budget 8, used 4)

Durations were not timed; all four returned without stalling or a 429.

| # | tool | topic | duration | outcome |
|---|---|---|---|---|
| 1 | `perplexity_ask` (medium) | REx engine code | not timed (short) | Found BMW NA product guide → W20K06U0, MANN catalogue → W20K06A. Guide opened and verified (E12); US-scope. |
| 2 | `perplexity_ask` (high) | REx servicing: oil interval, spec, plugs, cost | not timed (short) | Cited BMW NA CBS PDFs — live links 404; two recovered via Wayback and verified (E13, E14). No EU interval or price. |
| 3 | `perplexity_research` | REx + fuel-system faults and recalls | not timed (longest of the four) | ~20 leads. Verified: EU Safety Gate recall (E16), SI B16 03 18, B01 13 18, B17 04 16, B12 09 14, B22 04 15, US warranty extensions. Owner reports not opened. |
| 4 | `perplexity_ask` (medium) | EU repair prices for F2 / F3 / REx engine | not timed (short) | Nothing usable: US parts-only prices only. |

---

## 6. Hand-over

- Gate: Martin approves the configuration list (section 1, decisions 1–4) and picks a schema
  option (section 3).
- Then: market (pass 5) and the M-figures (yearly maintenance, F2/F3 costs, oil interval /
  capacity), then the import-car skill writes the seed — not before.

---

### Follow-ups from Martin's decisions (not done here)

- `scripts/catalog-field-levels.json` (+ re-render FIELD-LEVELS.md): secondary pair condition
  "factory LPG / CNG bi-fuel" → "… or EREV". Only on origin/main — local main is behind.
- `scripts/new-car-template/RESEARCH-PACK.md` and `INTAKE-BLANK.md` section P: add `EREV` to
  hybrid_type and `Euro6d-TEMP` to emission_standard (both files differ on origin/main).
- App: `EnginePanel.tsx` shows `hybrid_type` raw ("EREV") — fine, or give it a label. Tag rules
  that read `fuel_type = 'electric'` (`city_commuter`, `green_zone`) keep covering REx; check
  any rule that treats `hybrid_type IS NOT NULL` as "not a pure EV".

## 7. Evidence

| ref | url | what / quote location |
|---|---|---|
| E1 | https://ecomento.de/wp-content/uploads/2016/05/BMW-i3-2016-2017-technische-Daten.pdf | BMW Medieninformation "Technische Daten. BMW i3. Gültig ab 07/2016", pages 3–4 = "BMW i3 (60 Ah) mit Range Extender / BMW i3 (94 Ah) mit Range Extender" (BMW document re-hosted by ecomento) |
| E2 | https://newsroom.bmwgroup.com/emea/download/5c34b9fd-abc2-43ca-b155-9a5955f99477/20260902084311954-16.pdf | BMW "Specifications. The new BMW i3 / The new BMW i3s. Valid from 11/2017", columns "BMW i3 with range extender" (p. 1–2) and "BMW i3s with range extender" (p. 3–4); attached to newsroom.bmwgroup.com/emea/it/the-new-bmw-i3-the-new-bmw-i3s-it |
| E3 | https://newsroom.bmwgroup.com/emea/download/64d38312-3b1c-4484-aa55-d795b1e2979c/20260828080436662-441.pdf | BMW Media information "The BMW i3", 07/2013 — "Performing this role is a 650cc two-cylinder petrol engine developing 25 kW/34 hp … the nine-litre fuel tank is located in the front section of the car." |
| E4 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01/238114/ | ADAC "BMW i3 (60 Ah) (inkl. Range Extender) (11/13 - 07/17)" |
| E5 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01/255582/ | ADAC "BMW i3 (94 Ah) (inkl. Range Extender) (07/16 - 08/17)" |
| E6 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/283074/ | ADAC "BMW i3 (94 Ah) (inkl. Range Extender) (11/17 - 03/18)" — "Motorart PlugIn-Hybrid", "Hubraum (Verbrennungsmotor) 647 ccm", "Tankgröße (2.Antrieb) 9,0 l" |
| E7 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/288848/ | ADAC "BMW i3 (94 Ah) (inkl. Range Extender) (04/18 - 09/18)" — "Euro 6d-TEMP (WLTP) 36AG-AI" |
| E8 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/283075/ | ADAC "BMW i3s (94 Ah) (inkl. Range Extender) (11/17 - 03/18)" |
| E9 | https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/i3/i01-facelift/288849/ | ADAC "BMW i3s (94 Ah) (inkl. Range Extender) (04/18 - 09/18)" |
| E10 | https://assets.adac.de/image/upload/Autodatenbank/GWInfo/gw0263-bmw-i3-2013-2022-bericht.pdf | ADAC Gebrauchtwageninfo BMW i3 (2013–2022): "11/2018 Modelle i3 und i3s mit größerer Batteriekapazität (120 Ah); Range-Extender nicht mehr im Angebot"; recall 2/2017; "Wartung" table |
| E11 | https://www.electrive.net/2018/10/06/bmw-streicht-i3-mit-range-extender-aus-europa-aufgebot/ | "streicht bei seinem Elektro-Modell i3 im Zuge des Batterie-Upgrades auf 120 Ah-Zellen in Europa die Range-Extender-Option" (06.10.2018) |
| E12 | https://newsroom.bmwgroup.com/americas/download/2c820dca-37f4-4158-84e4-4474f3abf47a/20260731075744895-64.pdf | BMW NA "BMW i3 & i3s. 2018MY Product Guide" (US) — engine W20K06U0, oil filling 2.7 l, tank 8.7 l |
| E13 | http://web.archive.org/web/20240705140341/https://bmwtechinfo.bmwgroup.com/sib_attachments/B000318%20Attachment%202%20BMW%20i3,%20i8%20CBS%20intervals%20and%20maintenance%20Rev1.pdf | BMW NA Attachment 2 to SI B000318, Dec 2018, "2019 BMW i3 (I01) … CBS intervals and Maintenance" (original link now 404) |
| E14 | http://web.archive.org/web/20240706130954/https://bmwtechinfo.bmwgroup.com/sib_attachments/B001214_Attachment_3_BMW_i3_Maintenance.pdf | BMW NA Attachment 3 to SI B001214, Feb 2015, "2014 i3 (I01) Condition Based Service (CBS) intervals" (original link now 404) |
| E15 | https://www.repareo.de/oelwechsel-bmw-i3/ | repareo "Ölwechsel BMW i3 Range Extender - Kosten & Intervall" (DE) |
| E16 | https://ec.europa.eu/safety-gate-alerts/api/download/notification/detail/pdf/255022/en | EU Safety Gate alert A12/0428/17 (Germany), BMW i3 with range extender |
| E17 | https://static.nhtsa.gov/odi/tsbs/2019/MC-10153745-9999.pdf | BMW SI B16 03 18 (Jan 2019), Service Action: replace the fuel tank pressure-temperature sensor |
| E18 | https://static.nhtsa.gov/odi/tsbs/2018/MC-10145289-9999.pdf | BMW SI B01 13 18 (Jun 2018), US warranty extension for the fuel tank pressure sensor — "I01 (i3 Rex) … produced 6/4/2013 to 4/29/2017" |
| E19 | https://static.nhtsa.gov/odi/tsbs/2016/MC-10146819-9999.pdf | BMW SI B17 04 16 (Sep 2016), "DRIVETRAIN: ONLY ELECTRIC DRIVE POSSIBLE" — leaking REx coolant expansion tank |
| E20 | https://static.nhtsa.gov/odi/tsbs/2014/MC-10148110-9999.pdf | BMW SI B12 09 14 (Jul 2014), fault code 121001 — "Manufacturing fluid in the exhaust system" |
| E21 | https://static.nhtsa.gov/odi/tsbs/2021/MC-10205606-9999.pdf ; https://static.nhtsa.gov/odi/tsbs/2021/MC-10187463-9999.pdf ; https://static.nhtsa.gov/odi/tsbs/2026/MC-11032732-0001.pdf | BMW NA warranty extensions SI B01 20 21 (injectors), B01 03 21 (upstream O₂ sensor), B01 05 24 (EVAP purge valve; lists "i3 120 REx" MY 2020–21) — US PZEV/SULEV/TZEV engines |
| E22 | https://static.nhtsa.gov/odi/tsbs/2016/MC-10151258-9999.pdf | BMW SI B22 04 15 — motor mount screws, "i3 Rex: Perform the procedure on left and right side drive mounts" (motor mount fault already in the catalog) |
