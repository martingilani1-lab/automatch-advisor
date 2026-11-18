# Volkswagen ID.3 (E1) — research (pass 1: identity + configurations)

Researched 2026-11-18 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`. **Pass 1 only — the
configuration list (section 2) and decisions V1–V8 need Martin's approval before passes 2–5.**
No DB writes. Perplexity calls so far: 0.

## 0. Reconcile (live, Supabase MCP, read-only, 2026-11-18)

| what | live | consequence |
|---|---|---|
| brand | `Volkswagen` (13 models, all `german`) | REUSE |
| model | no `ID.3` in `catalog_models`; no MEB phase anywhere | NEW model `ID.3` (segment and origin → V7) |
| engines | 19 electric rows (i3, Zoe) — none MEB | every ID.3 motor is NEW |
| gearbox | single-speed rows are all `generic:` placeholders; used: `(i3 I01)`, `(Zoe Ph1)`, `(Zoe Ph2)`; unused: `generic:Single-speed EV` (rating 5), `generic:Single-speed RWD`, … | rule 2b: the ID.3 needs its own reviewed `transmission_units` row(s) before the seed → V4 |
| drivetrain system | none needed (rear-wheel drive only, no AWD ID.3) | `driven_axle = 'rear'`, `drivetrain_id` NULL |
| legacy `vehicles` row | `Volkswagen ID.3`, "2020 - Present", 3 engines all labelled `APP310` | **not used**: it contradicts the manufacturer data (Pure listed as 310 Nm / 45 kWh / 349 km is right, but Pro S is shown as 150 kW "Pro S" 1 940 kg and Pro as 58 kWh 150 kW only; no Pro 107 kW, no 2024+ cars). Leads only. |

## 1. Phase split

ADAC Autokatalog splits the first generation (VW's own code "E1" — "Herstellerinterne
Baureihenbezeichnung E1", E1 below) into three phases:

| ADAC section | build period (ADAC) | proposed `phase_label` | proposed years |
|---|---|---|---|
| "ID.3 1. Generation" — "ID.3 (E1) (09/20 - 12/22)" | 09/2020 – 12/2022 | `Pre-facelift` | 2020 – 2022 (V2) |
| "ID.3 1. Generation (1. Facelift)" — "ID.3 (E1) (10/23 - 04/26)" | (DE) 10/2023 – 04/2026; CZ price list 08/2023 | `Facelift` | 2023 – 2026 (V2) |
| "ID.3 1. Generation (2. Facelift)" = **ID.3 Neo**, "Baujahr: seit 2026" | from 07/2026 | `Facelift 2`? | 2026 – (V1: defer) |

Platform: MEB (VW's Modularer E-Antriebs-Baukasten — wording to confirm in pass 2 from the VW
press kit). Chassis: monocoque. Cycle: WLTP for every variant (ADAC "Verbrauch kombiniert (WLTP)" on
all 51 pages read).

## 2. Configuration list (pass 1) — **for Martin's approval**

Every variant on the ADAC Autokatalog pages (51 pages read, E2), cross-checked with the Czech and
Slovak documents. All: Hatchback 5-door, **rear-wheel drive** (ADAC "Antriebsart Hinterrad"),
single-speed reduction gear (ADAC "Getriebeart Reduktionsgetriebe … Anzahl Gänge 1"), WLTP.

Engine codes follow pack rule 7 (`<motor code>-<battery>`). The motor code is ADAC's three-letter
"Motorcode" (`EBJ`, `EDC`, `EDF`, `EEW`, `EEJ`); the full four-letter VW codes were not found in a
source that agrees with ADAC (V3).

### Pre-facelift (2020 – 2022)

| # | engine (code@kW) | VW name | battery net / gross | torque | AC / DC max | build (ADAC, DE) | SK / CZ | evidence |
|---|---|---|---|---|---|---|---|---|
| P1 | `EBJ-45kWh@110` | Pure Performance | 45 / 48 kWh | 310 Nm | 7.2 / 100 (50 kW std on early cars) | 01/2021 – 08/2021 | CZ 10/2021 list | E2 (319026, 320812), E4 |
| P2 | `EBJ-58kWh@107` | Pro | 58 / 62 kWh | 275 Nm | 11 / 100 → 120 | 11/2020 – 01/2022 | CZ 10/2021 list | E2 (317597, 320811), E4 |
| P3 | `EBJ-58kWh@150` | Pro Performance (incl. 1st Edition) | 58 / 62 kWh | 310 Nm | 11 / 100 → 120 | 09/2020 – 12/2022 | CZ 10/2021; **SK** 10/2022 ("ID.3 Easy Pro Performance … 150 kW") | E2 (313859, 320815), E3, E4 |
| P4 | `EBJ-77kWh@150` | Pro S (4-seat 09/2020 – 12/2022; 5-seat 05/2021 – 12/2022) | 77 / 82 kWh | 310 Nm | 11 / 125 → 170 | 09/2020 – 12/2022 | CZ 10/2021 (4- and 5-seat) | E2 (313850, 320813, 320814), E4 |

### Facelift (2023 – 2026)

| # | engine (code@kW) | VW name | battery net / gross | torque | AC / DC max | build (ADAC, DE) | SK / CZ | evidence |
|---|---|---|---|---|---|---|---|---|
| F1 | `EBJ-58kWh@150` (= P3, REUSE) | Pro | 58 / 62 kWh | 310 Nm | 11 / 120 | 10/2023 – 05/2024 | CZ 08/2023 list; SK 04/2024 list ("MJ12 Pro Performance … 150 / 204 58 (62) kWh 429 km") | E2 (326861), E5, E6 |
| F2 | `EBJ-77kWh@150` (= P4, REUSE) | Pro S (4-seat) | 77 / 82 kWh | 310 Nm | 11 / 170 | 10/2023 – 05/2024 | — | E2 (326865) |
| F3 | `EDC-52kWh@125` | Pure | 52 / 55 kWh | 310 Nm | 7.2 / 145 | 05/2024 – 04/2026 | CZ 11/2024 | E2 (335649), E1 |
| F4 | `EDC-59kWh@150` | Pro | 59 / 63 kWh | 310 Nm | 11 / 165 | 05/2024 – 04/2026 | CZ 11/2024 | E2 (335648), E1 |
| F5 | `EDC-77kWh@170` | Pro S (5-seat) | 77 / 82 kWh | 310 Nm | 11 / 175 | 05/2024 – 04/2026 | CZ 11/2024 (as "150 kW" — V5); SK 02/2025 ("Pro S … 170 / 231 77 (82) kWh 557 km") | E2 (335151), E1, E7 |
| F6 | `EDF-79kWh@210` | GTX | 79 / 84 kWh | 545 Nm | 11 / 185 | 05/2024 – 04/2026 | CZ 11/2024; SK 02/2025 | E2 (335652), E1, E7 |
| F7 | `EEW-79kWh@240` | GTX Performance (incl. FIRE+ICE) | 79 / 84 kWh | 545 Nm | 11 / 185 | 08/2024 – 04/2026 | CZ 11/2024 | E2 (336644, 341233), E1 |

Trims seen (not configurations): Pre-facelift Life / Business / Family / Style / Tech / Max / Tour /
1st / 1st Plus / 1st Max / City (DE), Easy (SK); Facelift MOVE / GOAL / ENERGY (DE), People /
Limited (CZ). Trims are pass 3 and come from SK / CZ documents only.

### Second facelift: ID.3 Neo (from 07/2026) — not in the list above (V1)

| engine (code@kW) | battery net / gross, chemistry | torque | AC / DC | evidence |
|---|---|---|---|---|
| `EEJ-50kWh@125` | 50 / 52 kWh LFP | 350 Nm | 11 / 100 | E2 (350739), E8 (SK list 01.10.2026 "125 / 170 50 (52) kWh 417 km") |
| `EEJ-58kWh@140` | 58 / 61 kWh LFP | 350 Nm | 11 / 105 | E2 (350740), E8 "140 / 190 58 (61) KWh 492 km" |
| `EEJ-79kWh@170` | 79 / 84 kWh NMC | 350 Nm | 11 / 183 | E2 (350741), E8 "170 / 231 79 (84) kWh 629 km" |

Also announced: ID.3 GTI (ADAC "Baujahr: seit 2027") — not a used car yet.

**Not included:** Cupra Born (own model, same platform); ID.3 Cargo / van versions (none found).

## 3. Decisions for Martin (pass 1 gate)

| # | question | recommendation |
|---|---|---|
| V1 | ID.3 Neo (on sale since 07/2026): import now? Market fields are required, and there are no used Neo cars to read (needs ≥ 10 listings). | **Defer the Neo** to its own later import (Pre-facelift + Facelift now). Alternative: seed it now with a section-M market exception. |
| V2 | Phase years | Pre-facelift **2020 – 2022** (ADAC "Baureihenende 12/22"); Facelift **2023 – 2026** (CZ facelift price list 08/2023; ADAC last build 04/2026). Pre-facelift cars first registered in 2023 exist (stock) — the year split follows build, as for the i3 / Zoe. |
| V3 | Engine codes | `EBJ-45kWh`, `EBJ-58kWh` (two rows: @107 and @150), `EBJ-77kWh`, `EDC-52kWh`, `EDC-59kWh`, `EDC-77kWh`, `EDF-79kWh`, `EEW-79kWh` — 9 rows. ADAC's three letters, battery suffix (pack rule 7). TecDoc-style parts lists give four-letter codes (EDCA, EDCC, EDFA, EEWA) but contradict ADAC (they list the 2024 Pro as 170 kW "EDCC"), so they are not used. |
| V4 | Gearbox (rule 2b) | **Two new reviewed `transmission_units` rows**, own migration before the seed: `VW 0MH` (single_speed, maker Volkswagen, speeds 1) for the `EBJ` cars — the MEB owners' wiki names "1-Gang-Getriebe 0MH … beim ID.3 & ID.4 baugleich … ID.3 hat eine Übersetzung von 11,531" (E9; forum-level source, VW itself only says "two-stage single-speed"). For the 2024+ `EDC` / `EDF` / `EEW` cars no gearbox code was found: `generic:Single-speed EV (MEB 2024)`, maker Volkswagen, distinct from 0MH because VW's APP550 drive (E10) is a new drive unit — or reuse `VW 0MH` if you prefer one row. |
| V5 | CZ 11/2024 list says "Pro S (5 míst) 150 kW, 77 kWh (2024)"; ADAC and the SK 02/2025 list say 170 kW | 170 kW (SK document + ADAC agree; the CZ line reads like a typo — same list gives the Pro S 1 998 kg, the 170 kW car's weight class) |
| V6 | Pro S 4-seat vs 5-seat (P4, F2): same body, different seat count / payload | one configuration per motor × battery; body `seats_count` 5, the 4-seat Pro S noted in R and as a con (like the i3s body note) |
| V7 | Model: segment / origin | segment **C** (ADAC "Fahrzeugklasse Untere Mittelklasse (z.B. Golf)"; Golf is C in the catalog), origin `german` |
| V8 | Facelift F1 / F2 reuse the Pre-facelift engine rows (same motor `EBJ`, same 58 / 77 kWh battery) | REUSE — and every fault on them gets build years, as the i3 94 Ah (RESEARCH-PROCESS.md, engine faults stored per unit) |

Already found for later passes (kept, not yet checked against the pack's STANDARDS):
- **Euro NCAP 2020: 5 stars, 87 / 89 / 71 / 88 %** (E11). Whether the 2020 rating covers the facelift
  is a pass-3 question.
- **Towing: not permitted** — ADAC test text "Nach wie vor muss man auf eine Anhängelast und Dachlast
  verzichten" (facelift), "mehr als ein Fahrradträger ist noch immer nicht gestattet" (GTX); CZ list
  option 1M1 "Zadní nosné zařízení … Pouze pro svislou zátěž (např. nosič jízdních kol) … Maximální
  zatížení 55 kg" (E1). Pass 2 needs a VW document saying it for the `0` (RESEARCH-PROCESS.md, towing).
- ADAC per variant (E2): EU curb weight 1 772 (Pure Performance) – 1 993 kg (GTX Performance), GVW,
  payload, 0–100, top speed 160 / 180 / 200, WLTP kWh/100 km and range, ISOFIX "Vorn und hinten",
  heat pump optional (1 275 € pre-facelift, 990 € facelift).
- Recalls on the ADAC pages: 03/2026 high-voltage battery modules (built 02/2022 – 08/2024, fire risk;
  pre-facelift and facelift); 11/2021 interior light mounting (built 05/2020 – 01/2021).

## 4. Evidence

| ref | source | quote |
|---|---|---|
| E1 | Volkswagen ČR price list "Ceník, technická data ID.3", "Platnost od 13.11.2024" (dealer copy) https://www.auto-horejsek.cz/images/modely-vw/id-3/vw-id-3-cenik.pdf | "ID.3 Pure 125 kW, 52 kWh E122DDL5 899 900"; "ID.3 Pro 150 kW, 59 kWh (2024) E123KK03 1 036 900"; "ID.3 Pro S (5 míst) 150 kW,77 kWh (2024) E124KN03 1 139 900"; "ID.3 GTX 210 kW, 79 kWh"; "ID.3 GTX Performance 240 kW, 79 kWh"; "Pohon Zadní"; "Pohotovostní hmotnost 1839 … 1867 … 1998 … 2008/2023" |
| E2 | ADAC Autokatalog, VW ID.3, 51 variant pages (ids listed in section 2) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/vw/id3/ | e.g. 313859: "Baureihe ID.3 (E1) (09/20 - 12/22)"; "Herstellerinterne Baureihenbezeichnung E1"; "Motorcode *EBJ*"; "Antriebsart Hinterrad"; "Getriebeart Reduktionsgetriebe"; "Anzahl Gänge 1"; "Batteriekapazität (Netto) in kWh 58,0"; 335151: "Motorcode EDC … 170 … Batteriekapazität (Netto) in kWh 77,0"; 335652: "Motorcode EDF … 210 … 545 Nm … 79,0"; 336644: "Motorcode EEW … 240"; 350739: "Motorcode EEJ … 125 … 350 Nm … Lithium-Eisenphosphat … 50,0" |
| E3 | Slovenská sporiteľňa, VW configuration "ID.3 Easy Pro Performance", "Ponuka zo dňa 13.10.2022" https://cdn0.erstegroup.com/content/dam/sk/slsp/www_slsp_sk/documents/Business/konfiguracia-id3-easy-pro-performance.pdf | "E113MJB1 ID.3 Easy Pro Performance 44 290,-- EUR"; "systémový výkon 150 kW/ 204 k"; "CCS - Kombinovaná rýchlonabíjacia prípojka s výkonom 100 kW" |
| E4 | Volkswagen ČR price list 14.10.2021 (dealer copy, now 404; Internet Archive offline 2026-11-18) https://www.tukas.cz/wp-content/uploads/2019/05/id-3-14-10-2021.pdf | **search-index text only, not opened:** "ID.3 Pro Performance 150 kW, kap.58 kWh E113MJ02 1 031 900"; Pure Performance 110 kW 45 kWh 916 900; Pro 107 kW 58 kWh 990 900; Pro S 77 kWh 4-seat 1 138 900 / 5-seat 1 142 900 — to re-open when the archive is back |
| E5 | Volkswagen ČR facelift price list 08/2023 (dealer copy, now 404) https://www.tukas.cz/wp-content/uploads/2023/09/id-3-facelift-08-2023.pdf | **search-index text only:** "ID.3 Pro 150 kW, 58 kWh E123MJ03 1 112 900" |
| E6 | Gabriel (VW dealer SK), "Platí od 01.04.2024" (now 404) https://www.gabriel.sk/wp-content/uploads/2022/09/id3-pa-01042024.pdf | **search-index text only:** "*MJ12 Pro Performance elektrina automatická 150 / 204 58 (62) kWh 429 km 37 990 €" |
| E7 | Gabriel (VW dealer SK), 11.02.2025 (now 404) https://gabriel.sk/wp-content/uploads/2025/02/id3-pa-11022025.pdf | **search-index text only:** "4PN12 Pro S elektrina automatická 170 / 231 77 (82) kWh 557 km 45 790 €"; GTX 49 290 € |
| E8 | Volkswagen SK price list "Cenník Volkswagen ID.3 Neo", "Platí od 01.10.2026" (dealer copy) https://www.gabriel.sk/wp-content/uploads/2025/04/ID.3-PA-01.04.2026.pdf | "*2HB12 Trend elektrina automatická 125 / 170 50 (52) kWh 417 km 32 990 €"; "*3JM12 … 140 / 190 58 (61) KWh 492 km"; "*3PP12 … 170 / 231 79 (84) kWh 629 km"; "Batéria LFP 50/52 kWh netto/brutto" |
| E9 | meinid.com wiki "Elektroantrieb & Getriebe" (MEB owners' wiki) https://www.meinid.com/wiki/entry/27-elektroantrieb-getriebe/ | "1-Gang-Getriebe 0MH"; "Das Getriebe ist beim ID.3 & ID.4 baugleich."; "ID.3 hat eine Übersetzung von 11,531" |
| E10 | Volkswagen newsroom, "New drive for the all-electric ID. family", 12.04.2023 https://volkswagen-newsroom.com/en/press-releases/new-drive-for-the-all-electric-id-family-more-performance-and-higher-efficiency-15699 | "The new powertrain has an output of 210 kW (286 PS)"; "a maximum torque of around 550 Nm"; "The drive system with gearbox, rotor and stator will be produced at the Volkswagen Group Components plant in Kassel." |
| E11 | Euro NCAP datasheet VW ID.3 2020 (ADAC copy) https://assets.adac.de/image/upload/v1605093142/ADAC-eV/KOR/Text/PDF/VW_ID.3_2020_Datasheet_ADAC-deutsch_ntuygi.pdf | "ADULT OCCUPANT Total 33.3 Pts / 87%"; "CHILD OCCUPANT Total 44 Pts / 89%"; "VULNERABLE ROAD USERS Total 38.8 Pts / 71%"; "SAFETY ASSIST Total 14.2 Pts / 88%" |

## 5. R — gaps & doubts (pass 1)

| item | note | where looked |
|---|---|---|
| 2020–2023 SK / CZ price lists | the dealer PDFs are 404 and the Internet Archive was offline; E4–E7 are search-index text | tukas.cz, cb-auto.cz, gabriel.sk, web.archive.org |
| four-letter motor codes | ADAC gives three letters; parts catalogues disagree with ADAC | rexbo.co.uk (TecDoc data), web search |
| APP550-era gearbox code | not found | VW newsroom, meinid wiki |
| Pre-facelift / facelift boundary | ADAC has no variant built 01/2023 – 09/2023 although the CZ facelift list is 08/2023 | ADAC, E5 |
| Pure Performance end in CZ | ADAC (DE) ends 08/2021, CZ list 10/2021 still has it | E2, E4 |

**Pass 1 approved by Martin 2026-11-18: configuration list P1–P4 / F1–F7 and V1–V8 all as recommended**
(Neo deferred; years 2020–2022 / 2023–2026; 9 engine rows; gearbox rows `VW 0MH` + `generic:Single-speed EV (MEB 2024)`;
Pro S 2024 = 170 kW; one configuration per motor × battery; segment C, german; F1 / F2 reuse the pre-facelift rows).

---

# Passes 2–5 (2026-11-18)

Perplexity log: 1 × `perplexity_research` (faults + service — timed out, billed; topic moved to web search),
1 × `perplexity_ask` (owner faults — returned aggregator sites only, none used as evidence). 2 of 8.

## 6. Decisions for Martin (passes 2–5)

| # | topic | finding | recommendation |
|---|---|---|---|
| W1 | height / length | Pre-facelift: VW Austria 02/2021 "Höhe max. 1.568", length 4 261 (= ADAC). Facelift: CZ list 11/2024 4 265 / 1 809 / 1 552; VW press kit 02/2023 (preliminary) 4 261 / 1 562; ADAC 4 264 / 1 564 | Pre-facelift **4 261 / 1 809 / 1 568**; Facelift **4 265 / 1 809 / 1 552** (SK/CZ-market manufacturer document) |
| W2 | configuration curb weights | Pre-facelift: VW Austria EU weight (driver 68 kg + 7 kg luggage) = ADAC exactly (1 772 / 1 805 / 1 805 / 1 934). Facelift: ADAC EU 1 787 – 1 993; CZ list "Pohotovostní hmotnost" 40–50 kg higher (Pure 1 839, Pro 1 867, Pro S 1 998, GTX 2 008 / 2 023); vw.sk 08/2024 sheet (search-index text only, now 404) Pure 1 793, Pro 1 822, Pro S 1 981 | **ADAC EU** for every configuration (it reproduces VW's own EU figure where both were opened); CZ / SK figures in R |
| W3 | body curb / GVW / payload | VW gives payload as a range "420 – 543" (Pure Performance) — the top end is GVW − (EU curb − 75 kg driver) | Pre-facelift **1 772 / 2 240 / 468**; Facelift **1 787 / 2 260 / 473** (Pure 52 kWh, ADAC). Payload = GVW − EU curb (driver counted), as the Zoe |
| W4 | towing / roof | VW Austria "Zul. Stützlast/Zul. Dachlast – / 0"; ADAC test 2020 "Eine Anhängelast ist ebenfalls nicht zugelassen, somit auch keine Anhängerkupplung verfügbar"; ADAC GTX 2025 "mehr als ein Fahrradträger ist noch immer nicht gestattet"; bike-carrier coupling 75 kg (press kit 02/2023) | **towing 0** both phases, **roof_load 0** (VW "Zul. Dachlast 0"), nose weight NULL (bike-carrier load, not a trailer) |
| W5 | NCAP on the facelift | only the 2020 test exists (5★, 87 / 89 / 71 / 88) | same 2020 rating on both phases (body and safety structure carried over) |
| W6 | ratings | ADAC Pannenstatistik ID.3: 3.5 / 1.9 / 1.3 / 0.7 breakdowns per 1 000 cars (registered 2020 / 21 / 22 / 23) — very low; 2022 service campaign replaced the 12 V battery on all early ID.3 / ID.4 (~200 000 cars); HV-battery recalls for 2022–2025 builds | all 9 motors **4** (early 12 V / software trouble; battery-module recalls fixed by campaign); both gearbox rows **5** |
| W7 | heat pump | ADAC (DE): option on every variant; CZ 11/2024: "Pro — navíc oproti výbavě Pure … Tepelné čerpadlo" (Pro S / GTX build on Pro) | `optional` on the EBJ rows and EDC-52; `standard` on EDC-59, EDC-77, EDF-79, EEW-79 (CZ document) |
| W8 | battery cooling | VW newsroom: base plate "with integrated water channels … connected to a coolant circuit" | `active_liquid` (all) |
| W9 | Pro S pre-facelift configuration facts | 4-seat (09/20) 16.7 kWh / 525 km / 1 934 kg vs 5-seat (05/21) 15.4 kWh / 556 km / 1 928 kg | the **05/21 5-seat** figures (most built, matches body seats 5) |
| W10 | market | Pre-facelift SK n = 27 → **17 490 / 19 990 / 22 490 €, 50,629 – 157,000 km**; CZ n = 83 → 18 822 / 21 324 / 25 219 €, 14,000 – 120,706 km. Facelift SK n = 5 (below 10); CZ n = 19 → **25 554 / 28 701 / 32 765 €, 10,000 – 45,000 km** | Pre-facelift **SK** column; Facelift **CZ** column |
| W11 | resale | Pro Performance DE list 38 060 € (2021) → ~20 000 € after ~5 years (~52 %); Pro 2024 DE list 36 425 € → ~28 700 € after ~2 years (~79 %) | **average** both phases (unlike the i3 / Zoe small batteries, ID.3 prices track the segment) |
| W12 | fault costs / probabilities | no sourced EUR repair price for the 12 V battery or the early software faults | 12 V battery: **minor, wear 1/5 = 0.2, cost from you (M) or NULL**; early software crashes: **minor, occasional 0.02, cost NULL** (fixed by free software updates). Recalls: cost / probability N/A |

## 7. Data (passes 2–4)

### 7a. Phase / body

| field | Pre-facelift | Facelift | evidence |
|---|---|---|---|
| generation_code / platform / chassis | E1 / MEB / monocoque | same | E2 |
| safety_rating, ncap_year, % | 5, 2020, 87 / 89 / 71 / 88 | same (W5) | E11 |
| towing_capacity_kg | 0 | 0 | E12, E13, E2 (W4) |
| length / width / height | 4 261 / 1 809 / 1 568 | 4 265 / 1 809 / 1 552 | E12 / E1 (W1) |
| boot / max | 385 / 1 267 | 385 / 1 267 | E12 "385 – 1.267"; E14 "385 litres … up to 1,267 litres" |
| curb / GVW / payload | 1 772 / 2 240 / 468 | 1 787 / 2 260 / 473 | E12, E2 (W3) |
| seats | 5 (Pro S 4-seat variant: R) | 5 (Pro S 4-seat until 05/2024: R) | E2, E12 "4-Sitze (5-Sitze für Pro S Tour 5)" |
| ISOFIX | 3, front passenger yes | 3, front passenger yes | E12 "ISOFIX-Halteösen … auf den äußeren Rücksitzen sowie auf dem Beifahrersitz"; E3; E1 |
| roof load | 0 | 0 | E12 "Zul. Dachlast … 0" |
| ground clearance | NULL | NULL | not found (R) |

### 7b. Engines (all: electric, rear PSM motor, `active_liquid`, yearly maintenance N/A)

| code@kW | torque | net kWh | AC / DC max | heat pump | evidence |
|---|---|---|---|---|---|
| EBJ-45kWh@110 | 310 | 45 | 7.2 / 100 | optional | E12, E2 |
| EBJ-58kWh@107 | 275 | 58 | 11 / 120 | optional | E12, E2 (320811 "DC:120") |
| EBJ-58kWh@150 | 310 | 58 | 11 / 120 | optional | E12, E2 |
| EBJ-77kWh@150 | 310 | 77 | 11 / 170 | optional | E12, E2 (320813 "DC:170") |
| EDC-52kWh@125 | 310 | 52 | 7.2 / 145 | optional | E2, E1 "DC 145 kW … AC 7,2 kW" |
| EDC-59kWh@150 | 310 | 59 | 11 / 165 | standard | E2, E1 |
| EDC-77kWh@170 | 310 | 77 | 11 / 175 | standard | E2, E7 |
| EDF-79kWh@210 | 545 | 79 | 11 / 185 | standard | E2, E1 "DC 185 kW … AC 11 kW" |
| EEW-79kWh@240 | 545 | 79 | 11 / 185 | standard | E2, E1 |

Maintenance (all): "Nach Service-Intervall-Anzeige spätestens nach zwei Jahren ohne Kilometerbegrenzung … mit Wechsel
von Bremsflüssigkeit und Innenraumfilter" (E15); no oil, belt or plugs.

### 7c. Configurations (WLTP, base wheels; ADAC E2)

| # | engine | kWh/100 km | range km | 0–100 | top speed | curb | ADAC id |
|---|---|---|---|---|---|---|---|
| P1 | EBJ-45kWh@110 | 14.9 | 351 | 8.9 | 160 | 1 772 | 319026 |
| P2 | EBJ-58kWh@107 | 15.4 | 426 | 9.6 | 160 | 1 805 | 317597 |
| P3 | EBJ-58kWh@150 | 15.4 | 426 | 7.3 | 160 | 1 805 | 313859 |
| P4 | EBJ-77kWh@150 | 15.4 | 556 | 7.9 | 160 | 1 928 | 320814 (W9) |
| F1 | EBJ-58kWh@150 | 14.9 | 435 | 7.4 | 160 | 1 821 | 326861 |
| F2 | EBJ-77kWh@150 | 14.9 | 575 | 7.9 | 160 | 1 951 | 326865 |
| F3 | EDC-52kWh@125 | 15.2 | 388 | 8.2 | 160 | 1 787 | 335649 |
| F4 | EDC-59kWh@150 | 15.3 | 433 | 7.6 | 160 | 1 822 | 335648 |
| F5 | EDC-77kWh@170 | 15.6 | 567 | 7.1 | 160 | 1 957 | 335151 |
| F6 | EDF-79kWh@210 | 14.5 | 605 | 5.9 | 180 | 1 981 | 335652 |
| F7 | EEW-79kWh@240 | 14.6 | 604 | 5.7 | 200 | 1 993 | 336644 |

### 7d. Faults

| target | fault | years | severity | evidence |
|---|---|---|---|---|
| engines EBJ-58@150, EBJ-77, EDC-*, EDF, EEW | Recall: HV-battery modules out of spec — range loss, yellow warning lamp, fire risk; software update, modules checked / replaced (DE 03/2026, built 02/2022–08/2024; UK R/2026/397 "charge to 80 %" until repaired) | 2022–2024 | critical | E2 (ADAC recall), E16 |
| same | Recall: battery cells with raised self-discharge — yellow lamps; modules checked / replaced, charge outdoors to 80 % until done (UK R/2026/150, built 10/2022–04/2025) | 2022–2025 | critical | E16 |
| vehicle, Pre-facelift | 12 V battery drains / weak — car won't wake, error messages; all early cars got a new 12 V battery + software 2.4 free in the 2022 campaign | 2020–2022 | minor | E17 |
| vehicle, Facelift | 12 V battery wear (same part) | — | minor | E17 (W12) |
| vehicle, Pre-facelift | Software bugs — driver display / infotainment freezes and reboots, assistants drop out; fixed by later ID. software | 2020–2021 | minor | E2 (ADAC Mängel "Ausfall des Fahrerdisplays … Permanenter Neustart des Infotainment Systems"), E18 |
| vehicle, Pre-facelift | Recall: interior light may come loose in a crash (built 05/2020–01/2021); light replaced | 2020–2021 | moderate | E2 |
| vehicle, Pre-facelift | Recall: front passenger airbag may not be bolted securely (UK R/2023/072, built 04/2021–12/2022); deactivate until inspected | 2021–2022 | critical | E16 |

Not listed: UK R/2021/409 (steering rack bush, 2 cars), UK R/2026/046 (21 cars, 07–10/2023 battery modules — inside the
2022–2024 campaign above); one ADAC member report of unintended acceleration while reversing (single case, not a pattern).

### 7e. Trims

- **Pre-facelift — "Easy"** (SK, Slovenská sporiteľňa configuration 13.10.2022, E3): ACC with predictive function, Climatronic,
  Discover Pro 10" navigation, App-Connect wireless, heated front seats and heated leather steering wheel, Park Assist with front /
  rear sensors, Rear Assist camera, LED headlights, Keyless Advanced, alarm, ambient light (30 colours), wireless phone charging,
  Lane Assist, Front Assist, traffic-sign recognition, driver drowsiness detection, ISOFIX 3 positions, 18" steel wheels 215/55 R18,
  11 kW AC / 100 kW DC.
- **Facelift — Pure / Pro / Pro S / GTX** (CZ 11/2024, E1): Pure — 18" steel wheels, ACC, Lane Assist, Front Assist with
  pedestrian / cyclist detection, park sensors front / rear, LED headlights, App-Connect wireless, single-zone A/C, DAB+, ISOFIX 3,
  DC 145 / AC 7.2 kW; Pro adds heat pump, two-level boot floor, "Play / Pause" pedals; Pro S adds 20" Sanya alloys; GTX adds 20"
  Skagen alloys, IQ.Light LED matrix, 3D LED tail lights, illuminated light strip, tinted rear windows, DC 185 / AC 11 kW.

## 8. Market (pass 5) — listings read 2026-11-18, CZK at 24.386 (ECB 2026-11-18)

Phase from the build date (sauto `manufacturing_date`, else first registration); 2023 builds are ambiguous (pre-facelift
stock and facelift) and left out unless the ad says facelift. Excluded: ID.3 Neo, cars under 1 000 km (new stock),
autobazar.eu ads without a Slovak region (Czech dealers, counted in CZ). Cut ~10 % at each end.

- **SK (autobazar.eu, 4 pages, 67 ads, 34 Slovak):** Pre-facelift 27 → cut 3/side → **17 490 / 19 990 / 22 490 €**,
  50,629 – 157,000 km. Facelift 5 (25 900 ×3, 27 900, 27 999) — below 10.
- **CZ (sauto.cz API, 147 ads):** Pre-facelift 83 → cut 8/side → 18 822 / 21 324 / 25 219 €, 14,000 – 120,706 km.
  Facelift 19 → cut 2/side → **25 554 / 28 701 / 32 765 €, 10,000 – 45,000 km**. Ambiguous 2023: 11; Neo: 30; new: 4.
- **DE reference (mobile.de, damaged hidden):** EZ 2020–2022: 1 022 hits, first page 16 ID.3 → 17 990 – 25 990 €;
  EZ 2024–2025, ≥ 1 000 km: 2 111 hits, first page 23 → 22 490 – 43 430 € (centre ~27 800 €).

## 9. Evidence added

| ref | source | quote |
|---|---|---|
| E12 | VW Austria (Porsche Austria) brochure "Der vollelektrische ID.3", Ausgabe Februar 2021 (dealer copy) https://www.borgmann-krefeld.de/fileadmin/volkswagen/vw-borgmann-technische-daten-broschuere-id.3.pdf | "Leergewicht 1.772 1.805 1.805 1.934"; "Zul. Gesamtgewicht 2.240 2.270 2.260 2.280"; "Zuladung 420 – 543 …"; "Zul. Stützlast/Zul. Dachlast – / 0"; "4.261"; "Höhe max., mm … 1.568"; "Gepäckraumvolumen … 385 – 1.267"; "Fahrzeugleergewicht mit Fahrer 68kg, 7 kg Gepäck"; "ISOFIX-Halteösen für Kindersitze auf den äußeren Rücksitzen sowie auf dem Beifahrersitz" |
| E13 | ADAC Autotest VW ID.3 Pro Performance 58 kWh 1st Max (2020) https://assets.adac.de/image/upload/v1607082434/ADAC-eV/KOR/Text/PDF/VW_ID_3_Pro_Performance_58_kWh_1st_Max_vjjkbf.pdf | "Dachträger sind nicht möglich, weil keine Dachlast zulässig ist. Eine Anhängelast ist ebenfalls nicht zugelassen, somit auch keine Anhängerkupplung verfügbar." |
| E14 | VW press kit "The new ID.3", 22.02.2023 https://cdn.uc.assets.prezly.com/73786b5b-a631-4f04-8ec4-08f1a076fafb/-/inline/no/EN%20ID3%20-%20press%20kit.pdf | "a capacity of 385 litres; this increases up to 1,267 litres"; "A bicycle carrier coupling with a drawbar load of 75 kilograms is optionally available" |
| E15 | Volkswagen Austria, Inspektionsintervalle https://www.volkswagen.at/service-zubehoer/volkswagen-service/elektroautos-in-der-werkstatt/inspektionsintervalle | "Nach Service-Intervall-Anzeige spätestens nach zwei Jahren ohne Kilometerbegrenzung"; "mit Wechsel von Bremsflüssigkeit und Innenraumfilter" |
| E16 | UK DVSA recalls via carpeep https://carpeep.co.uk/volkswagen/id3 | R/2026/397 built 09/2022–05/2024 "Charging restricted to 80%"; R/2026/150 built 10/2022–04/2025 "increased self-discharge"; R/2023/072 built 04/2021–12/2022 front passenger airbag "may not be securely bolted" |
| E17 | electrive.net, 07.04.2022 https://www.electrive.net/2022/04/07/vw-ruft-id-3-und-id-4-in-die-werkstatt-fuer-software-updates-und-eine-neue-12-v-batterie/ | all ID.3 / ID.4, about 200 000 cars: 12-V battery replaced and software 2.4 installed, free; "Mit der Aktion soll ein einheitlicher Software-Stand erreicht werden." |
| E18 | ADAC Autotest 2020 (E13) | "Auffälligkeiten/Mängel Softwarebugs, Systemabstürze und -ausfälle" |
| E19 | Volkswagen newsroom, battery and charging https://www.volkswagen-newsroom.com/en/the-new-id3-6240/battery-and-charging-options-6247 | base plate "with integrated water channels" regulating the cell modules, connected to a coolant circuit (search-index text; page now 404) |
| E20 | ADAC Pannenstatistik on the ADAC ID.3 page (E2, 320814) | "Pannen pro 1000 Fahrzeuge 2023 0.7 2022 1.3 2021 1.9 2020 3.5" |

## 10. R — gaps & doubts (passes 2–5)

| item | note |
|---|---|
| ground clearance | not in any VW / ADAC document opened |
| facelift weights | CZ 11/2024 list 40–50 kg above ADAC EU; vw.sk 08/2024 sheet only as search text (W2) |
| facelift height | 1 552 (CZ) / 1 562 (press kit, preliminary) / 1 564 (ADAC) |
| Pro S 4-seat | 4-seat Pro S (09/2020 – 05/2024) has payload 339–354 kg and 4 seats; body row says 5 |
| EBJ-45 DC | VW Austria 02/2021: 50 kW std / 100 kW option; ADAC 05/21 "DC:50-110" — 100 kept (manufacturer) |
| repair costs | 12 V battery, software — no sourced EUR price (W12) |
| facelift 2023 trims | the CZ 2024 lines describe the 2024+ cars; the 2023 CZ facelift list exists only as search text (E5) |
| SK facelift market | 5 listings |
| VW 0MH | code from an owners' wiki only (V4) |

**Passes 2–5 approved by Martin 2026-11-18 (W1–W12 as recommended).**

## 11. Migration files

- `20261118120000_transmission_units_vw_id3_meb.sql` — gearbox rows `VW 0MH` and `generic:Single-speed EV (MEB 2024)`.
- `20261118120500_seed_vw_id3_e1.sql` — model, 2 phases, 2 bodies, 9 engines, 11 configurations, 5 trims / 50 features,
  19 faults. (The optional head-up-display pack was left off the Pure trim: the CZ list doesn't show which lines can order it.)

Both ran via MCP on 2026-11-18 after Martin's review and were read back (4 + 7 configurations, 24 + 26 features, 4 + 1
vehicle faults, 14 engine faults, no duplicate engine rows). Tag rules re-run after a rolled-back preview: `green_zone` × 11,
`isofix_3x` on both phases, nothing else pending catalog-wide. `npm test` 144/144.
