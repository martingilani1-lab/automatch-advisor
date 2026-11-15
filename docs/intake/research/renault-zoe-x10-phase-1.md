# Renault Zoe (X10) Phase 1 — research (pass 1: identity + configurations)

Researched 2026-11-15 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`. **Pass 1 only — the
configuration list needs Martin's approval before passes 2–5.** No DB writes.

Phase 2 (2019–2024) was completed the same day: `renault-zoe-x10-completion.md`.

## Reconcile (live, Supabase MCP, read-only, 2026-11-15)

| what | live | consequence |
|---|---|---|
| phase | only `Zoe X10 Phase 2` (2019–2024) | Phase 1 is a NEW `catalog_phases` row under the existing model `Zoe` / brand `Renault` |
| engines | `R110@80` = the Phase 2 **52 kWh** motor; `R135@100` | no Phase 1 engine exists; the 41 kWh R110 needs its own code (pack rule 7: `<motor>-<battery>`) |
| gearbox | `generic:Single-speed EV (Zoe Ph2)` (single_speed, maker NULL) | rule 2b: Phase 1 needs a `transmission_units` row before the seed → decision P3 |
| drivetrain | FWD, no drivetrain system | — |

## 1. Configuration list (pass 1) — **approved by Martin 2026-11-15** (all 6, P1–P5 as recommended)

Every Phase 1 configuration sold in the EU. All: Hatchback 5-door, front-wheel drive, single-speed
reduction gear ("Redukčná prevodovka (jednostupňová) … 1" — E1), 5 seats, NEDC cycle.

| # | engine (code@kW) | motor | battery | AC charging | years (EU) | sold officially in SK / CZ? | evidence |
|---|---|---|---|---|---|---|---|
| G1 | `Q210@65` | Continental, 65 kW | 22 kWh | 2–43 kW (Caméléon) | 06/2013 – 2016 | no source found — import only | E4 (ADAC), E3 (press kit: "the Q90 motor was previously known as the Q210") |
| G2 | `R240@65` | Renault, 65 kW | 22 kWh | 2–22 kW | 03/2015 – 2016 | no source found — import only | E4 (ADAC: "modifizierter Elektromotor (Renault Eigenentwicklung R240)"), E3 |
| G3 | `R90-22kWh@68` | Renault (= R240 renamed), 68 kW / 220 Nm | 22 kWh | 2–22 kW | 2017 – ? | **SK** (Life, Intens — brochure 12/2016) | E1, E2 |
| G4 | `R90-41kWh@68` | same, 68 kW / 220 Nm | Z.E. 40, 41 kWh | 2–22 kW | 2017 – 06/2019 | **SK** (from 2017), **CZ** (from 06/2018) | E1, E2, E5, E6 |
| G5 | `Q90@65` | Continental (= Q210 renamed), 65 kW / 220 Nm | Z.E. 40, 41 kWh | 2–43 kW | 2017 – ? | **CZ** (Life, Intens — 06/2018) | E2 ("Q90 mit Schnellladung … 65 (88)"), E5 |
| G6 | `R110-41kWh@80` | Renault, 80 kW / 225 Nm | Z.E. 40, 41 kWh | 2–22 kW | 06/2018 – 06/2019 | **CZ** (Intens, 06/2018) | E4, E5, E6 |

**Not included:**
- **R75** — French-market entry motor only (E3: "with the exception of the French market's entry
  level version which features the R75 motor").
- **Zoe Cargo / Van** — commercial 2-seat body, not a passenger configuration.
- **Q90 with 22 kWh** — no source shows it (E2 lists Q90 only with Z.E. 40).

Open dates (pass 2 will settle them from Renault documents): the last build month of Q210 / R240,
whether R90 22 kWh ran to 2019, and the Q90's end of production.

## 2. Phase identity (pass 1)

| field | value | evidence |
|---|---|---|
| generation_code | X10 (same as Phase 2) | Safety Gate names the 2019 Zoe "Types: … X10" (Phase 2 doc, E10d) — Phase 1 code to be confirmed in pass 2 |
| phase_label | `Phase 1` | pack rule 7b |
| year_from / year_to | **2013 / 2019** | ADAC E4: "06/2013 Modelleinführung"; "06/2019 Modellpflege und Facelift" |
| platform_code | `Renault-Nissan B (Zoe)` (as Phase 2) | — |
| chassis_type | monocoque | — |
| consumption_cycle | NEDC | E1 "Dojazd vozidla podľa NEDC"; E2 "Norm-Reichweite NEDC" |

Already found for later passes (kept, not yet checked against the pack's STANDARDS):
- **Towing: not permitted** — Renault SK E1 "Maximálna hmotnosť brzdeného/nebrzdeného prívesu
  Nepovolený"; Renault NL E6 "niet toegestaan".
- Renault SK E1 (R90 22 kWh / R90 Z.E. 40): curb "Vlastná hmotnosť vozidla pripraveného na jazdu
  1 502 / 1 555", GVW 1 965 / 1 966, payload 463 / 411, length 4 084, width 1 730, height 1 562,
  boot 338 / 1 225, sill 724, NEDC 240 / 403 km, 0–100 13.2 s, 135 km/h, 133 Wh/km.
- Renault NL E6 (R110 Z.E. 40): "Massa rijklaar 1575", GVW 1 954; ISOFIX "op passagiersstoel vóór
  en op de twee buitenste zitplaatsen achter".
- Renault CH E2: Q90 NEDC 370 km, 14.6 kWh/100 km; R90 Z.E. 40 403 km, 13.3 kWh/100 km.

## 3. Decisions for Martin (pass 1 gate) — all approved by Martin 2026-11-15 as recommended

| # | question | recommendation |
|---|---|---|
| P1 | Include G1 Q210 and G2 R240 (2013–2016)? No source shows Renault sold them in SK / CZ, but they are a large part of the 22 kWh used market (imports). | **include** — buyers meet them; mark "import" in the research doc only |
| P2 | Engine codes | `Q210`, `R240`, `R90-22kWh`, `R90-41kWh`, `Q90`, `R110-41kWh` (live `R110` = 52 kWh stays as it is) |
| P3 | Gearbox: no source says the Phase 1 reducer is the same unit as Phase 2's | a NEW reference row `generic:Single-speed EV (Zoe Ph1)` in its own reviewed migration, before the seed (rule 2b) |
| P4 | Phase years | 2013 – 2019 (ADAC; DE launch 06/2013) |
| P5 | Battery rental | many Phase 1 cars still run on a rented battery (Q210 was rental-only in DE — E4): a con + pre-purchase check, no column |

## 4. Evidence

| ref | source | quote |
|---|---|---|
| E1 | Renault Slovensko, brožúra Nový Renault ZOE, 21.12.2016 https://autostyl.sk/data/documents/brozura-renault-zoe-t81nx.pdf | "Typ akumulátora 22 kWh / Z.E. 40"; "Maximálny výkon v kW EHS (k) 68 (92)"; "Maximálny krútiaci moment v Nm 220"; "Typ prevodovky Redukčná prevodovka (jednostupňová)"; "Maximálna hmotnosť brzdeného/nebrzdeného prívesu Nepovolený"; trims "LIFE", "intens (LIFE +)" |
| E2 | Renault Suisse, ZOE Preisliste Nr. 11.2 ab November 2016 https://www.elektroauto.community/applications/core/interface/file/attachment.php?id=78 | "R90 * 22 kWh bis 240 km NEDC"; "Q90 mit Schnellladung Z.E. 40 (41 kWh) bis 370 km NEDC"; "Maximale Leistung kW (PS) 68 (92) 68 (92) 65 (88)"; "Caméléon: Mono- bis drei Phasen (2 – 43 kW)" |
| E3 | Renault press kit, Paris Motor Show, 29.9.2016 https://www.motorshow.me/uploadImages/GalleryDocs/Doc6332.pdf | "The R75/90 motor was previously known as the R240"; "the Q90 motor was previously known as the Q210"; "with the exception of the French market's entry level version which features the R75 motor" |
| E4 | ADAC Gebrauchtwageninfo Renault Zoe (2013-2024) https://assets.adac.de/image/upload/Autodatenbank/GWInfo/gw0272-renault-zoe-2013-2024-bericht.pdf | "06/2013 Modelleinführung … (Continental-Motor Q210) mit einer maximalen Leistung von 65 kW/88 PS; … 22 kWh … Batterie kann nur gemietet werden"; "03/2015 modifizierter Elektromotor (Renault Eigenentwicklung R240)"; "01/2017 … R90 … 68 kW/92 PS; wahlweise … 22 kWh oder 41 kWh"; "06/2018 … R110 … 80 kW/109 PS (nur in Verbindung mit … 41 kWh)" |
| E5 | fdrive.cz, 30.5.2018 https://fdrive.cz/clanky/elektricky-renault-zoe-se-zacina-prodavat-v-cesku-dojezd-ma-pres-300-km-2375 | Renault "dosud oficiálně elektromobily neprodával"; R90 Lite 829 900 Kč; Q90 Life 847 900 / Intens 907 900 Kč; R110 Intens 897 400 Kč; "Akumulátor má kapacitu 41 kWh" |
| E6 | Renault Nederland, prijslijst ZOE 02/2019 https://cdn.group.renault.com/ren/nl/brochures-en-prijslijsten/prijzenarchief/zoe/prijslijst-renault-zoe-02-2019.pdf | "R110 … Z.E. 40 (41 kWh) 80 / 108"; "Massa rijklaar 1555 1575"; "Max. toelaatbaar aanhangergewicht (geremd) niet toegestaan" |

---

# Passes 2–5 (2026-11-15)

## 5. Martin's decisions after passes 2–5 (2026-11-15, all as recommended)

| # | topic | decision |
|---|---|---|
| W1 | weights | configs ADAC EU: 22 kWh cars **1 547**, R90 Z.E. 40 **1 555** (= Renault SK / NL), R110 Z.E. 40 **1 575** (= Renault NL); Q90 **1 555** source M (Renault CH gives 1 480 without the driver, the same as its R90 Z.E. 40 = 1 555 EU). Body: curb 1 547, GVW **1 965**, payload **463** (Renault SK, R90 22 kWh). Renault SK's own "1 502" for the 22 kWh car contradicts its Z.E. 40 figure and ADAC, so it is not used. |
| W2 | market | CZ column: **7 165 / 8 167 / 9 659**, mileage **42,000 - 144,524 km**; Z.E. 40 engines get a pro "asks more than the 22 kWh cars" |
| W3 | ratings / costs | motors **3** (all six); gearbox **5**; bearing cost 2 500–3 500 on Renault R-motors only, NULL on Q-motors; charger cost NULL |
| W4 | battery cooling | `active_air` as Phase 2 (medium unverified) |

## 6. Data (passes 2–4)

### 6a. Phase / body

| field | value | evidence |
|---|---|---|
| safety_rating, ncap_year | 5, 2013 | E7, E8 |
| ncap % adult / child / pedestrian / safety assist | 89 / 80 / 66 / 85 | E7 (Euro NCAP datasheet, read from the search index; the PDF now returns XML), E8 (85 % safety assist) |
| towing_capacity_kg | 0 | E1 "Nepovolený"; E6 "niet toegestaan" |
| length / width / height | 4 084 / 1 730 / 1 562 | E1 (ADAC 4 085 — manufacturer wins) |
| ground clearance | 120 | E9 "Bodenfreiheit maximal 120 mm"; Renault SK gives 120 laden |
| boot / max / sill | 338 / 1 225 / 724 | E1 |
| curb / GVW / payload | 1 547 / 1 965 / 463 | W1; E1, E9 |
| ISOFIX | 3, front passenger yes | E1 "Isofix na bočných zadných sedadlách a na mieste spolujazdca vpredu"; E6; E9 "Vorn und hinten" |

### 6b. Engines

| code@kW | torque | battery net | AC max | heat pump | evidence |
|---|---|---|---|---|---|
| Q210@65 | 220 | 22 | 43 | standard | E9 (65 kW, 220 Nm, 22.0 net, "Wärmepumpe Serie"), E10 ("charged at 43 kW") |
| R240@65 | 220 | 22 | 22 | standard | E9, E3 (renamed R90), E1 (R90 2–22 kW). ADAC's "AC 2,3-11,0" contradicts Renault — Renault used |
| R90-22kWh@68 | 220 | 22 | 22 | standard | E1, E2 |
| R90-41kWh@68 | 220 | 41 | 22 | standard | E1, E2, E6 |
| Q90@65 | 220 | 41 | 43 | standard | E2 |
| R110-41kWh@80 | 225 | 41 | 22 | standard | E6, E9 |

All six: no DC socket (`max_dc_charging_kw` N/A), `active_air` (W4), reliability 3 (W3), yearly maintenance N/A (pure EV).

### 6c. Configurations

| engine | kWh/100 km | cycle | range km | 0–100 | top speed | curb | evidence |
|---|---|---|---|---|---|---|---|
| Q210 | 14.6 | NEDC | 210 | 13.2 | 135 | 1 547 | E9, E10 |
| R240 | 13.3 | NEDC | 240 | 13.2 | 135 | 1 547 | E9 |
| R90-22kWh | 13.3 | NEDC | 240 | 13.2 | 135 | 1 547 | E1, E2 |
| R90-41kWh | 13.3 | NEDC | 403 | 13.2 | 135 | 1 555 | E1, E2 |
| Q90 | 14.6 | NEDC | 370 | 13.2 | 135 | 1 555 (M) | E2 |
| R110-41kWh | 16.3 | WLTP | 316 | 11.4 | 135 | 1 575 | E9, E6 |

### 6d. Faults (26 rows in the seed)

- Each motor: on-board charger / power-electronics failure (critical: with no DC socket the car can't
  charge; E4 "vermehrt defekte Leistungselektroniken (frühe Baujahre)", E11), cost NULL, 0.02; motor
  bearings (moderate; 2 500–3 500 on R-motors, NULL on Q-motors; 0.02; E4); 12 V battery (minor, 0.25).
- Gearbox: recalls R/2017/207 (built 07/2015–01/2016) and R/2018/070 (built 11/2016–04/2017), parking lock (E12).
- Vehicle: A/C compressor, front suspension, rusting discs (E4, 0.02, cost NULL — the €1 900–2 200
  compressor quote was a Phase 2 car); recalls R/2016/035 brake hoses, R/2018/025 accelerator pedal
  (built 07–10/2017), ADAC 04/2018 front wheel hubs (E4, E12).

### 6e. Trims (Renault Slovensko 12/2016, E1)

Life (tier 1, 14 features) and Intens (tier 2, "LIFE +", 9 features) — listed in the seed. Zen / Bose /
Limited appear only in DE / NL documents → not added.

## 7. Market (pass 5) — listings read 2026-11-15, CZK at 24.424 (ECB 2026-11-13)

Phase 1 = 22 or 41 kWh battery, first registration up to 09/2019. Excluded: rented battery (DE
"zzgl. Batteriemiete"), damaged / not running, parts cars; duplicates counted once.

- **SK (5, below the minimum):** autobazar.eu Aeystw3GwNN 12/2014 42 000 km 7 600 € (= bazos.sk
  196849859); autobazar.eu AmaXDCqzcGJ 11/2016 76 725 km 8 490 € (replacement 22 kWh battery; = bazos.sk
  197338972); bazos.sk 197193633 2019 R90 41 kWh 100 000 km 11 000 €; 197028327 2013 140 000 km 7 300 €;
  196931967 2013 126 000 km 6 000 €. Median 7 600.
- **CZ (12):** sauto.cz 211011771 (03/2014, 99 009 km, 235 900 Kč), 211064460 (12/2016 R240 Intens, 65 000,
  194 000; = autobazar.eu AeRzMa0a1dW), 211213299 (09/2016, 103 503, 199 000), 211269915 (04/2013, 63 200,
  199 900; = bazos.cz 225810087), 211302918 (12/2016, 78 391, 195 000), 211318938 (2016, 42 000, 189 999;
  = bazos.cz 225435441), 211290570 (07/2019 R110 41 kWh Limited, 165 821, 249 999; = bazos.cz 225168483);
  bazos.cz 225873581 (07/2017 40 kWh, 144 524, 224 000 incl. import), 225613840 (2017 Z.E. 40, ~120 000,
  230 000), 224906274 (2013 22 kWh owned, 107 000, 220 000), 225415980 (2014 22 kWh, 104 000, 175 000),
  226333335 (06/2014 22 kWh, 72 400, 139 000). Cut 1 at each end: **7 165 – 9 659 €, median 8 167**,
  42 000 – 144 524 km.
- **DE reference (mobile.de, EZ 2013–2019, 98 hits, first page, 14 usable):** 7 200 – 13 990 € after
  cutting 1 at each end, **median 9 740**; Z.E. 40 cars 11 900 – 16 990 €.

## 8. Evidence added

| ref | source | quote |
|---|---|---|
| E7 | Euro NCAP datasheet https://cdn.euroncap.com/media/6018/euroncap_renault_zoe_2013_5stars.pdf | "Total 32 pts / 89% ADULT OCCUPANT"; "Total 39 pts / 80% CHILD OCCUPANT"; pedestrian 66 % (search-index text) |
| E8 | completecar.ie https://www.completecar.ie/car-news/article/2425/Latest-NCAP-results-in | "the Renault Zoe trounced the competition by hitting an 85 per cent rating" (Safety Assist) |
| E9 | ADAC Autokatalog Zoe 1. Generation: 301608 (Q210), 231809 (R240), 261850 (R90 22), 266739 (R90 Z.E. 40), 291558 (R110 Z.E. 40) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/renault/zoe/1generation/ | "Leergewicht (EU) 1547 / 1555 / 1575 kg"; net 22,0 / 41,0 kWh; "Wärmepumpe Serie"; "Isofix … Vorn und hinten"; periods 06/13–02/15, 03/15–12/16, 01/17–09/19, 06/18–09/19 |
| E10 | Renault, "Renault ZOE record", 14.6.2012 https://alliance-renault-nissan.com/sites/default/files/Renault_ZOE_record.pdf | "charged at 43 kW, regaining 80% of battery capacity in under thirty minutes"; "NEDC range of 210 km" |
| E11 | EV Clinic https://evclinic.eu/category/ev/renault/emi-obc/ | "the most common cause of OBC failure, especially on the Renault ZOE with the Q drive system" |
| E12 | UK DVSA recalls via carpeep https://carpeep.co.uk/renault/zoe | R/2016/035 brake hoses; R/2017/207 built Jul 2015 – Jan 2016; R/2018/025 built Jul – Oct 2017; R/2018/070 built Nov 2016 – Apr 2017 |

## 9. Migration files

- `20261115220000_transmission_unit_zoe_ph1.sql` — new gearbox row (additive reference data).
- `20261115220500_seed_renault_zoe_x10_phase_1.sql` — (both ran via MCP 2026-11-15 after Martin's review; tags re-run; npm test 144/144) phase, body, 6 engines, 6 configurations,
  2 trims / 23 features, 26 faults (additive). Requires the first file.

## 10. R — gaps

| item | note |
|---|---|
| charger repair cost | no reliable EUR figure (aggregator €4 000–8 000 at a dealer; EV Clinic gives none) |
| A/C, suspension, discs, 12 V costs | no Phase 1 price found |
| Q90 production dates | not in ADAC (no German Q90); the CH 11/2016 and CZ 06/2018 lists confirm it was sold |
| R240 AC power | ADAC 11 kW vs Renault 22 kW (renamed R90) — Renault used |
| battery cooling medium | `active_air` unverified (W4) |
| Zen / Bose / Limited trims | only in DE / NL documents |
| SK market | 5 listings |
