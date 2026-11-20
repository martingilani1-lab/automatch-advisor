# Škoda Citigo (AA) — research (pass 1: identity + configurations)

Researched 2026-11-19 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`. **Pass 1 only — the
configuration list (section 2) and decisions C1–C9 need Martin's approval before passes 2–5.**
No DB writes. Perplexity calls: 3 of 8 (log in section 6).

## 0. Reconcile (live, Supabase MCP, read-only, 2026-11-19)

| what | live | consequence |
|---|---|---|
| brand | `Škoda` (7 models, all `czech`) | REUSE |
| model | no `Citigo`, no VW `up!` / SEAT `Mii` in `catalog_models`; no segment-A model at all | NEW model `Citigo` (segment A, `czech` → C1) |
| petrol engines | `CHYA@44` (Euro6, 999 cc, L3, belt, 95 Nm; Fabia NJ both phases), `CHYA@48` (Polo AW), `CHYB@55` (Euro6, 95 Nm; Fabia NJ, Polo AW, Ibiza), `CHYB@59` (Euro6d, 93 Nm; Fabia NJ) | Euro 6 Citigo 44 / 55 kW = **REUSE `CHYA@44` / `CHYB@55`** (same code, power, torque, cc). Euro 5 and Euro 6d-TEMP Citigo need their own rows (rule 3) → C3 |
| CNG engine | **no `cng` engine live at all** | `CPGA@50` NEW (first CNG engine in the catalog) → C3, C4 |
| electric | 19 rows (i3, Zoe, ID.3) — none NSF / e-up! | `EBM-32kWh@61` NEW |
| emission-split precedent | `i3-94Ah-REx-Euro6c` / `…-Euro6dT` (code suffix per stage, `Euro6d-TEMP` in the vocabulary) | same pattern proposed (C3) |
| gearbox 5MT | `VW MQ100` exists as a **stub**: family manual, maker NULL, speeds NULL, alt_codes NULL, rating NULL, 0 configurations | reuse it, completed by an UPDATE file (C5) |
| gearbox ASG | no VW `amt` row (only `Fiat Dualogic AMT`, `Opel Easytronic AMT`, both stubs) | rule 2b STOP: new reviewed row `VW SQ100` (C5) |
| gearbox EV | single-speed rows are per-car `generic:` rows; no `0CZ` | rule 2b STOP: new reviewed row `VW 0CZ` (C6) |
| drivetrain system | none needed (front-wheel drive only) | `driven_axle = 'front'`, `drivetrain_id` NULL |
| body types | `Hatchback 3-door` (179 cfg), `Hatchback 5-door` (371) | REUSE both |
| legacy `vehicles` rows | `Škoda Citigo (AA)` "2012 - 2020", `Volkswagen up!` "2012 - 2023" | leads only, not used |
| side finding | live `CHYA@44` "Euro6" is also used by the Fabia NJ **Facelift** (2018–2021); ADAC lists the 08/18+ Fabia 44 kW as WLTP-era. The Fabia did not get an emission split. | not this car — follow-up for Martin (section 5) |

## 1. Identity and phase split

| field | value | evidence |
|---|---|---|
| brand / model | Škoda / Citigo | E1 |
| generation_code | `AA` | E1 "Herstellerinterne Baureihenbezeichnung AA" |
| segment | A (C1) | — (ADAC places it in the Kleinstwagen class; no segment-A precedent in the catalog) |
| origin_country | `czech` (brand convention; built by VW in Bratislava, E9) | live Škoda models |
| platform_code | `NSF` (C2) | E9 (journalist, not manufacturer) |
| chassis | monocoque | — |
| bodies | Hatchback 3-door, Hatchback 5-door; **4 seats** on every variant | E1 "Türanzahl 3 / 5", "Sitzanzahl 4"; E3 "available as a three-door or five-door model" |
| drive | front wheels, every variant | E1 "Antriebsart Vorderrad"; E3 "drive the front wheels" |

ADAC splits the generation into two sections (E1):

| ADAC section | build (ADAC, DE) | proposed `phase_label` | proposed years |
|---|---|---|---|
| "Citigo 1. Generation" — "Citigo (AA) (06/12 - 05/17)" | 06/2012 – 05/2017 | `Pre-facelift` | **2011** – 2017 (C7) |
| "Citigo 1. Generation (1. Facelift)" — "Citigo (AA) (05/17 - 06/19)" + "CITIGOe iV (AA) (01/20 - 08/20)" | 05/2017 – 06/2019; e iV 01/2020 – 08/2020 | `Facelift` | 2017 – **2020** (C8) |

Cycle: NEDC up to 08/2018 (ADAC "Euro 6b (NEFZ)"), WLTP from 09/2018 (ADAC "Euro 6d-TEMP (WLTP)"; SK list
01/2019 values "podľa … WLTP", E4) and for the e iV (E5, E6).

Inside each phase ADAC has **emission stages** with otherwise identical engines (E1, 99 variant pages read):

| stage | build (ADAC) | ADAC text |
|---|---|---|
| Euro 5 | 06/2012 – 05/2015 | "Schadstoffklasse Euro 5" (234255, 232565, 235441 …) |
| Euro 6 (6b) | 05/2015 – 08/2018 | "Euro 6b (NEFZ)" (247885, 277331, 277367 …) |
| Euro 6d-TEMP | 09/2018 – 06/2019 | "Euro 6d-TEMP (WLTP) 36AG-AI" (293630, 293634, 295452) |

## 2. Configuration list (pass 1) — **for Martin's approval**

All front-wheel drive, 4 seats. Gearboxes: 5-speed manual **0CF (MQ100-5F)** and 5-speed automated **ASG
(SQ100-5F, gearbox 0CT)** — Škoda SSP 093 (E7, E8). "Green tec" (stop-start + brake energy recovery) is an
equipment variant of the same engine, not a separate configuration. ASG never with G-TEC (E1: no G-TEC ASG
page; E3 "The gearbox is available for both engine variants" = the two petrol outputs).

Engine codes per C3. Torque: 95 Nm (44 / 55 kW), 90 Nm (CNG 50 kW) on every ADAC page.

### Pre-facelift (2011 – 2017)

| # | engine (code@kW) | stage | gearbox | bodies | build (ADAC, DE) | SK / CZ evidence | engine evidence |
|---|---|---|---|---|---|---|---|
| P1 | `CHYA-Euro5@44` (NEW) | Euro 5 | 5MT | 3d, 5d | 06/12 – 05/15 | CZ market from late 2011 (E9) | E1 234255; E10 "CHYA … 44 … EU5" |
| P2 | `CHYA-Euro5@44` | Euro 5 | ASG | 3d, 5d | 06/12 – 05/15 | CZ: ASG "pro obě verze … (44 a 55 kW)", 03/2013 (E11) | E1 232565, 232570 |
| P3 | `CHYB-Euro5@55` (NEW) | Euro 5 | 5MT | 3d, 5d | 06/12 – 05/15 | as P1 | E1 231810…; E10 "CHYB … 55 … EU5" |
| P4 | `CHYB-Euro5@55` | Euro 5 | ASG | 3d, 5d | 06/12 – 05/15 | E11 | E1 232567, 232573 |
| P5 | `CPGA-Euro5@50` (NEW, CNG) | Euro 5 | 5MT | 3d, 5d | 02/13 – 05/15 | **none found** (C9) | E1 235441, 235447 "Motorcode *CPG*" |
| P6 | `CHYA@44` (REUSE) | Euro 6 | 5MT | 3d, 5d | 05/15 – 05/17 | none found (C9) | E1 247885, 247921 |
| P7 | `CHYA@44` | Euro 6 | ASG | 3d, 5d | 05/15 – 05/17 | none found (C9) | E1 247894, 247926 |
| P8 | `CHYB@55` (REUSE) | Euro 6 | 5MT | 3d, 5d | 05/15 – 05/17 | none found (C9) | E1 247901, 247933 |
| P9 | `CHYB@55` | Euro 6 | ASG | 3d, 5d | 05/15 – 05/17 | none found (C9) | E1 247906, 247938 |
| P10 | `CPGA@50` (NEW, CNG) | Euro 6 | 5MT | 3d, 5d | 05/15 – 05/17 | none found (C9) | E1 247913, 247945 |

### Facelift (2017 – 2020)

| # | engine (code@kW) | stage | gearbox | bodies | build (ADAC, DE) | SK / CZ evidence | engine evidence |
|---|---|---|---|---|---|---|---|
| F1 | `CHYA@44` | Euro 6 | 5MT | 3d, 5d | 05/17 – 08/18 | CZ MY2018 range (E12) | E1 277331, 277379 |
| F2 | `CHYA@44` | Euro 6 | ASG | 3d, 5d | 05/17 – 05/18 | Škoda press kit 06/2017 (E3), no SK / CZ list (C9) | E1 277338, 277386 |
| F3 | `CHYB@55` | Euro 6 | 5MT | 3d, 5d | 05/17 – 08/18 | E12 | E1 277349, 277397 |
| F4 | `CHYB@55` | Euro 6 | ASG | 3d, 5d | 05/17 – 08/18 | E3 (C9) | E1 277356, 277404 |
| F5 | `CPGA@50` | Euro 6 | 5MT | 3d, 5d | 05/17 – 08/18 | CZ "CITIGO G-TEC s pohonem na zemní plyn" 04/2017 (E12) | E1 277367, 277415 |
| F6 | `CHYA-Euro6dT@44` (NEW) | Euro 6d-TEMP | 5MT | **3d, 5d** | 09/18 – 06/19 (DE: 5d only) | **SK list 14.01.2019**: "1.0 MPI 44 kW (60 k) 5° MP" under "CITIGO 3-DVEROVÉ" and "5-DVEROVÉ" (E4) | E1 293630 |
| F7 | `CHYB-Euro6dT@55` (NEW) | Euro 6d-TEMP | 5MT | 3d, 5d | 09/18 – 06/19 (DE: 5d only) | E4 "1.0 MPI 55 kW (75 k) 5° MP" | E1 293634 |
| F8 | `CPGA-Euro6dT@50` (NEW, CNG) | Euro 6d-TEMP | 5MT | 3d, 5d | 10/18 – 06/19 (DE: 5d only) | E4 "1.0 MPI 50 kW (68 k) G-TEC 5° MP" | E1 295452 |
| F9 | `EBM-32kWh@61` (NEW, electric) | — | single-speed (`VW 0CZ`, C6) | **5d only** | 01/20 – 08/20 | **SK**: ŠA SK tech data "CITIGOe iV/61 kW" + SK price list (E5, E13); CZ tech data 25.11.2019 (E6) | E2 "Motorcode *EBM*", 61 kW, 212 Nm, 36,8 / 32,3 kWh |

**ASG is gone from SK by 01/2019:** the 14.01.2019 SK list has only "5° MP" lines (E4); in DE the last ASG was
built 05/18 (44 kW) and 08/18 (55 kW) (E1). So no ASG on the Euro 6d-TEMP rows.

**Not included:** Citigo Scout / Sport / Monte Carlo / Cool Edition / Fun / Clever / Easy (trims or editions,
pass 3); VW up! GTI (no Citigo version); the 1.0 TSI (up! only, no Citigo page in ADAC).

Count: 10 pre-facelift + 9 facelift configurations × bodies = **20 + 17 = 37 configuration rows** with option (a)
of C3; **21** with option (b) (stages merged: 5 × 2 bodies per phase + the e iV).

## 3. Decisions for Martin (pass 1 gate)

| # | question | recommendation |
|---|---|---|
| C1 | Model: segment / origin | segment **A** (first A-segment model in the catalog), origin `czech` (brand convention; the car is built in Bratislava by VW) |
| C2 | platform_code | `NSF` ("New Small Family") — only a journalist source (E9); Škoda's own documents found don't name the platform. Alternative: NULL + R |
| C3 | Emission split (rule 3 / FIELD-LEVELS): three stages with identical power and torque | **(a) split, i3 REx pattern:** Euro 6 = REUSE live `CHYA@44` / `CHYB@55`; NEW `CHYA-Euro5@44`, `CHYB-Euro5@55`, `CHYA-Euro6dT@44`, `CHYB-Euro6dT@55`, `CPGA-Euro5@50`, `CPGA@50`, `CPGA-Euro6dT@50` — 7 new combustion rows. The Euro 5 codes CHYA / CHYB are VW's own (E10); CPGA is in the workshop-manual listings (E14) but no VW document opened assigns it to a stage; a reported Euro 6d-TEMP code `DAFA` (E15, engine database) is **not used** (no VW source). (b) one row per output (Euro 6, REUSE ×2 + `CPGA@50`) with the stage change in the maintenance note — fewer rows, breaks rule 3 |
| C4 | CNG engine | first `cng` engine: `fuel_type = 'cng'`, configuration `secondary_fuel_type = 'petrol'` (ADAC "Erdgas / Super"); values per pass 2 |
| C5 | Gearboxes (rule 2b) | **5MT: reuse the `VW MQ100` stub**, completed by an UPDATE file you run (maker `Volkswagen Group`, speeds 5, alt_codes `['MQ100','0CF']` — same shape as `VW MQ200-6F` / `02U`). **ASG: new row `VW SQ100`** (family `amt`, maker Volkswagen Group, speeds 5, alt_codes `['SQ100','0CT']`) in its own reviewed migration; `audit-reference-duplicates.mjs --check-new` before writing it |
| C6 | e iV gearbox | **new row `VW 0CZ`** (single_speed, speeds 1) — VW workshop manual "1-speed gearbox 0CZ" for "e-up! 2020 ➤" (E16); it names the e-up!, not the Citigo e iV (same NSF car, ADAC motor EBM). Alternative: `generic:Single-speed EV (NSF)` |
| C7 | Pre-facelift year_from | **2011** — CZ launch late 2011 (E9); ADAC's DE build start is 06/2012. Alternative 2012 |
| C8 | e iV inside the Facelift phase | **yes, one phase 2017 – 2020** (same body; ID.3 precedent: one phase per body generation). Combustion ends 2019, e iV 2019/2020. Alternative: own phase |
| C9 | SK / CZ evidence gaps: no SK / CZ price list for 2012 – 2018 was readable (Internet Archive offline for the CDX queries; dealer copies not found) | approve P1–P10, F1–F5 on ADAC (DE) + Škoda press kits + CZ journalist (E11, E12); re-check with an SK / CZ list in pass 2 when the archive is back. Facelift ASG (F2, F4) rests on the Škoda press kit (E3) only |

## 4. Evidence

| ref | source | quote |
|---|---|---|
| E1 | ADAC Autokatalog, Škoda Citigo, 2 generation pages + 99 variant pages (ids in section 2) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/skoda/citigo/1generation/ , …/1generation-facelift/ | 234255: "Baureihe Citigo (AA) (06/12 - 05/17)"; "Herstellerinterne Baureihenbezeichnung AA"; "Motorcode *CHY*"; "Antriebsart Vorderrad"; "Getriebeart Schaltgetriebe"; "Anzahl Gänge 5"; "Schadstoffklasse Euro 5"; "44 kW (60 PS) / 95 Nm"; 232565: "Automatisiertes Schaltgetriebe"; 247885: "Euro 6b (NEFZ)"; 293630: "Baureihe Citigo (AA) (05/17 - 06/19)"; "Euro 6d-TEMP (WLTP) 36AG-AI"; 295452: "Motorcode *CPG*"; "50 kW (68 PS) / 90 Nm"; 230695: "Türanzahl 3"; "Sitzanzahl 4" |
| E2 | ADAC Autokatalog, Škoda CITIGOe iV Style (01/20 - 05/20) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/skoda/citigo/1generation-facelift/307558/ | "Baureihe Citigo (AA) (01/20 - 08/20)"; "Motorcode *EBM*"; "61"; "212 Nm"; "Reduktionsgetriebe"; "Anzahl Gänge 1"; "Türanzahl 5"; "Sitzanzahl 4"; "Batteriekapazität (Brutto) in kWh 36,8"; "(Netto) in kWh 32,3" |
| E3 | Škoda press kit "ŠKODA CITIGO", 27.06.2017 https://cdn.uc.assets.prezly.com/a42cf7d4-fd53-41a2-857f-ddda4b14697b/-/inline/no/170627-SKODA-CITIGO---Press-Kit.pdf | "The ŠKODA CITIGO is available as a three-door or five-door model."; "The gearbox is available for both engine variants as well as three trim levels (all except Easy)"; "The ŠKODA CITIGO also comes with 50 kW (68 PS) and environmentally friendly three-cylinder CNG drive."; "All engines meet the strict requirements of the EU6 emissions standard." |
| E4 | ŠKODA AUTO Slovensko, "Cenník ŠKODA CITIGO", "Platný od 14. 1. 2019 (MR 2019)" (Internet Archive 20190219053739 of https://webapps.skoda-auto.sk/Cenniky-a-katalogy/cenniky/Skoda_Citigo_cennik.pdf) | "CITIGO 3‑DVEROVÉ"; "1.0 MPI 44 kW (60 k) 5° MP"; "1.0 MPI 55 kW (75 k) 5° MP"; "1.0 MPI 50 kW (68 k) G‑TEC 5° MP"; "CITIGO 5‑DVEROVÉ"; "MP – manuálna prevodovka"; "Hodnoty emisií a spotrieb … podľa … WLTP" |
| E5 | ŠKODA AUTO Slovensko, "ŠKODA CITIGOe iV — Technické údaje" https://webapps.skoda-auto.sk/Cenniky-a-katalogy/techdata/Skoda_Citigo-iV_technickeudaje.pdf | "CITIGOe iV/61 kW"; "4-miestna, 5-dverová"; "Typ/netto kapacita (kWh) … Li-Ion/36,8"; "Dojazd … kombinovaný WLTP (km) 225 – 274" |
| E6 | Škoda Storyboard, "ŠKODA CITIGOe iV Technické údaje", 25. 11. 2019 https://cdn.skoda-storyboard.com/2019/11/TD-CITIGOe-iV-cz.pdf | "synchronní elektromotor s permanentními magnety"; "61"; "212/0–2750"; "36,8"; "pohon předních kol"; "jednostupňová"; "pětidveřová, čtyřmístná" |
| E7 | Škoda Self-Study Programme 093 "0CF five-speed manual gearbox and automated five-speed manual transmission AMT" (vd Veer copy) https://www.vdveer-engineering.nl/documents/ssp-093-0cf-five-speed-manual-gearbox-and-automated-five-speed-manual-transmission-amt/ | "The manufacturer's identification MQ100–5F refers to a new mechanical 0CF five-speed manual gearbox. The gearbox is also produced in the new robotised version SQ100–5F"; "The model Škoda Citigo is the first model of the Škoda brand fitted with the 0CF gearbox and AMT transmissions" |
| E8 | Škoda workshop manual "Automatic gearbox 0CT", Citigo 2012 ➤, Edition 12.2013 (scribd copy, search-index text only, not opened) https://www.scribd.com/document/648864699/Automatic-gearbox-0CT | "Citigo 2012 ➤ Automatic gearbox 0CT - Edition 12.2013"; "5-speed automated manual transmission 0CT … Engine 1.0 ltr./44 kW 1.0 ltr./55 kW" |
| E9 | just-auto, "Czech Republic: Skoda reveals Citigo small car" (2011) https://www.just-auto.com/news/czech-republic-skoda-reveals-citigo-small-car/ (search-index text) | "part of Volkswagen Group's new minicar range, codenamed New Small Family"; built at VW Bratislava; "launched on the Czech market in late 2011" |
| E10 | VW workshop manual up! "3-cyl. injection engine … Engine number, engine data", edition 11.2011 (workshop-manuals.com copy) https://workshop-manuals.com/volkswagen/up/power_unit/3_cyl._injection_engine_toothed_belt_drive_(4_valves)/technical_data/identification/engine_number_engine_data/ | CHYA: 44 kW / 5 500, 95 Nm; CHYB: 55 kW / 6 200, 95 Nm; 999 cm³; emission standard "EU5"; from "11.11" (read via fetch summary — re-check verbatim in pass 2) |
| E11 | Automobil Revue, "Škoda Citigo ASG: Bez námahy", 14.03.2013 https://www.automobilrevue.cz/rubriky/testy/predstavujeme/skoda-citigo-asg-bez-namahy_42034.html | "pro obě verze zážehového tříválce 999 cm3 (44 a 55 kW)"; "V obou případech činí příplatek za snadnější obsluhu 17 500 Kč" |
| E12 | Škoda Storyboard CZ, "Modernizované modely ŠKODA RAPID a ŠKODA CITIGO pro modelový rok 2018 …", 11. 4. 2017 https://www.skoda-storyboard.com/cs/tiskove-zpravy-archiv/modernizovane-modely-skoda-rapid-skoda-citigo-pro-modelovy-rok-2018-nabizeji-vice-vybavy-za-vyhodnejsi-ceny/ | "ŠKODA CITIGO je nabízena ve výbavách Active, Ambition a Style."; "Ekologickou alternativu představuje CITIGO G-TEC s pohonem na zemní plyn."; "Ambition (od 218.900 Kč)" |
| E13 | ŠKODA AUTO Slovensko, "Cenník Citigo iV" (Internet Archive 20191121133604 of https://webapps.skoda-auto.sk/Cenniky-a-katalogy/cenniky/Skoda_Citigo-iV_cennik.pdf) | capture cut at 1 MB, text unreadable — **existence only** (SK market). Re-fetch in pass 3 |
| E14 | workshopmanuals.us.com, Škoda Citigo 2011–2020 manual listing (search-index text) | "1.0L MPI G-TEC natural gas (CPGA)" — commercial listing, lead only |
| E15 | mymotorlist.com EA211 (search-index text via Perplexity) | "In 2018, with the switch to Euro 6d-TEMP" … "DAFA" — engine database, **not used** |
| E16 | VW workshop manual "1-speed gearbox 0CZ", Edition 04.2022 (kfz-verlag sample) https://dms.kfz-verlag.de/pub/more_downloads/en-ebook-vw-eup-bl1-0151.pdf | "e-up! 2014 ➤, e-up! 2017 ➤, e-up! 2020 ➤ 1-speed gearbox 0CZ - Edition 04.2022" |

## 5. R — gaps & doubts (pass 1)

| item | note | where looked |
|---|---|---|
| SK / CZ price lists 2011 – 2018 | none readable; only the SK 01/2019 list (E4) and the e iV documents | webapps.skoda-auto.sk (CDX), web search, dealer domains; Internet Archive CDX "Temporarily Offline" for most queries 2026-11-19 |
| Euro 6 / 6d-TEMP four-letter codes | ADAC gives "CHY" / "CPG" for every stage; VW's EU5 table (E10) is the only VW code source | Perplexity, web search |
| CPGA stage | CPGA named only in commercial listings (E14) | — |
| e iV gearbox | 0CZ named for the e-up! 2020 (E16), not the Citigo e iV | VW workshop manual sample, SSP 529 (not opened) |
| e iV battery | SK tech data calls 36,8 kWh "netto" (E5); ADAC 32,3 net / 36,8 gross (E2) — pass 2 (manufacturer press kit to be opened) | — |
| ASG in SK / CZ 2015 – 2018 | not shown by any SK / CZ document | — |
| Fabia NJ Facelift (side finding) | live `CHYA@44` (Euro6) also carries the 2018 – 2021 Fabia, which ADAC lists in the WLTP era — the Fabia got no Euro 6d-TEMP split | not this car's scope |

## 6. Perplexity log

| # | tool | topic | duration | outcome |
|---|---|---|---|---|
| 1 | `perplexity_ask` (high) | engine codes per emission stage, gearbox and e iV codes | not timed | EU5 CHYA / CHYB (VW manual, E10); DAFA from an engine database (not used); gearbox codes NULL |
| 2 | `perplexity_search` | SK / CZ facelift price list with ASG | short | no SK / CZ list; Gabriel.sk Fabia list (other model); leads only |
| 3 | `perplexity_search` | gearbox codes 0CF / 0CT / e-up! | short | SSP 093 (E7), 0CT manual (E8) |

**Pass 1 approved by Martin 2026-11-20: configuration list P1–P10 / F1–F9 and C1–C9 all as recommended**
(segment A, `czech`; platform `NSF`; emission split (a) — 7 new combustion rows, Euro 6 REUSE `CHYA@44` / `CHYB@55`;
first CNG engine; `VW MQ100` UPDATE + new `VW SQ100` + new `VW 0CZ`; Pre-facelift 2011–2017; e iV inside Facelift
2017–2020; ADAC / press-kit evidence accepted for 2011–2018).

## 7. Hand-over (for the pass 2 session)

- Read sections 2–3 first; continue only on Martin's approval of the configuration list and C1–C9.
- Pass 2 = section C (two bodies, the e iV body figures as R if they differ), D (7 or 3 new combustion rows per
  C3, `EBM-32kWh@61`), J per configuration (ADAC pages in E1 are already mapped in section 2; full ids:
  re-run the ADAC parse — the generation page embeds `ApilCarCollectionItem:<id>` JSON with name / fuel / kW),
  towing (SK tech data E5 shows "-" for trailer weights: need a Škoda document saying no towing for `0`).
- Reference-data migrations needed before the seed: `VW MQ100` UPDATE (Martin runs), `VW SQ100` INSERT,
  `VW 0CZ` INSERT — each its own reviewed file, `audit-reference-duplicates.mjs --check-new` first.
- When the Internet Archive is back: CDX for `webapps.skoda-auto.sk/Cenniky-a-katalogy/cenniky/Skoda_Citigo_cennik.pdf`
  (earlier captures, 2012 – 2018) and `…/Skoda_Citigo-iV_cennik.pdf` (a full capture); use the `…/web/<ts>id_/<url>` form.
- ADAC pages fetch fine with `curl -A "Mozilla/5.0"`; fields are `Motorcode`, `Schadstoffklasse`, `Getriebeart`
  after stripping tags.

---

# Pass 2 — technical data (2026-11-20)

Sources: ADAC Autokatalog, **all 330 variant pages** read (293 after dropping the CNG "Benzinbetrieb" duplicates;
values from the page's `ApilTechnicalData` JSON), ŠA SK brochure 02/2019, Škoda press kit 06/2017, Škoda CZ e iV
tech data 11/2019, Škoda e iV press kit, Škoda owner's manual. Perplexity: 1 more call (4 of 8 for the car).
No DB writes.

## 8. Decisions for Martin (pass 2 gate)

| # | topic | finding | recommendation |
|---|---|---|---|
| T1 | towing | Škoda owner's manual: "The vehicle is not approved for towing a trailer. The vehicle is not factory-equipped with a towing device and it cannot be retrofitted with a towing device." (E21); ADAC has no trailer load on any of the 294 pages; SK e iV tech data "-" (E5) | **`towing_capacity_kg = 0` both phases**; configuration towing N/A; nose_weight N/A |
| T2 | facelift dimensions | Škoda 3 597 / 1 641 (5d 1 645) / 1 478 (E3, E22); ADAC still prints the pre-facelift 3 563 / 1 641 / 1 489 on every facelift page | **Škoda figures** |
| T3 | pre-facelift height | ADAC 1 489 on every page; Škoda 2017: "Its width (1,645 mm – five-door model) and height (1,478 mm) remain unchanged" (E3) | **1 478** (manufacturer, by the "unchanged" sentence); ADAC 1 489 in R |
| T4 | facelift weights | SK brochure 02/2019 (WLTP era) EU 934 / 936 / 940 / 1 033 kg, GVW 1 330 / 1 380 (E22); ADAC 2017–18 cars EU 929–931, GVW 1 290–1 300; ADAC 09/18+ EU 940, GVW 1 290 | body: **brochure 934 / 1 330 / payload 396** (GVW − EU curb, ID.3 convention); configurations: ADAC EU for the 2011–08/2018 rows, brochure EU for the 09/2018+ rows |
| T5 | CNG figure units | ADAC NEDC "2,9 kg/100 km" + 79 / 82 g/km; WLTP "5,6 kg/100 km" + 101 g/km. Škoda 2017 press kit: "only 4.5 kg of natural gas per 100 km … 82 g of CO2/km" — 82 g fits ~3 kg, so 4.5 reads as m³ labelled kg | **ADAC kg figures**, stored in `fuel_consumption_l100km` (no kg column exists) with `secondary_fuel_type = 'petrol'` and petrol-mode NEDC **4,4 l** (ADAC Benzinbetrieb pages; WLTP petrol-mode NULL). Flag: the app and `ultra_efficient` read that column as litres — schema follow-up |
| T6 | CNG tanks | ADAC 12 kg CNG (2013–08/2018), 11 kg (09/2018+, = brochure "11 kg +10 l"), petrol 10 l | G-TEC configurations `fuel_tank_capacity_liters = 10` (the petrol tank); CNG kg in R |
| T7 | e iV on the shared 5-door body | e iV 3 597 / 1 645 / 1 481, clearance 141, boot 250 / 923, EU 1 235, GVW 1 530 (E6) — all differ from the petrol 5-door | body row = petrol figures; e iV figures in R (i3s precedent); configuration curb 1 235. **Gap:** configuration `fuel_tank_capacity_liters` NULL means "use the body's 35 l" and 0 fails the CHECK, so the e iV inherits a 35 l tank — schema / code follow-up, not solvable in this seed |
| T8 | consumption / performance source | Škoda gives single values only for the 2017 MT cars (press kit) and WLTP **ranges** for 09/2018+ (brochure 4,8–5,6 l, 110–127 g for 44 kW); ADAC gives one value per variant | NEDC rows: ADAC base variant (no Green tec, 165/70 R14), except 2017–18 MT 0–100 / top speed from the press kit; WLTP rows: ADAC single value (inside the Škoda range), Škoda 0–100 / top speed. Green tec figures in R |
| T9 | engine oil capacity | not in any document opened; the live `CHYA` / `CHYB` rows carry 3,4 l with no recorded source | NULL on the 7 new rows (pass 4, service data), unless you want 3,4 copied from the live rows |
| T10 | SK brochure 02/2019 lists "55 kW (75 k) 5° ASG" (WLTP, 121,2–135,4 g/km); the SK price list 01/2019 has no ASG line | price list = what was offered | **no ASG on the Euro 6d-TEMP rows** (pass-1 list unchanged); brochure line in R |

## 9. Data (pass 2)

### 9a. Phase

| field | Pre-facelift | Facelift | evidence |
|---|---|---|---|
| generation_code / platform / chassis | AA / NSF / monocoque | same | E1, E9 |
| consumption_cycle | NEDC | NEDC (05/17–08/18), WLTP (09/18+, e iV) — per configuration | E1, E4 |
| towing_capacity_kg | 0 | 0 | E21 (T1) |

### 9b. Bodies (C)

| phase | body | L / W / H | clearance | EU curb (lightest) | GVW | payload | boot / max | seats | tank | roof | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Pre-facelift | Hatchback 3-door | 3 563 / 1 641 / 1 478 | 136 | 929 | 1 290 | 361 | 251 / 951 | 4 | 35 | 50 | E1 (230695), E3 (T3) |
| Pre-facelift | Hatchback 5-door | 3 563 / 1 645 / 1 478 | 136 | 929 | 1 290 | 361 | 251 / 959 | 4 | 35 | 50 | E1 (231810), E3 "959 l in the five-door" |
| Facelift | Hatchback 3-door | 3 597 / 1 641 / 1 478 | 136 | 934 | 1 330 | 396 | 251 / 951 | 4 | 35 | 50 | E22, E1 (roof) |
| Facelift | Hatchback 5-door | 3 597 / 1 645 / 1 478 | 136 | 934 | 1 330 | 396 | 251 / 959 | 4 | 35 | 50 | E22, E3 |

Clearance: ADAC "Bodenfreiheit maximal 136 mm" and SK brochure "Svetlá výška (mm) 136, G-TEC: 134" (ADAC G-TEC 121).
Seats 4: ADAC "Sitzanzahl 4" on every page, SK brochure "4-miestne CITIGO" (its tech table's "päťmiestna" is a slip).
ISOFIX is pass 3.

### 9c. Engines (D) — all 999 cm³ L3, timing belt, port injection; has_dpf / has_adblue false

| code@kW | fuel | stage | torque | display_name | evidence |
|---|---|---|---|---|---|
| `CHYA-Euro5@44` | petrol | Euro5 | 95 | 1.0 MPI 44kW (Euro 5) | E1 "Euro 5", "Zahnriemen", "Einspritzung", "999 ccm"; E10; E22 "zážihový motor s viacbodovým vstrekovaním paliva" |
| `CHYA@44` (REUSE) | petrol | Euro6 | 95 | live | E1 "Euro 6b (NEFZ)" |
| `CHYA-Euro6dT@44` | petrol | Euro6d-TEMP | 95 | 1.0 MPI 44kW (Euro 6d-TEMP) | E1 293630 |
| `CHYB-Euro5@55` | petrol | Euro5 | 95 | 1.0 MPI 55kW (Euro 5) | E1, E10 |
| `CHYB@55` (REUSE) | petrol | Euro6 | 95 | live | E1 |
| `CHYB-Euro6dT@55` | petrol | Euro6d-TEMP | 95 | 1.0 MPI 55kW (Euro 6d-TEMP) | E1 293634 |
| `CPGA-Euro5@50` | cng | Euro5 | 90 | 1.0 MPI G-TEC 50kW (Euro 5) | E1 235441 "Motorart Gas", "Erdgas", "90 Nm" |
| `CPGA@50` | cng | Euro6 | 90 | 1.0 MPI G-TEC 50kW | E1 247913 |
| `CPGA-Euro6dT@50` | cng | Euro6d-TEMP | 90 | 1.0 MPI G-TEC 50kW (Euro 6d-TEMP) | E1 295452 |
| `EBM-32kWh@61` | electric | N/A | 212 | CITIGOe iV 61kW (32.3 kWh) | E2, E6 "212/0–2750" |

e iV: battery net **32,3** kWh (E23; the SK tech data calls 36,8 "netto" — that is the gross figure, R), max AC **7,2**,
max DC **40** (E24; CCS standard on Style, option on Ambition, E23; standard on the one SK trim, E13b), battery thermal
management **NULL**, heat pump **NULL** (not found). has_gpf NULL on the new rows (ADAC "Partikelfilter" empty; the live
Euro 6 rows say false). Oil capacity NULL (T9).

### 9d. Configurations (J) — front-wheel drive; base variant = no Green tec, 165/70 R14

| # | engine | gearbox | bodies | cycle | consumption | CO₂ | curb (EU) | 0–100 | top | evidence (ADAC id 3d / 5d) |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | CHYA-Euro5@44 | 5MT | 3d, 5d | NEDC | 4,5 l | 105 | 929 | 14,4 | 161 | 230695 / 231810 |
| P2 | CHYA-Euro5@44 | ASG | 3d, 5d | NEDC | 4,4 l | 103 | 932 | 14,4 | 161 | 232565 / 232570 |
| P3 | CHYB-Euro5@55 | 5MT | 3d, 5d | NEDC | 4,7 l | 108 | 929 | 13,2 | 171 | 230696 / 231811 |
| P4 | CHYB-Euro5@55 | ASG | 3d, 5d | NEDC | 4,5 l | 105 | 932 | 13,2 | 171 | 232567 / 232573 |
| P5 | CPGA-Euro5@50 | 5MT | 3d, 5d | NEDC | 2,9 kg + petrol 4,4 l | 79 | 1 031 | 16,3 | 164 | 235441 / 235447; 235442 |
| P6 | CHYA@44 | 5MT | 3d, 5d | NEDC | 4,5 l (3d) / 4,4 l (5d) | 105 / 101 | 929 | 14,4 | 161 | 247885 / 247921 |
| P7 | CHYA@44 | ASG | 3d, 5d | NEDC | 4,1 l | 95 | 931 | 15,3 | 161 | 247894 / 247926 (Green tec only) |
| P8 | CHYB@55 | 5MT | 3d, 5d | NEDC | 4,4 l | 101 | 929 | 13,2 | 171 | 247901 / 247933 |
| P9 | CHYB@55 | ASG | 3d, 5d | NEDC | 4,1 l | 95 | 931 | 13,9 | 172 | 247906 / 247938 (Green tec only) |
| P10 | CPGA@50 | 5MT | 3d, 5d | NEDC | 2,9 kg + petrol 4,4 l | 82 | 1 031 | 16,3 | 164 | 247913 / 247945; 247914 |
| F1 | CHYA@44 | 5MT | 3d, 5d | NEDC | 4,4 l | 101 | 929 | 14,4 | 162 | 277331 / 277379; E3 "4.4 l … 101 g … 14.4 seconds … 162 km/h" |
| F2 | CHYA@44 | ASG | 3d, 5d | NEDC | 4,1 l | 95 | 931 | 15,3 | 161 | 277338 / 277386 (Green tec only) |
| F3 | CHYB@55 | 5MT | 3d, 5d | NEDC | 4,4 l | 101 | 929 | 13,5 | 173 | 277349 / 277397; E3 "173 km/h … 13.5 seconds … 4.4 l … 101 g/km" |
| F4 | CHYB@55 | ASG | 3d, 5d | NEDC | 4,2 l | 97 | 931 | 13,9 | 172 | 277356 / 277404 (Green tec only) |
| F5 | CPGA@50 | 5MT | 3d, 5d | NEDC | 2,9 kg + petrol 4,4 l | 82 | 1 031 | 16,3 | 164 | 277367 / 277415; 277368 |
| F6 | CHYA-Euro6dT@44 | 5MT | 3d, 5d | WLTP | 5,1 l | 115 | 934 | 14,4 | 162 | 293630 (5d); E22 |
| F7 | CHYB-Euro6dT@55 | 5MT | 3d, 5d | WLTP | 5,1 l | 115 | 936 | 13,5 | 173 | 293634 (5d); E22 |
| F8 | CPGA-Euro6dT@50 | 5MT | 3d, 5d | WLTP | 5,6 kg (petrol-mode NULL) | 101 | 1 033 | 16,3 | 165 | 295452 (5d); E22 |
| F9 | EBM-32kWh@61 | 0CZ | 5d | WLTP | 14,8 kWh | 0 | 1 235 | 12,3 | 130 | 307558; E6 — range **252 km** (Škoda; ADAC 253) |

ADAC gives identical figures for every 3-door / 5-door pair except P6 consumption. There are no ADAC 3-door pages for
09/2018+ (DE sold the 5-door only); the SK 3-door rows use the 5-door figures (same engine, same brochure column).

## 10. Evidence added

| ref | source | quote |
|---|---|---|
| E21 | Škoda Citigo owner's manual, "Trailer operation" / "Towing a trailer" (manualslib copies of two editions, ids 1334603 p. 104 and 875335 p. 126) https://www.manualslib.com/manual/875335/Skoda-Citigo.html?page=127 | "The vehicle is not approved for towing a trailer. The vehicle is not factory-equipped with a towing device and it cannot be retrofitted with a towing device." |
| E22 | ŠKODA AUTO Slovensko brochure "Nová ŠKODA CITIGO", code "C1022- 02/19", Technické údaje (Internet Archive 20210903104034 of https://webapps.skoda-auto.sk/Cenniky-a-katalogy/katalogy/Skoda_Citigo_katalog.pdf) | "Dĺžka/šírka/výška (mm) 3 597/1 641; 1 645***/1 478"; "Pohotovostná hmotnosť EÚ* (kg) 934 1 033 936 940"; "Celková hmotnosť (kg) 1 330 1 380 1 330 1 330"; "Svetlá výška (mm) 136, G-TEC: 134"; "Objem palivovej nádrže (l) 35 11 kg +10 l"; "Zrýchlenie … 14,4 16,3 13,5 14,9"; "Maximálna rýchlosť (km/h) 162 165 173 173"; "Kombinovaný 4,8 – 5,6 5,3 – 6,1 5,0 – 5,9 5,4 – 6,0"; "4-miestne CITIGO" |
| E23 | Škoda Storyboard press kit, "ŠKODA CITIGOᵉ iV: zero-emission range of up to 260 km", 25.11.2019 https://www.skoda-storyboard.com/en/press-kits/skoda-citigo%E1%B5%89-iv-skoda-superb-iv-press-kit/skoda-citigo%E1%B5%89-iv-zero-emission-range-of-up-to-260-km/ | "36.8-kWh capacity, of which 32.3 kWh is usable"; "Using the vehicle's CCS socket – as standard in the Style trim level, and as an option for Ambition variants – drivers can connect their car to a 40-kW public quick-charging station" |
| E24 | Škoda Storyboard, "CITIGOe iV Powertrain technology", 11/2019 https://cdn.skoda-storyboard.com/2019/11/CITIGOe_iV_Powertrain_technology.pdf | "The battery can be charged from sources with a charging output of up to 7.2 kW (AC), or 40 kW (DC)" |
| E13b | ŠKODA AUTO Slovensko, "Cenník ŠKODA CITIGOe iV", "Platný od 18. 12. 2019 do vypredania zásob. (MR 2020)" (Internet Archive 20240703130442, full capture) | "Synchrónny AC elektromotor 61 kW"; "Kombinovaný nabíjací systém CCS (Combo 2) pre AC/DC" (standard equipment) — replaces E13 |
| E6 (re-read) | Škoda CZ tech data CITIGOe iV, 25.11.2019 | "Délka 3597", "Šířka 1645", "Výška … 1481"; "Světlá výška … 141"; "Objem zavazadlového prostoru 250 … 923"; "Pohotovostní hmotnost – s řidičem* 1235–1265"; "Celková hmotnost 1530"; "Maximální rychlost 130"; "Zrychlení 0–100 km/h 12,3"; "Spotřeba (WLTP) – kombinovaná 14,8"; "Dojezd (WLTP) 252" |
| E1 (pass 2) | ADAC, all variant pages (ids in 9d) | e.g. 230695: "Länge 3563 mm", "Höhe 1489 mm", "Bodenfreiheit maximal 136 mm", "Kofferraumvolumen normal 251 l", "Leergewicht (EU) 929 kg", "Zul. Gesamtgewicht 1290 kg", "Dachlast 50 kg", "Tankgröße 35,0 l", "Verbrauch Gesamt (NEFZ) 4,5 l/100 km", "CO2-Wert (NEFZ) 105 g/km", "Anhängelast gebremst 12%" (empty); 235441: "Tankgröße 12,0 kg", "Tankgröße (2.Antrieb) 10,0 l", "2,9 kg/100 km"; 235442 (Benzinbetrieb): "Verbrauch Gesamt (NEFZ) 4,4 l/100 km" |

## 11. R — gaps & doubts (pass 2)

| item | note |
|---|---|
| Green tec (stop-start) | same configuration, lower figures: e.g. P1 4,1 l / 95 g (231894), P3 4,2 l / 98 g; ASG Green tec 0–100 15,3 vs 14,4 s |
| bigger wheels | 175/65 R14 and 185/50 R16 variants carry the same ADAC figures in every group checked |
| pre-facelift height | ADAC 1 489 vs Škoda 1 478 (T3) |
| facelift weights / GVW | ADAC 929–940 / 1 290–1 300 vs brochure 934–940 / 1 330 (T4) |
| CNG | Škoda press kit "4.5 kg" (T5); WLTP petrol-mode figure not found; G-TEC clearance 134 (Škoda) / 121 (ADAC), boot 213 / 913 (921 5d), EU 1 031–1 033, CNG tank 12 / 11 kg |
| e iV body | 1 481 high, 141 clearance, 250 / 923 l, GVW 1 530, payload 295 (ADAC) — not storable on the shared body (T7) |
| e iV battery | SK tech data "netto 36,8" vs Škoda press kit 32,3 usable / 36,8 gross |
| e iV thermal management / heat pump | not found in any Škoda document opened |
| oil capacity | T9 |
| SK brochure ASG line | T10 |
| e iV range | Škoda 252 / ADAC 253 / SK tech data range "225 – 274" (by equipment) |

## 12. Perplexity log (continued)

| # | tool | topic | outcome |
|---|---|---|---|
| 4 | `perplexity_ask` | e iV battery net, AC / DC, cooling, heat pump | net / AC / DC with Škoda URLs (opened: E23, E24); cooling and heat pump NULL |

## 13. Hand-over (pass 3–4 session)

- On Martin's OK of T1–T10, passes 3–4: NCAP (Citigo / up! / Mii 2011 test; e iV?), ISOFIX (ADAC "Nur hinten mit
  Top-Tether"; SK list "dvoch detských sedačiek … ISOFIX"), trims from the SK lists (01/2019 Active / Ambition / Style;
  e iV 12/2019 one trim "iV"), faults, service (oil capacity T9), ratings for 0CF / 0CT (ASG) / 0CZ.
- ADAC parser: the page's `ApilTechnicalData` JSON → name=value; ids per configuration in section 9d. Each ADAC page also
  shows recalls and the Pannenstatistik (e.g. 295452: "Feststellbremse mechanisch").

## 14. Martin's pass-2 decisions (2026-11-20) — sources re-opened

| # | decision | verification |
|---|---|---|
| T1, T2, T4, T6, T8 | as written | — |
| T3 | **1 478** (ADAC 1 489 in R — looks like the VW up! figure) | Škoda 2017 "height (1,478 mm) remain unchanged" (E3); Honest John launch page (Martin's source) did not load (DNS / JS) — not used as evidence |
| T5 | NEDC **2,9 kg** kept. WLTP: ADAC "5,6 kg/100 km" is m³ labelled kg (101 g CO₂ ≈ 3,7 kg) — **never store 5,6**. SK brochure 02/2019 has **no kg figure**: its G-TEC column "5,3 – 6,1" is l/100 km in petrol mode (footnote "Pri verzii CNG hodnota platí pri režime jazdy na benzín"). So F8 primary consumption **NULL** (required → section-M exception), ~3,7 kg derived in R. **Seed rule:** `secondary_pair_check` needs secondary_fuel_type and secondary_consumption both NULL or both set → on F8 both NULL (or, your call, petrol-mode WLTP from the brochure range 5,3–6,1 with `secondary_fuel_type = 'petrol'`) | ADAC 295452 "5,6 kg/100 km", "101 g/km"; 295460 (Clever) "5,7 kg/100 km", "103 g/km"; 235445 NEDC "2,9 kg/100 km", "79 g/km" — re-read 2026-11-20 |
| T7 | **option A: the e iV becomes its own phase** with its own 5-door body row (real dimensions, boot, clearance; tank NULL). **Changes pass-1 C8** (e iV inside Facelift) — Facelift is now 2017–**2019**. Label → S2 | — |
| T9 | **3,4 l** service fill on all new combustion rows incl. CPGA; dry fill 3,7 l in R | cararac.com "Citigo 1.0 (44 kW)", "(55 kW)", "1.0 CNG (50 kW)": "3,4 L (service fill), 3,7 L (dry fill)" (E25, aggregator). Comma Oil 91084165 page returned HTTP 500 — not verified |
| T10 | **add F10: `CHYB-Euro6dT@55` × ASG**, 3d + 5d | autosprint.ch, 31.10.2018 (E26): "Der Citigo ist in Verbindung mit dem 75 PS starken 1,0-MPI-Motor mit dem automatisierten Schaltgetriebe ASG erhältlich" and "auf die Abgasnorm Euro 6d-Temp umgestellt" (Swiss magazine, not the importer); SK brochure 02/2019 column "55 kW (75 k) 5° ASG" (E22). The autoscout24 listing was not opened |

**F10 data (SK brochure E22):** EU 940 kg, 0–100 14,9 s, top 173 km/h, WLTP 5,4 – 6,0 l, CO₂ 121,2 – 135,4 g — a range:
**Martin picks** the end (S5). No ADAC page (DE sold no 09/2018+ ASG).

| ref | source | quote |
|---|---|---|
| E25 | cararac.com, engine oil Škoda Citigo https://cararac.com/engine_oil/skoda/citigo.html | "Citigo 1.0 CNG (50 kW)": "3,4 L (service fill), 3,7 L (dry fill)" (same on the 44 and 55 kW rows) |
| E26 | autosprint.ch, "Skoda: Stadtflitzer Citigo fit für 2019", 31.10.2018 https://autosprint.ch/?p=22534 | "Der Citigo ist in Verbindung mit dem 75 PS starken 1,0-MPI-Motor mit dem automatisierten Schaltgetriebe ASG erhältlich." |

---

# Pass 3 — safety + equipment (2026-11-20)

## 15. Decisions for Martin (pass 3 gate)

| # | topic | finding | recommendation |
|---|---|---|---|
| S1 | Euro NCAP | **2011:** 5★, 89 / 80 / 46 / 86 % — the VW up! result applied to the Citigo ("structurally identical to the Volkswagen up! … the star rating of the up! can also be applied to the Škoda CITIGO", E27). **2019 re-rating:** 3★, 81 / 83 / 46 / 55 %, published 2019-12-18, tested a VW e-up!, "Rating applies to: all CITIGOs", variants "1.0 MPI - CITIGO" and "Battery electric - CITIGOe iV" (E28); both are marked expired today | Pre-facelift **2011 5★**; Facelift and e iV **2019 3★** (Euro NCAP names the 1.0 MPI and the e iV). Alternative: 2011 on the facelift too (same structure) |
| S2 | e iV phase label (T7) | unique key (model, generation_code, phase_label); `Facelift` is taken by the 2017–2019 petrol phase | **generation_code `AA-iV`, phase_label `Facelift`**, display "CITIGOe iV" (ADAC files it as its own Baureihe "CITIGOe iV (AA)"), years 2019–2020. Alternative: `AA` + `Phase 3` |
| S3 | Pre-facelift trims | no SK / CZ price list 2011–2016 found (ŠA SK archive starts 01/2019; CZ only journalist articles: Ambition / Elegance at launch, Easy / Active from 2012) | **section-M exception: no pre-facelift trims** until a ŠA SK / CZ list turns up — or send one if you have it |
| S4 | ISOFIX | 2 outer rear seats with Top Tether; none on the front passenger seat (passenger airbag deactivation is a key switch / option) | `isofix_count = 2`, `isofix_front_passenger = false`, all phases |
| S5 | F10 consumption (T10) | brochure range 5,4 – 6,0 l / 121,2 – 135,4 g | your pick (low end = base wheels, as the other WLTP rows) |
| S6 | Seatbelt reminder | SK list: "Signalizácia nezapnutých bezpečnostných pásov na predných sedadlách" (front only) on the petrol car; the e iV list says "pre všetky sedadlá" | `seatbelt_reminders` slug only on the e iV (the slug means all seats) |

## 16. Data (pass 3)

### 16a. Safety (phase)

| field | Pre-facelift | Facelift | e iV | evidence |
|---|---|---|---|---|
| safety_rating / ncap_year | 5 / 2011 | 3 / 2019 | 3 / 2019 | E27, E28 (S1) |
| adult / child / pedestrian / safety assist % | 89 / 80 / 46 / 86 | 81 / 83 / 46 / 55 | 81 / 83 / 46 / 55 | E27, E28 |
| isofix_count / front passenger | 2 / false | 2 / false | 2 / false | E29, E30, E1 "Isofix - Bezeichnung Nur hinten mit Top-Tether" |

### 16b. Trims (H) — from ŠA SK price lists only

| phase | trim | tier | evidence |
|---|---|---|---|
| Facelift | Active | 1 | E4 (01/2019) |
| Facelift | Ambition | 2 | E4 |
| Facelift | Style | 3 | E4 |
| e iV | iV | 1 | E13b (12/2019) — the one SK trim ("CITIGOe iV … 21 190 €") |

Not trims: Monte Carlo, Fresh, Clever, Cool Edition, Fun, Sport (editions / packs; not in the SK 01/2019 list).

### 16c. Trim features (H2) — S = standard, O = optional

**Facelift — Active (standard, E4 "ZÁKLADNÁ VÝBAVA … ACTIVE")**

| feature | avail. | feature_group | slug |
|---|---|---|---|
| ESC with ABS, MSR, ASR, EDS, hill-hold (HHC) | S | — (`esc`) | esc |
| ABS | S | — | abs |
| Driver and front passenger airbags | S | airbags | airbags |
| Front side head-thorax airbags | S | airbags | airbags |
| Tyre pressure monitoring | S | wheels | tyre_pressure_monitoring |
| Emergency brake hazard-light activation | S | headlights | emergency_stop_signal (E30 "automatická aktivace varovných světel během nouzového brzdění") |
| Seatbelt warning, front seats | S | seats | — (S6) |
| Halogen headlights with daytime running lights | S | headlights | — |
| Steel wheels 5J × 14" with covers, 165/70 R14 | S | wheels | — |
| Radio BLUES, CD, Aux-In, SD slot, 2 speakers | S | infotainment | — |
| Instrument panel LOW (no rev counter, digital fuel gauge) | S | instruments | — |
| Three-spoke PUR steering wheel, height-adjustable | S | steering_wheel | — |
| Manual locking, 2 keys | S | locking | — |
| Tinted glass; rear wiper with washer | S | windows | — |
| Black mirrors and door handles | S | mirrors | — |
| Rear head restraints ×2, height-adjustable | S | seats | — |
| Tyre Fit repair kit | S | wheels | — |
| Rear parking sensors (7X1, 279 €) | O | parking | reversing_detection |
| Height-adjustable driver seat (3L1) | O | seat_adjustment | — |
| Heated front seats (PW0) | O | seat_comfort | — |
| Manual air conditioning (PHA) | O | climate | — |
| Electric front windows + remote central locking (PKA) | O | windows | — |
| Front fog lights (PW3) / with Corner (PW5) | O | fog_lights | — |
| LED daytime running lights (8IE) | O | headlights | — |
| Radio SWING colour display, 6 speakers, USB, Bluetooth (RAL) | O | infotainment | — |
| DAB (QV3) | O | infotainment | — |
| Panoramic electric sunroof (PH0) | O | windows | — |
| Passenger airbag deactivation (PE1) | O | airbags | — |

**Facelift — Ambition (adds to Active, E4 "AMBITION (NAVYŠE OPROTI ACTIVE)")**

| feature | avail. | feature_group | slug |
|---|---|---|---|
| Halogen headlights with LED daytime running lights | S | headlights | — |
| Electric front windows | S | windows | — |
| Remote central locking, 1 folding key | S | locking | — |
| Instrument panel HIGH (rev counter) | S | instruments | — |
| Height-adjustable driver seat | S | seat_adjustment | — |
| Split folding rear backrest 60:40 | S | seats | — |
| Easy Entry (3-door) | S | seats | — |
| Body-coloured mirrors and door handles | S | mirrors | — |
| Dark-tinted tail lights | S | headlights | — |
| City Safe Drive with emergency braking + rain / light sensor (PSC, 296 €) | O | light_rain_sensors | aeb |
| Cruise control with trip computer (PGR) | O | cruise | — |
| Climatronic (PHB) | O | climate | — |
| Leather multifunction steering wheel (PLD) | O | steering_wheel | — |
| Electric and heated mirrors (PW1) | O | mirrors | — |
| Smartphone holder with apps (PNC) | O | smartphone | — |
| Rear parking sensors (7X1) | O | parking | reversing_detection |
| Heated front seats (PW0) | O | seat_comfort | — |

**Facelift — Style (adds to Ambition, E4 "STYLE (NAVYŠE OPROTI AMBITION)")**

| feature | avail. | feature_group | slug |
|---|---|---|---|
| APUS alloy wheels 5J × 14", 175/65 R14 | S | wheels | — |
| Manual air conditioning with pollen filter | S | climate | — |
| Front fog lights | S | fog_lights | — |
| Electric and heated mirrors | S | mirrors | — |
| Trip computer | S | instruments | — |
| City Safe Drive with emergency braking + rain / light sensor (PSC) | O | light_rain_sensors | aeb |
| Climatronic (PHB, 279 €) | O | climate | — |
| Cruise control (PGR) | O | cruise | — |
| 15" / 16" alloy wheels (CONAN, CRUX, SERPENS, SCORPIUS) | O | wheels | — |
| Rear parking sensors (7X1) | O | parking | reversing_detection |
| Heated front seats (PW0) | O | seat_comfort | — |

**e iV — iV (E13b "ZÁKLADNÁ VÝBAVA … IV")**

| feature | avail. | feature_group | slug |
|---|---|---|---|
| ESC with ABS, MSR, ASR, EDL, HHC | S | — | esc |
| ABS | S | — | abs |
| Driver and front passenger airbags; front side + head airbags | S | airbags | airbags |
| Seatbelt warning, all seats | S | seats | seatbelt_reminders |
| Tyre pressure monitoring | S | wheels | tyre_pressure_monitoring |
| Lane Assist | S | — | emergency_lane_keeping |
| Rear parking sensors | S | parking | reversing_detection |
| Rain and light sensor | S | light_rain_sensors | — |
| Climatronic | S | climate | — |
| Cruise control | S | cruise | — |
| Height-adjustable, heated front seats | S | seat_comfort | — |
| Leather multifunction steering wheel, height-adjustable | S | steering_wheel | — |
| Radio SWING, Aux-In, SD, 6 speakers, DAB | S | infotainment | — |
| Phone holder; multimedia holder | S | smartphone | — |
| Halogen headlights with LED DRL + front fog lights | S | headlights | — |
| SCORPIUS 6J × 16" black alloys, 185/50 R16 | S | wheels | — |
| Electric front windows; SunSet rear glass | S | windows | — |
| Remote central locking | S | locking | — |
| Maxi DOT display | S | instruments | — |
| Split folding rear backrest 60:40 | S | seats | — |
| CCS (Combo 2) charging socket + Type 2 cable | S | — | — |
| Brake energy recovery | S | — | — |

Features with "—" in feature_group have no fitting group in the closed list (esc / abs / lane assist / charging) —
the slug carries them; flag if the seed needs a group on every row (FIELD-LEVELS says required).

## 17. Evidence added (pass 3)

| ref | source | quote |
|---|---|---|
| E27 | Euro NCAP 2011 Citigo result (euroncap.com 10996 does not render outside a browser; text from the 2019 record E28 and angurten.de) https://www.angurten.de/is/1317-Citigo/sicherheit | E28: "the car is structurally identical to the Volkswagen up! … Euro NCAP believes that the star rating of the up! can also be applied to the Škoda CITIGO"; angurten: "Gesamt (Sterne): 5 von 5", "Erwachsene: 89", "Kinder: 80", "Fußgänger: 46", "Assistenzsysteme: 86", "Getestetes Auto: VW up! 1.0" — percentages from a secondary site, to re-open on euroncap.com in a browser |
| E28 | Euro NCAP, Škoda CITIGO 2019 https://www.euroncap.com/en/results/skoda/citigo/39973 | "Expired 2019"; "Tested model VW e-up! 'Move Up', LHD"; "Adult Occupant 81%", "Child Occupant 83%", "Vulnerable Road Users 46%", "Safety Assist 55%"; page data: "safetyRatingStars":3, "publicationDate":"2019-12-18", "resultApplicability":"all CITIGOs", variants "1.0 MPI - CITIGO", "Battery electric - CITIGOe iV" |
| E29 | ŠA SK price list 01/2019 (E4) | "Príprava na uchytenie dvoch detských sedačiek na zadných sedadlách systémom ISOFIX"; "Deaktivácia airbagu spolujazdca PE1 56 56 56" |
| E30 | Škoda Storyboard CZ, "ŠKODA CITIGO: malá, obratná a šarmantní", 27.06.2017 https://www.skoda-storyboard.com/cs/tiskove-zpravy/skoda-citigo-mala-obratna-sarmantni/ | "příprava Isofix na vnějších zadních sedadlech (včetně upevnění TopTether), automatická aktivace varovných světel během nouzového brzdění"; "Na výběr jsou tři výbavové stupně: Active, Ambition a Style" |

## 18. Hand-over (pass 4 session)

- On Martin's OK of S1–S6: pass 4 = faults / recalls (ADAC pages list recalls per variant — e.g. 230695 "Bauzeitraum 04/2014 -
  06/2016", September 2025), ADAC Pannenstatistik, ADAC Gebrauchtwageninfo `gw0311-skoda-citigo-2012-2020-bericht.pdf`
  (open first), TÜV; service data for the engines (3,4 l agreed) and ratings for 0CF / 0CT (ASG) / 0CZ; the e iV phase's
  12 V battery / charging faults.
- Section-M exceptions so far: F8 primary consumption (T5), pre-facelift trims (S3, if approved).
- Pass-1 list now: P1–P10, F1–F8, **F10** (55 kW ASG Euro 6d-TEMP), and the e iV as its own phase (former F9).

## 19. Martin's pass-3 decisions (2026-11-20)

| # | decision | note |
|---|---|---|
| S1 | Pre-facelift 2011 5★; Facelift and e iV **2019 3★**, ncap_year 2019 (latest Euro NCAP rating naming the variant, as the Zoe facelift 2021 re-test) | R: same structure as 2011; the drop comes from newer rules (safety assist 86 → 55 %; ADAC: no AEB on the e-up!) |
| S2 | e iV phase: generation_code **`AA-iV`**, phase_label `Facelift`, display "CITIGOe iV (AA)", **2019–2020** | no third phase_label value |
| S3 | Pre-facelift: **trim names only** from the Czech launch report, no prices / equipment until an official ŠA list turns up | auto.cz 01.11.2011 (E31): "Zpočátku bude Citigo nabízeno pouze ve vyšších výbavách Ambition a Elegance, později nabídku rozšíří jednodušší verze Easy a Active." → Easy 1, Active 2, Ambition 3, Elegance 4 |
| S4 | isofix_count 2, isofix_front_passenger false, all phases | Martin cites the manual's ISOFIX table (front passenger "X X X") — not opened here; E29 / E30 / ADAC agree |
| S5 | F10 **5,4 l / 121 g** (base-wheel low end) | no ADAC page exists for any 09/2018+ ASG (all 294 pages checked), so the brochure low end stands |
| S6 | `seatbelt_reminders` on the e iV only | slug exists in `safety_features` (read 2026-11-20) |

| ref | source | quote |
|---|---|---|
| E31 | auto.cz, "Škoda Citigo: Ceny na českém trhu", 01.11.2011 https://www.auto.cz/skoda-citigo-ceny-na-ceskem-trhu-62758 | quoted above (journalist report of the ŠA CZ launch prices) |

---

# Pass 4 — reliability + service (2026-11-20)

Sources: ADAC Gebrauchtwageninfo Citigo (E32, ADAC's own breakdown statistics, TÜV summary, recalls, model history),
recall texts on all 294 ADAC variant pages, car-recalls.eu (EU Safety Gate mirror, campaign codes), BRISKODA owner
threads (read in the browser pane — the site blocks plain fetches), GoingElectric. Perplexity: 1 × `perplexity_research`
(faults, all components) → 5 of 8. No DB writes.

## 20. Decisions for Martin (pass 4 gate)

| # | topic | finding | recommendation |
|---|---|---|---|
| R1 | engine ratings | ADAC: "zuverlässige Technik"; Pannenstatistik 2022 per 1 000 cars (EZ 2012 … 2019): 24,5 / 19,1 / 18,2 / 14,0 / 8,7 / 7,6 / 3,4 / 2,4 — in ADAC's 2nd–3rd band of 5; breakdown items spark plugs 2012–2016, starter 2012 (E32) | all 9 combustion rows **4**; `EBM-32kWh@61` **4** (one recall fixed by campaign; HV-controller J497 failures are a 2020 owner-forum lead, I) |
| R2 | gearbox ratings | **ASG (VW SQ100 / 0CT): 4 owners in one BRISKODA thread** (2014 / 2015 cars, 2018–2020): loss of drive, falls out of gear, gear warning; fixes: software update, gear actuator (fault P060C), control unit (under a Škoda campaign), clutch + flywheel (E33). ADAC: "ruckartiges Anfahren und sehr langsame Gangwechsel" (E32). 0CF manual: no recurring fault verified (BRISKODA 289842 lead, 403). 0CZ: none found | **SQ100 3**, **MQ100 (0CF) 4**, **0CZ 5** |
| R3 | fault costs | only dealer / UK figures: ASG actuator "£182+vat for part, plus £460 labour", clutch + flywheel "£1,150" (E33); ADAC dealer list (DE): clutch 890, starter 460, alternator 720, front discs + pads 370, timing belt 300 € (E32) | **independent SK / CZ figures from you (M)**; until then the dealer figures stay in R, never stored |
| R4 | annual probabilities (no source gives a rate) | — | proposed below per fault, marked *proposed* — wear items 1/N where the interval is known, possible faults by the rare / occasional / common words in RESEARCH-PROCESS |
| R5 | timing belt | live `CHYA` / `CHYB` rows: 120 000 km / 8 years (no source recorded); ADAC GW: "Zahnriemen … bei km/Monate 210000/-" (E32) | new rows **210 000 km, years NULL** (ADAC); flag the live 120 000 / 8 for a source check (not changed here) |
| R6 | Takata recall 69DU | ADAC: "Parallelimporte aus 'Heißländern' (kein SAD-Import betroffen)" — SK / CZ factory-delivered cars are not in scope | **leave out**, note in R (alternative: one row with the limitation in its text) |
| R7 | live faults on the reused rows | `CHYA@44` / `CHYB@55` carry 3 unsourced faults each (ignition coil, throttle body carbon, engine mounts — no years, cost or probability) that the Citigo Euro 6 rows will show | not touched in this import; follow-up (source or remove) |
| R8 | judgement tag | ADAC: "wertstabil" (E32) | `value_retainer` — **decide in pass 5** against the market data |

## 21. Data (pass 4)

### 21a. Engines — service (D2)

| rows | oil | timing belt | rating | maintenance_note | pros / cons | evidence |
|---|---|---|---|---|---|---|
| 6 new petrol rows (`CHYA-Euro5/6dT@44`, `CHYB-Euro5/6dT@55`) | 3,4 l (T9); 15 000 km / 12 months (ADAC "Wartung 1 … 15000/12"); oil spec NULL | 210 000 km (R5) | 4 | fixed service every 15 000 km / 12 months; timing belt 210 000 km (ADAC); spark plugs a known breakdown item 2012–2016 | pros: simple naturally aspirated 3-cylinder, no turbo; good reliability record (ADAC). cons: needs revs — 75 PS version gains only at high rpm, same 95 Nm as the 60 PS (ADAC); 3-cylinder vibration (live rows) | E32 |
| 3 CNG rows (`CPGA*`) | 3,4 l; 15 000 / 12; | 210 000 km | 4 | as petrol + CNG system: tank / pipes per the national gas inspection (interval NULL — not found) | pros: low fuel cost (ADAC: 61 € vs 108–114 €/month fuel). cons: "sehr drehmomentschwach", weak performance (ADAC); boot 213 l (tank under the floor) | E32 |
| `EBM-32kWh@61` | N/A | N/A | 4 | no oil / belt / plugs; brake fluid, cabin filter, 12 V battery per service schedule — **interval not found** (NULL) | pros: strong performance for the class, low consumption (ADAC "Sehr empfehlenswert ist dagegen die Elektrovariante"). cons: 32,3 kWh limits range; 7,2 kW AC needs a 2-phase supply (ADAC "AC-Ladefunktion 1-phasig,2-phasig"; UK owners stuck at 3,6 kW, E35) | E32, E2 |

yearly_maintenance_eur (combustion, required): **M** — independent SK / CZ figure from you (ADAC dealer DE: Wartung 1/2 = 130 / 210 €).

### 21b. Gearboxes (E)

| unit | rating | reliability_note | maintenance_note | pros / cons | evidence |
|---|---|---|---|---|---|
| VW MQ100 (0CF), 5MT | 4 | no recurring fault verified | filled for life (SSP 093 "filled for life") | pros: light ("27 kg", press kit). cons: — | E7, E3 |
| VW SQ100 (0CT), 5-speed ASG | 3 | electromechanical actuators on the 0CF base; owners report loss of drive / falling out of gear, fixed by software, gear actuator, control unit or clutch (E33) | filled for life; clutch is a wear part; service interval **N/A** (no fluid service); software update first on any gear warning | pros: no clutch pedal, light (< 30 kg). cons: jerky starts, very slow shifts (ADAC); no "P" position — park in N with the handbrake (press kit) | E32, E33, E3 |
| VW 0CZ, single speed (e iV) | 5 | no fault found | filled for life (NULL — not confirmed) | — | E16 |

### 21c. Faults (I) — engine / gearbox faults carry build years (rule: units span phases)

| target | fault | years | severity | category | annual_probability | evidence |
|---|---|---|---|---|---|---|
| all 6 petrol + 3 CNG rows | Spark plugs — misfire / breakdown; replace plugs (and check coils) | 2012–2016 | minor | — | 0,02 *proposed* (occasional) | E32 "Zündkerze (2012-2016)" |
| `CHYA-Euro5@44`, `CHYB-Euro5@55`, `CPGA-Euro5@50` | Starter motor failure — car won't start | 2012 | moderate | — | 0,01 *proposed* | E32 "Anlasser (2012)" |
| same Euro 5 rows | Exhaust system defects on early cars (TÜV / ADAC) | 2012–2014 | minor | — | 0,01 *proposed* | E32 "anfällige Abgasanlage (nur frühe Exemplare)" |
| VW SQ100 (ASG) | Gear actuator / control unit / software fault — gear warning, loss of drive, falls out of gear; software update first, then actuator or TCU | 2012–2018 | critical (drive lost in traffic) | — | 0,03 *proposed* (occasional; 4 owners in one thread) | E33 |
| VW SQ100 (ASG) | Clutch and flywheel worn — loss of drive with engine light | 2012–2018 | moderate | — | 0,02 *proposed* | E33 "a bill for £1,150 for a new clutch, flywheel" |
| `EBM-32kWh@61` | HV battery controller (J497) failure — "Elektrosystem. Fahrzeug anhalten!", car immobilised; controller (sometimes wiring / modules) replaced, weeks off the road; under the 8-year battery warranty | 2020 | critical | — | 0,01 *proposed* (rare; e-up! / Mii cases, Finland) | E34; E13b "Záruka 8 rokov/160 000 km … na vysokonapäťový akumulátor" |
| vehicle, Pre-facelift | Mechanical parking brake — cable / mechanism fails (breakdown item) | 2014–2016 | minor | brakes | 0,02 *proposed* | E32 "Feststellbremse mechanisch (2014-2016)" |
| vehicle, Facelift | same (ADAC breakdown list on the facelift pages: "Feststellbremse mechanisch 2017, 2019") | 2017–2019 | minor | brakes | 0,02 *proposed* | E1 295452 |
| vehicle, Pre-facelift | Brake pads / rear drums — reduced braking at TÜV, breakdowns | 2013–2017 | minor | brakes | wear: interval NULL → 0,2 *proposed* (pads ~5 years) or your figure | E32 "Bremsbelag (2013-2018), Bremstrommel vorne/hinten (2015)"; "funktionseingeschränkte Bremsen" |
| vehicle, Facelift | Brake pads (same part) | 2017–2018 | minor | brakes | as above | E32 |
| vehicle, Pre-facelift | Wiring harness fault | 2012 | moderate | electrical | 0,005 *proposed* (rare) | E32 "Kabelbaum (2012)" |
| vehicle, Pre-facelift | Lighting defects at TÜV (bulbs, headlight aim) | — | minor | electrical | 0,1 *proposed* | E32 "Licht­mängel … des öfteren" |
| vehicle, Pre-facelift + Facelift | Water in the footwells — blocked scuttle (windscreen-gulley) drains; clear the drain holes, dry the carpets | — | minor | interior | 0,01 *proposed* | E36 (2 owners, 2013 car + one later) |

**Recalls** (vehicle faults, text starts "Recall:", cost / probability N/A, all fixed free by the campaign):

| phase | recall | built | code / alert | evidence |
|---|---|---|---|---|
| Pre-facelift | Recall: side-crash-sensor diagnosis disabled in the airbag control unit (1S0 959 655 B) — software reflashed | 14.01.2013 – 19.03.2013 | code NULL (ADAC 5/2013) | E32, E1 |
| Pre-facelift | Recall: Takata driver airbag propellant may deteriorate, inflator fragments — driver airbag replaced | 24.09.2012 – 27.06.2014 | **69KH**, Safety Gate A12/02080/24 | E37 |
| Pre-facelift | Recall: driver airbag inflator may rupture, metal fragments — driver airbag replaced | 14.05.2014 – 18.08.2016 | **69PB** (Safety Gate 9/2026; ADAC 09/2025) | E37, E1 |
| Pre-facelift + Facelift | Recall: same defect, extended production period — driver airbag replaced | 23.05.2016 – 07.12.2017 | **69PC** (Safety Gate 25/2026) | E37 |
| Pre-facelift | Recall: child-lock lever may break — rear door can open from inside | 25.11.2015 – 14.04.2016 | code NULL, A12/1023/16 | E37 |
| Pre-facelift | Recall: panoramic-roof front panel may detach (cars with sunroof) | 21.01.2016 – 19.02.2016 | code NULL, A12/1476/16 | E37, E1 |
| Pre-facelift | Recall: towing eye in the tool kit not welded correctly — towing eye replaced | 29.03.2017 – 24.04.2017 | code NULL, A12/0163/18 (ADAC: 01.10.2015 – 29.05.2017) | E37, E32 |
| e iV | Recall: damaged HV battery cells may short-circuit, fire risk — battery replaced | 11.05.2020 – 24.06.2020 | **93J5**, A12/00136/21 | E37 |

Left out: Takata 69DU (R6).

### 21d. Car-level pros / cons (K)

- pros: good safety equipment for the class (2011 result); generous front space; reliable (ADAC, TÜV "überdurchschnittlich oft mängelfrei"); compact, easy to see out of; e iV fun and frugal.
- cons: tighter rear seats, average boot, 4 seats only; no towing; ASG automatic jerky and slow; CNG version weak; e iV: no automatic emergency braking (ADAC "Ein automatischer Notbremsassistent … ist nicht verfügbar").

## 22. Evidence added (pass 4)

| ref | source | quote |
|---|---|---|
| E32 | ADAC Gebrauchtwageninfo "Skoda Citigo (2012-2020)" https://assets.adac.de/Autodatenbank/GWInfo/gw0311-skoda-citigo-2012-2020-bericht.pdf | "zuverlässige Technik, wertstabil"; "anfällige Abgasanlage (nur frühe Exemplare), träge Automatikgetriebe, schwacher Erdgasmotor"; "Häufige Bauteilfehler Anlasser (2012), Bremsbelag (2013-2018), Bremstrommel vorne/hinten (2015), Feststellbremse mechanisch (2014-2016), Kabelbaum (2012), Zündkerze (2012-2016)"; "Zahnriemen 300 … 210000/-"; "Kupplung 890"; "Wartung 1 130 … 15000/12" |
| E33 | BRISKODA, "ASG Citigo help please!", 2018-09-20 – 2020-10-31 (browser pane) https://www.briskoda.net/forums/topic/455758-asg-citigo-help-please/ | 2014 Elegance: "broken down on 3 separate occasions"; "fault code P060C and need the physical adjustor replaced, £182+vat for part, plus £460 labour"; 2015 SE: "there was no drive"; "a bill for £1,150 for a new clutch, flywheel"; another: "it falls out of gear … they replaced the control unit for the gearbox, without charge as it was a Skoda 'recall'"; 2014: "updated the software. It went wrong again" |
| E34 | GoingElectric, "VW e-up 2020 … Fehler: Elektrosystem. Fahrzeug anhalten!", posts 07–08.10.2020 https://www.goingelectric.de/forum/viewtopic.php?t=56469&start=340 | "We have at least 6 known cases of this battery death in Finland." "The typical issue is with the J497 controller inside the battery and several cars have been successfully fixed by replacing just that" |
| E35 | BRISKODA, "Any Citigo-e IV user", 2020-09 – 2021-01 (browser pane) https://www.briskoda.net/forums/topic/483719-any-citigo-e-iv-user/ | "home charging being limited to 3.6kW (16A)"; "the same 3.6KW limit even though I definitely have a 7.2KW cable" — UK single-phase supply; not stored as a fault (SK / CZ wallboxes are 2-/3-phase) |
| E36 | BRISKODA, "Love my Citigo... but water, water everywhere!", 2017-09 – 2020-01 (browser pane) https://www.briskoda.net/forums/topic/437938-love-my-citigo-but-water-water-everywhere/ | 2013 Elegance: "mat and carpet completely sodden"; "Unblocked plenum chamber drainage holes and so far so good"; second owner 2019: "Car getting soaked" |
| E37 | car-recalls.eu (EU Safety Gate mirror), Citigo recalls https://car-recalls.eu/?s=citigo | "manufactured between 24 September 2012 and 27 June 2014. Skoda recall code: 69KH"; "manufactured between 14 May 2014 and 18 August 2016 … vehicles manufactured from 23 May 2016 to 7 December 2017. The manufacturer uses the code 69PC"; "manufactured between 11 May and 24 June 2020. Skoda recall code: 93J5"; child lock "25. 11. 2015 to 14. 4. 2016"; sunroof "21 January and 19 February 2016"; towing eye "29. 3. 2017 – 24. 4. 2017" |

## 23. R — gaps (pass 4)

| item | note |
|---|---|
| repair costs | all fault costs need your SK / CZ figure (R3); dealer / UK figures in E32, E33 |
| probabilities | all *proposed* — no source states a rate |
| oil spec, CNG tank inspection interval, e iV service interval | not found in a Škoda document |
| 0CF selection fault | BRISKODA 289842 (2013, 2 owners: 1st / reverse hard to select) not opened (403) — not used |
| CNG regulator | Motor-Talk single owner (Mii 2015), disputed — not used |
| 12 V battery (e iV) | GoingElectric / Reddit leads, not verified — not used |
| live CHYA / CHYB | R5 (belt 120 000 / 8), R7 (unsourced faults) |

## 24. Perplexity log (continued)

| # | tool | topic | outcome |
|---|---|---|---|
| 5 | `perplexity_research` | faults — engine, ASG, 0CF, e iV, body | leads list; verified by opening: E33–E36 (BRISKODA via browser pane, GoingElectric); rest unused |

## 25. Hand-over (pass 5 + seed session)

- On Martin's OK of R1–R8 and his cost figures: pass 5 = market (SK autobazar.eu `/vysledky/osobne-vozidla/skoda/citigo/`,
  CZ sauto.cz `manufacturer_model_seo=skoda%3Acitigo`, bazos; per phase, e iV apart; record every listing id), then
  `value_retainer` (R8), then the seed.
- Reference migrations still to write before the seed: `VW MQ100` UPDATE, `VW SQ100` INSERT, `VW 0CZ` INSERT.
- Section-M exceptions: F8 primary consumption (T5), pre-facelift trim equipment (S3).

## 26. Martin's pass-4 decisions (2026-11-20)

R1, R2 as recommended. R3: dealer / UK prices stay out of the DB, **costs NULL** until Martin's SK / CZ independent
figures. R4: probabilities mapped onto the values already live (rare 0,005, occasional 0,02, common / wear 0,2) so the
Citigo buffer stays comparable — wiring 0,005, starter 0,005, exhaust 0,005, water ingress 0,005, J497 0,005; spark plugs,
parking brake, ASG actuator, ASG clutch 0,02; brake pads and TÜV lighting 0,2. R5: belt **210 000 km, years NULL** —
"first inspection, replace on condition" in the maintenance note. R6: 69DU out; 69KH / 69PB / 69PC (and every other
campaign row) carry a **VIN recall check** as pre_purchase_check. R7 follow-up. R8 decided below (a model / phase tag).

---

# Pass 5 — market (2026-11-20)

Listings read 2026-11-20; CZK at **24,469** (ECB reference rate 2026-11-20). Phase from the build date (sauto
`manufacturing_date`, else first registration; ADS text "r.v."). Sauto gives many builds as "YYYY-01" (year only): a 2017
car without a month is left out (11 cars), as are LPG retrofits (5), 4 "2022" CNG ads (no Citigo was built in 2022), one
"1.0 TSI" (no such Citigo), one duplicate, parts / damaged / price-on-request ads. Cut 10 % at each end. Countries apart.

| phase | SK (autobazar.eu SK regions + auto.bazos.sk) | CZ (sauto.cz API) | DE reference (mobile.de, damaged hidden) |
|---|---|---|---|
| Pre-facelift | **n = 25 → 2 800 / 4 700 / 6 300 €**, 26 916 – 231 782 km | n = 80 → 3 678 / 5 311 / 6 943 €, 38 169 – 232 300 km | EZ 2012–2016: 491 hits; first page 3 950 – 9 745 € |
| Facelift | n = 5 (below 10) | **n = 25 → 5 681 / 6 948 / 7 765 €**, 30 412 – 185 800 km | EZ 2018–2019 petrol: 211 hits; first page 4 980 – 13 990 € |
| e iV | n = 4: 10 999 / 14 900 / 13 900 / 13 100 € | n = 5: 10 013 – 14 263 € (median 12 256) | electric: 12 hits, 8 500 – 16 490 € |

Listing ids (price, km; "cut" = trimmed):
- **SK Pre-facelift:** ab:AeWNQVvlMYA (1 650, 334 500, cut), bz:196478421 (2 000, ?, cut), bz:196790153 (2 600, 196 000, cut),
  bz:197177565 (2 800, 231 782), ab:AeO2dlE8HkG (3 350, 145 724), bz:195901973 (3 500, 210 000), bz:197225152 (3 999, 122 000),
  ab:AeYzSmqazfL (4 000, 120 309), bz:197622871 (4 150, 162 713), bz:197234023 (4 499, 101 000), bz:196229441 (4 599, 162 812),
  ab:AmuKdsh6RYM (4 690, 155 110), ab:AmISvZENoWQ (4 700, 127 189), bz:197277104 (4 900, 80 000), ab:Ae7zr1kc-eY (4 990, 171 000),
  bz:197491330 (5 000, 120 600), bz:197560690 (5 190, ?), bz:195845474 (5 500, 105 061), ab:Aek7KqwWzc7 (5 600, 26 916),
  bz:197550797 (6 000, ?), ab:Ae2AEuI1bWh (6 100, 89 614), bz:197517103 (6 300, ?), ab:AmsDQtCXAcN (6 490, 69 148, cut),
  ab:AmsU2OMGi6R (6 550, 180 783, cut), ab:Ae6Y74qaCxJ (6 600, 72 950, cut). Merged duplicates (same car on both sites):
  bz:197575848 = ab:AmISvZENoWQ, bz:197180815 = ab:AmsDQtCXAcN, bz:197364531 = ab:AmuKdsh6RYM, bz:197456156 = ab:Aek7KqwWzc7,
  bz:196876889 = ab:Ae7zr1kc-eY. Excluded: ab:AmTOEarIQgi3 (LPG retrofit).
- **SK Facelift:** ab:Ae0b7Mmi6sj (5 600, 98 500; = bz:197694004), ab:AePLh76RYFk (5 999, 83 000), ab:AeOFQXQz2-x (6 600, 72 027),
  bz:197686816 (6 200, 109 000), bz:197553071 (3 000, 208 000, CNG).
- **SK e iV:** ab:AeBkGH0boDo (10 999, 164 920; = bz:196667654), ab:AeELTGosXIe (14 900, 18 150; = bz:197114792), bz:197114626
  (13 900, ?), bz:197327766 (13 100, 90 000).
- **CZ Pre-facelift (sauto ids, € at 24,469):** cut low 211424250, 209153301, 211341105, 211240223, 211459416, 211460301, 205368816,
  209627412; kept 211298523 (3 678, 136 158) … 211080285 (6 943, 54 700) — 64 ids: 211298523 211383462 211387074 211148595 210812804
  210465059 211385211 211438077 211470636 211411758 210332819 209707818 211108074 211483380 209175966 211218996 210927582 210909195
  211123221 211241565 209564700 169485241 211420047 211336803 210515885 211377762 211090578 211249185 211320510 211460028 211425744
  211272450 211461048 210947103 210831317 211478100 211405755 211333170 208430387 211442976 211479609 211392720 211384317 211358766
  211081665 211077222 210557636 210717761 211153914 211446618 209256351 211398828 211367808 211343118 211220775 211172793 210703898
  211312434 210423932 211448049 211135620 211190859 211283238 211080285; cut high 210829595, 211130736, 211414908, 211351632,
  210833456, 210887291, 211324827, 210947319.
- **CZ Facelift:** cut 210012753, 210998772, 210287762; kept 209583570 (5 681, 185 800), 211036326, 211200306, 211337058, 211201716,
  211052610, 211191480, 210569462, 210848336, 211355586, 211120617, 211426359, 211276950, 211465332, 210370013, 211445040, 211475034,
  211132929, 211103199 (7 765, 50 835); cut 210940668, 211071318, 210421571.
- **CZ e iV:** 211407690 (10 013, 146 861; duplicate 211312767), 211463937 (11 443), 211344759 (12 256), 211226019 (12 260),
  211059126 (14 263).
- Left out (2017 without month): 211384821 211169202 210315701 211407765 211396116 211338210 211334994 211252020 211227120 211090935
  210948180. Excluded: 211435587 211087008 211042071 211178829 (LPG), 211365864 211365861 211365858 211134483 ("2022" CNG),
  210491882 ("1.0 TSI"), 211312767 (duplicate).

## 27. Decisions for Martin (pass 5)

| # | topic | recommendation |
|---|---|---|
| M1 | market columns | Pre-facelift **SK** 2 800 / 4 700 / 6 300 €, 26 916 – 231 782 km; Facelift **CZ** 5 681 / 6 948 / 7 765 €, 30 412 – 185 800 km (SK n = 5) |
| M2 | e iV market | fewer than 10 listings in SK (4) and in CZ (5) → **NULL + section-M exception**, or your figure (M) — e.g. SK + CZ together n = 9, 10 999 – 14 900 € |
| M3 | resale_value_rating | Pre-facelift and Facelift **holds_well** (ADAC "wertstabil"; SK 2012–2016 cars still at a median 4 700 € against SK list prices of 7 990 – 12 690 € in 01/2019); e iV **average** (SK list 21 190 € / action 19 990 € in 12/2019 → 13 100 – 14 900 € asked in SK after 6 years) |
| M4 | value_retainer tag (R8) | **yes on Pre-facelift and Facelift** (M3) — set by hand after the seed, as a judgement tag |
| M5 | Citigo engine faults on the two **shared** rows `CHYA@44` / `CHYB@55` (Fabia NJ, Polo AW also use them) | spark plugs (2012–2016) put **only on the new Citigo rows** — on the shared rows it would also show on the Fabia / Polo. The Euro 6 Citigos (2015–2016) then miss it; your call |

## 28. Seed files (for review — nothing run)

**Superseded (2026-11-20, never run, kept per rule 6b):** `20261120190000_transmission_units_citigo_sq100_0cz.sql`,
`20261120190500_transmission_units_vw_mq100_complete.sql`, `20261120191000_seed_skoda_citigo_aa.sql` — each now starts
with `SUPERSEDED — DO NOT RUN`. Replaced by the single file in section 29.

`scripts/known-distinct-reference-groups.json` gets the two groups the new rows create (VW Group manual 5:
02J / 02K / MQ100 / MQ200; VW Group single_speed 1: 0CZ / 0MH / MEB 2024). Side finding: the live groups VW Group dct_wet 6
(DQ250 / DQ400e), dct_wet 7 (DQ381 / DQ500) and the manual-5 group with MQ200 were already missing from that baseline.

Still NULL for you (required fields): fault costs (R3), combustion `yearly_maintenance_eur` (M), e iV market (M2), F8 CNG
WLTP consumption (T5), pre-facelift trim equipment (S3). *(Superseded by sections 29–34: costs and maintenance now given.)*

---

# Martin's review applied (2026-11-20)

## 29. The seed file

**One file, human-run:** `supabase/migrations/20261120210000_seed_skoda_citigo_aa.sql`, **generated** by
`scripts/generate-citigo-seed.mjs` from `scripts/seed-data/skoda-citigo-aa/` (`engines.csv`, `configurations.csv`,
`trim_features.csv`, `faults.csv`; author-data-sql skill — edit the CSV and regenerate, never the SQL). One transaction,
guards first (fails on any drift since 2026-11-20, rule 6b). It UPDATEs the shared `VW MQ100` row, so Martin runs it;
nothing goes via MCP.

| table | rows | decision |
|---|---|---|
| transmission_units | INSERT 2 (`VW SQ100` rating 3, `VW 0CZ` rating 5) | C5, C6, R2 |
| transmission_units | **UPDATE 1 shared row `VW MQ100`** (maker, speeds 5, alt_codes MQ100 / 0CF, rating 4, notes) — every model linked to it later inherits these; today no configuration uses it (guarded) | R2 |
| catalog_models | 1 (Citigo, A, czech) | C1 |
| catalog_phases | 3 (AA Pre-facelift 2011–2017, AA Facelift 2017–2019, AA-iV Facelift "CITIGOe iV (AA)" 2019–2020) | S1, S2, T1, M1, M3 |
| phase_body_dimensions | 5 (2 + 2 + e iV) | T2, T3, T4, T7, S4 |
| catalog_engines | 8 new (7 combustion, 1 EV); `CHYA@44` / `CHYB@55` reused, unchanged | C3, T9, R1, R5 |
| catalog_vehicle_configurations | 39 (incl. F10 55 kW ASG Euro 6d-TEMP × 2 bodies) | T5, T6, T8, T10, S5 |
| catalog_trims / catalog_trim_features | 8 / 78 | S3, S6 |
| catalog_component_faults | 30 (14 engine, 3 gearbox, 13 vehicle) with Martin's costs | R3, R4, R6, costs |

Changed against the superseded files: oil interval now Škoda's 30 000 km / 1 year (first service 2 years / 30 000 km);
yearly maintenance filled; R5 note text; the fault list follows Martin's cost list (exhaust split 3a / 3b, ASG split into
actuator 4a / selector module 4b / clutch 5, brakes split into front pads + discs 8a / rear shoes 8b, wiring = tailgate
hinge gaiter 9); R6 = one Takata recall check per petrol phase (Pre-facelift 69KH / 69PB / 69PC, Facelift 69PC).
**No longer seeded:** the 93J5 e iV battery recall (R6 → research notes) and the airbag-ECU software (05/2013),
child-lock lever (2015–16), sunroof panel (2016) and towing-eye (2017) campaigns — they are not in Martin's R6 / cost
list; kept in section 21c as research. Say if any should go back in.

## 30. Decisions as applied

| # | applied |
|---|---|
| T1 | towing 0 on all three phases; configuration towing NULL (N/A); nose_weight NULL |
| T2 | Facelift 3 597 / 1 641 (5-door 1 645) / 1 478 |
| T3 | Pre-facelift height 1 478. **R:** ADAC's 1 489 matches the VW up! figure, likely copied from the sister model |
| T4 | body 934 / 1 330 / payload 396 (brochure); configurations ADAC EU for 2011–08/2018, brochure EU for 09/2018+ |
| T5 | NEDC CNG 2,9 kg/100 km (Škoda's "4.5" is m³; Škoda states 4.4 m³ = 2.9 kg). WLTP CNG (F8): ADAC "5,6 kg" is m³ labelled kg — **not stored**; the SK brochure 02/2019 has **no kg value** (its G-TEC column is petrol mode) → primary NULL. **R:** "~3.7 kg derived from 101 g/km". Both secondary columns NULL on F8 (`secondary_pair_check`). CPGA is the first `fuel_type = 'cng'` engine |
| T6 | G-TEC configuration tank 10 l (petrol). **R:** CNG 12 kg (2013–08/2018) / 11 kg (09/2018+) |
| T7 | e iV own phase + own body row, tank NULL, 3 597 / 1 645 / 1 481, clearance 141, boot 250 / 923, EU 1 235, GVW 1 530 |
| T8 | as in section 9d |
| T9 | oil 3,4 l on all 7 new combustion rows incl. CPGA. **R:** dry fill 3,7 l; source Comma / oiltype.co (Martin) — the Comma page returned HTTP 500 here; cararac.com shows the same 3,4 / 3,7 for 44 / 55 kW and the 50 kW CNG |
| T10 / S5 | F10 `CHYB-Euro6dT@55` × ASG, 3-door + 5-door, WLTP 5,4 l / 121 g, EU 940, 14,9 s, 173 km/h — no ADAC page exists for any 09/2018+ ASG (all 294 checked), so the brochure low end stands. **R:** not in the SK 01/2019 price list; sold in CH / DE (autosprint.ch 31.10.2018; DE listings), DE imports reach SK / CZ |
| S1 | Pre-facelift 2011 5★ 89 / 80 / 46 / 86; Facelift + e iV 2019 3★ 81 / 83 / 46 / 55. **R:** same structure as 2011; the drop comes from the protocol (safety assist 86 → 55 %) |
| S2 | `AA-iV` / `Facelift` / "CITIGOe iV (AA)" / 2019–2020 |
| S3 | Pre-facelift trims Easy / Active / Ambition / Elegance, names only (auto.cz, secondary source); no Style / Monte Carlo from other markets |
| S4 | ISOFIX 2, front passenger false, all phases |
| S6 | `seatbelt_reminders` on the e iV only — slug verified in `safety_features` (2026-11-20) |
| R1 | rating 4 on the 7 new combustion rows and `EBM-32kWh@61` (the 2 reused rows are already 4) |
| R2 | `VW SQ100` 3 (new), `VW MQ100` 4 (shared, UPDATE), `VW 0CZ` 5 (new) |
| R3 | dealer / UK figures in R only (E32, E33) |
| R4 | probabilities on the live scale, **all proposed**: rare 0,002 (front pipe + cat) / 0,005 (starter, rear silencer, J497, gear-selector module, tailgate wiring, water ingress); occasional 0,02 (spark plugs, ASG actuator, ASG clutch, handbrake cables); wear 0,2 (front pads + discs, rear shoes, lighting) |
| R5 | belt 210 000 km, years NULL. **R:** ADAC's 210 000 is most likely the first **inspection**, replace on condition (owners quote VW "check at 210 000"; another source says first inspection 240 000) |
| R6 | 69DU left out (heat-country imports). One recall-check row per petrol phase, probability NULL, **cost NULL instead of 0** (the `estimated_cost_eur` CHECK requires > 0, so 0 would fail); pre_purchase_check "Verify recalls 69KH / 69PB / 69PC are done (VIN check at a Škoda dealer)". e iV battery recall 93J5 (54 cars, built 11.05–24.06.2020): R only |
| R7 | flag only (section 34) |
| R8 | `value_retainer` (model tier) — pass-5 recommendation M4 yes; not in the SQL, set after the seed with your OK |

## 31. Fault costs as stored (EUR incl. VAT, independent SK / CZ garage, labour 35–45 €/h)

| # | fault | target | cost | status |
|---|---|---|---|---|
| 1 | spark plugs (+ coil check; +40–80 per coil in the fault text) | 3 Euro 5 rows + CPGA@50 | 40–75 | sourced |
| 2 | starter motor (reman) | 3 Euro 5 rows, 2012 | 135–210 | proposed (reman price unverified); **R:** used part from 70 |
| 3a | rear silencer | 3 Euro 5 rows, 2012–14 | 80–150 | proposed |
| 3b | front pipe with catalytic converter | 3 Euro 5 rows, 2012–14 | 450–1 450 | sourced (OE 352–1 345) |
| 4a | ASG clutch actuator 0CT142056x | VW SQ100 | 250–400 | sourced |
| 4b | ASG gear-selector module 0CT311097E | VW SQ100 | 950–1 050 | sourced (881,74 € OE) |
| 5 | ASG clutch kit + flywheel | VW SQ100 | 720–810 | sourced (kit 115, flywheel 407, bearing 57, 4–5 h); **R:** kit only 310–400 |
| 6 | e iV J497 (out of warranty) | EBM-32kWh@61 | NULL | M — needs one HV-workshop quote |
| 7 | handbrake cables | Pre-facelift, Facelift | 70–150 | sourced parts |
| 8a | front pads + discs | Pre-facelift, Facelift | 150–230 (pads only 60–100 in the text) | UK-derived, CZ price missing |
| 8b | rear shoes (+ wheel cylinders) | Pre-facelift, Facelift | 100–160 | sourced |
| 9 | tailgate wiring in the hinge gaiter | Pre-facelift, 2012 | 70–130 | proposed — confirm ADAC "Kabelbaum" means the tailgate |
| 10 | lighting (H4 bulbs, aim) | Pre-facelift, Facelift | 25–40 | proposed |
| 11 | water in the footwells | Pre-facelift, Facelift | 20–200 | proposed |
| — | Takata recall check | Pre-facelift, Facelift | NULL (campaign is free) | R6 |

Wear-items rule: only predictable wear is spread per year (the 0,2 rows); every other fault shows as "can happen,
costs X".

## 32. Maintenance as stored

- yearly_maintenance_eur: petrol **100–140**, CNG **140–190** (CNG uplift proposed, from the ADAC ratio 210 vs 130); e iV N/A.
- Oil 3,4 l; Škoda interval: first basic service 2 years / 30 000 km, then every 30 000 km or 1 year → stored as
  30 000 km / 12 months, the first-service exception in maintenance_note.
- Brake fluid first after 3 years, then every 2 years (owner's manual), 40–60 € per change — in maintenance_note.
- Brake pads / shoes: wear-based, no time interval.

## 33. Open items — blockers before the seed passes the intake gate

| item | status |
|---|---|
| CNG tank material — Gemini claims steel (rust → STK fail → 1 500 €+), automach.cz (2026) says composite | **no CNG-tank fault row** until ADAC, a workshop manual or the tank supplier settles it |
| J497 repair cost (cost 6) | NULL — needs one HV-workshop quote |
| front pads + discs CZ price (8a) | UK-derived figure stored |
| reman starter SK / CZ price (2) | proposed figure stored |
| tailgate harness confirmation (9) | ADAC only says "Kabelbaum (2012)" |
| SK brochure WLTP kg value for CNG (T5) | the brochure has none → F8 primary consumption NULL (section-M exception) |
| e iV phase has **no vehicle-level fault** now that 93J5 is research-only — FIELD-LEVELS requires ≥ 1 per phase | put 93J5 back as a vehicle row, or a section-M exception |
| market (pass 5) | done (sections 26–27); M1–M5 still need your OK; e iV market NULL (M2) |
| pre-facelift trim prices / equipment | section-M exception until an official ŠA SK / CZ list (S3) |

## 34. Follow-ups (no SQL in this import)

- **Schema:** CNG kg vs l/100 km — `fuel_consumption_l100km` holds kg on the CNG rows (the LPG `CHGA` precedent stores
  LPG litres there; no `CHGA` row was found live on 2026-11-20); the app and `ultra_efficient` read it as litres → a kg
  column or a unit flag.
- **Code / schema:** a BEV configuration inherits its body's fuel tank (NULL = use the body's value, 0 fails the CHECK) —
  solved here only by giving the e iV its own phase.
- **Source check:** the live EA211 engine rows carry an identical 120 000 km / 8-year timing belt (12 rows among CHYA,
  CHYB, CHZB, CHZC, CHZD, DLAA, DLAB, read 2026-11-20) — looks like an unsourced default.
- **Source or remove:** the 3 unsourced faults each on `CHYA@44` / `CHYB@55` (ignition coil, throttle body carbon, engine
  mounts).
- `scripts/known-distinct-reference-groups.json` was missing the live VW dct_wet 6 / 7 groups (pre-existing).

## 35. Open items resolved and M1–M5 applied (Martin, 2026-11-20)

Regenerated `20261120210000_seed_skoda_citigo_aa.sql` (same file, nothing run): 8 engines, 39 configurations, 78 trim
features, **31 faults** (13 engine, 3 gearbox, 15 vehicle). Supersedes the blocker table in section 33.

| item | applied | source check |
|---|---|---|
| 1 CNG tank | material **steel, under the floor**. NEW fault "CNG tank / valve corrosion found at the gas-system inspection" on **each CPGA row** with build years — `CPGA-Euro5@50` 2013–2015, `CPGA@50` 2015–2018, `CPGA-Euro6dT@50` 2018–2019; component engine, category NULL, probability 0,002 (rare), cost NULL (replacement unsourced), pre-purchase check "Inspect CNG tank surface and valve seats for corrosion; ask for the last gas-system inspection record." | gibgas.de, Škoda Citigo 1.0 G-TEC (opened 2026-11-20) https://www.gibgas.de/Fahrzeuge/Auslaufmodelle/Skoda-Citigo-1.0-G-TEC?id=102 : "Erdgastank: Stahl, Unterflur"; "Tankinhalt: 11 kg 10 l"; "Alle Angaben sind Herstellerangaben" |
| 2 e iV recall | NEW vehicle row 93J5 (e iV phase, category electrical), probability NULL, **cost NULL** (the cost CHECK forbids 0), pre-purchase check "Verify recall 93J5 is done (VIN check at a Škoda dealer)." — also closes the "no vehicle fault on the e iV phase" gap | E37 |
| 3 J497 | cost NULL; text adds "Repair requires opening the sealed HV battery pack (HV-certified workshop / dealer)". Martin-review item | — |
| 4 front pads + discs | **140–245 €** (pads only 60–100 € in the text), replaces the UK-derived 150–230 | skoda-parts.com (opened 2026-11-20): front disc 256×22 mm, part 1S0 615 301 L — TRW "43,05 €", alternatives "34,88 €" (Zimmermann), "50,47 €" (Brembo), up to "96,40 €" per disc, "disc brakes should always be changed in pairs"; "Brake Pads Front (8 items) … 19,06-95,54 € incl. VAT". Martin's 34,54–81,42 €/disc and ≈37 € pad set sit inside today's ranges |
| 5 starter | **70–210 €**, proposed (used part 30–50 €, part no. 02M 911 021 G; reman price unverified) | Martin's figures — part page not opened here |
| 6 wiring harness | "Wiring harness fault (location not specified by ADAC)", Pre-facelift, 70–130 € proposed, years NULL, pre-purchase check "Scan for electrical fault codes; check the wiring in the tailgate hinge gaiter." **R:** the ADAC Gebrauchtwageninfo (E32) prints "Kabelbaum (2012)" — the year is kept out of the row per Martin's text | E32 |
| 7 WLTP CNG consumption | **approved exception**: F8 primary consumption NULL. **R:** "~3.7 kg/100 km derived from 101 g/km" | — |
| M1 | Pre-facelift SK 2 800 / 4 700 / 6 300 €, 26 916 – 231 782 km; Facelift CZ 5 681 / 6 948 / 7 765 €, 30 412 – 185 800 km | section 26 |
| M2 | e iV SK + CZ combined, n = 9: **10 999 / 12 260 / 14 900 €**, **18 150 – 164 920 km**. Min / max as Martin gave them; 12 260 = median of the 9 ads; km = range of the 8 ads with a km figure. **R:** "low confidence, n=9 (SK 4, CZ 5) — revisit". The 9 ads actually span 10 013 – 14 900 € (CZ sa:211407690 at 10 013); the usual 10 % cut would give 10 999 / 12 260 / 14 263 € | section 26 |
| M3 | resale holds_well / holds_well / average | — |
| M4 | `value_retainer` on Pre-facelift + Facelift — **not in the seed; manual post-seed step** | — |
| M5 | spark plugs = **vehicle row**, category electrical, Pre-facelift phase, 2012–2016, 40–75 € (+ coil note); the four engine rows of the earlier file are gone; nothing on `CHYA` / `CHYB` | — |
| CHECK fixes | recall rows (69KH, 69PB / 69PC, 93J5) cost NULL; vehicle categories 93J5 electrical, Takata interior; CNG-tank rows engine / category NULL | generator stops on cost 0 or a category / component mismatch |

### Remaining open (Martin review, not blocking the file)

- J497 out-of-warranty cost (NULL).
- CNG tank replacement cost (NULL).
- Reman starter SK / CZ price (70–210 € proposed).
- Wiring harness location (ADAC gives none; 70–130 € proposed).
- e iV market — low confidence, n = 9.
- Pre-facelift trim prices / equipment — section-M exception until an official ŠA SK / CZ list (S3).

### Post-seed steps (manual, after Martin runs the file)

1. Read back the counts (3 phases, 5 bodies, 8 engines, 39 configurations, 8 trims / 78 features, 31 faults, 2 + 1
   gearbox rows) and run `npm test`.
2. Re-run the tag-rule migrations (preview first).
3. Set `value_retainer` on the Pre-facelift and Facelift phases (M4).

## 36. What actually ran, and the top-up (2026-11-20)

Read back via MCP: the live Citigo rows are the **09adba7 seed trio** (`20261120190000` / `20261120190500` /
`20261120191000`) — 3 phases, 39 configurations, 8 trims / 78 features, 31 faults without costs (spark plugs on four
engine rows, nine recall rows), e iV market NULL, engines at 15 000 km / 12 months with no yearly maintenance, MQ100
with the extra pro "Simple cable-shift manual". `20261120210000` (270a7b0) never ran; its header now says so, and the
trio's headers say they ran.

**Top-up for Martin to run:** `supabase/migrations/20261120230000_skoda_citigo_aa_topup.sql` (one transaction, row-count
guard on every statement, expects the 31-fault live state):

- **A. INSERT 10 faults:** CNG-tank corrosion × 3 (each CPGA row), front pipe + catalytic converter × 3, ASG
  gear-selector module, spark plugs as a Pre-facelift vehicle row, rear drum shoes × 2.
- **B. UPDATE:** e iV market (M2); 7 combustion engines (30 000 km / 12 months, yearly 100–140 / CNG 140–190 €, note);
  EBM note; SQ100 note / cons; MQ100 pros; fault costs and texts (starter, rear silencer, J497, ASG actuator, ASG
  clutch, parking brake, front pads + discs, wiring, lighting, water); Takata and 93J5 pre-purchase checks.
- **C. DELETE 4:** the spark-plug engine rows (M5).
- Result: 37 faults. **Kept on purpose** (differs from `20261120210000`): Takata as three rows (69KH / 69PB / 69PC) and
  the four other live recall rows (airbag ECU 05/2013, child lock 2015–16, sunroof panel 2016, towing eye 2017) —
  delete those only on Martin's word.

Martin ran the top-up (2026-11-20; live: e iV market 10 999 / 12 260 / 14 900, 21 Citigo vehicle faults).

## 37. Pass 4 for the CITIGOe iV (2026-11-20)

Live before: e iV phase only Recall 93J5 (vehicle) and J497 (engine `EBM-32kWh@61`). The CITIGOe iV is the VW e-up!
(2020+, 32,3 kWh) / SEAT Mii electric — ADAC: "Als Alternativen sind auch die Geschwistermodelle von Seat und Skoda als
Elektrovarianten mit identischer Technik verfügbar" (E38) — so their owner patterns count. Perplexity: 1 ×
`perplexity_research` (call 6 of 8); every value below was opened (ADAC PDF by curl, GoingElectric and EV Clinic in the
browser pane).

**File for review:** `supabase/migrations/20261120233000_skoda_citigo_eiv_faults_insert.sql` — additive INSERT of 6 rows
(guards: exactly 1 live e iV vehicle fault and 1 live EBM fault). The same rows are in `faults.csv`, so the target-state
`20261120210000` now lists 37 faults. Nothing executed.

| # | target | fault | severity | years | prob. (proposed) | cost | evidence |
|---|---|---|---|---|---|---|---|
| 1 | engine EBM-32kWh@61 | AC on-board charger fails — AC refused, CCS works; charger replaced | moderate | 2020 | 0,005 (rare) | **NULL — Martin** (R: one owner quotes a ~5 000 € out-of-warranty dealer estimate, Perplexity lead, not opened) | E39 |
| 2 | vehicle e iV, electrical | 12 V battery drained, car won't wake; VW update 90R4; 12 V battery replaced | minor | 2020 | 0,2 (wear, as the ID.3) | **NULL — Martin** | E40 |
| 3 | vehicle e iV, brakes | front discs / pads corrode from little use (regen) | minor | — | 0,2 (wear) | 140–245 € **proposed** (Martin's petrol 8a; same parts family) | E41, E38 |
| 4 | vehicle e iV, brakes | rear drum brakes wear / stick | minor | — | 0,2 (wear) | 100–160 € **proposed** (petrol 8b) | E38 |
| 5 | vehicle e iV, brakes | mechanical parking brake fails | minor | — | 0,02 | 70–150 € **proposed** (petrol 7) | E38 |
| 6 | vehicle e iV, interior | driver's seat heater element fails | minor | 2020 | 0,005 (rare) | **NULL — Martin** | E42 |

ADAC Pannenstatistik 2024 for the e-up! (E38): 3,8 / 3,2 / 1,8 breakdowns per 1 000 cars for first registration
2019 / 2020 / 2021 — "leicht überdurchschnittlich"; for 2020 ADAC's bands are ≤ 1,8 / ≤ 8,1 / ≤ 14,4 …, so 3,2 sits in
the second-best band. Rating of `EBM-32kWh@61` stays 4.

**Not added (R):**
- Charging plug not released / charging stops (GoingElectric t=62378): 2 owners, different causes — lead.
- Charge-lock actuator, charge flap (single cases; flap estimate 250–300 € quoted by one owner) — leads.
- HV battery SoH 91–92 % (one owner) — not a pattern.
- VW e-up! steering-corrosion recall 48R7 (Safety Gate A12/00186/24, e-up! built 2013–2023) — **no Škoda Citigo
  equivalent found** in the Safety Gate mirror (E37 search lists none); check before adding.
- VW 93I9 e-up! battery recall = the e-up! twin of 93J5 (already live for the Citigo).
- EV Clinic e-up! "32 000 € battery repaired for 500 €" (E43) — a **2015** e-up! (old 18,7 kWh pack, interlock service
  switch), not the 2020 car; a lead for independent HV-repair pricing only.
- Heater / heat pump / A/C compressor, suspension, infotainment: no recurring pattern found.

| ref | source | quote |
|---|---|---|
| E38 | ADAC Gebrauchtwageninfo "VW e-up! (2013-2023)" https://assets.adac.de/image/upload/Autodatenbank/GWInfo/gw0485-vw-e-up-2013-2023-bericht.pdf | "Die häufigsten Probleme verursachen die Bremsen"; "wobei die meisten Pannen durch die Bremsanlage entstehen"; "Häufige Bauteilfehler Bremsbelag (2013-2019), Bremstrommel vorne/hinten (2014-2018), Feststellbremse mechanisch (2013-2019)"; "Zuverlässigkeit (Pannenstatistik 2024) … 2019 2020 2021 … 3,8 3,2 1,8"; "Geschwistermodelle von Seat und Skoda als Elektrovarianten mit identischer Technik" |
| E39 | GoingElectric, "VW e-up! lädt nicht an öffentlichen AC-Ladestationen" https://www.goingelectric.de/forum/viewtopic.php?t=70157 | "bei mir war das Ladegerät defekt!! CCS geht, weil DC direkt in die Batterie geht"; "Mein Auto konnte ebenfalls nicht mehr an AC laden. CCS hat durchgehend tadellos funktioniert. Letzte Woche wurde dann das Hochvoltladegerät erneuert." |
| E40 | GoingElectric, "12 volt batterie bei neuem skoda nach 3 wochen urlaub leer??" https://www.goingelectric.de/forum/viewtopic.php?t=71814 | "mein grad 3-monate-alter citigo … heute sprang der auf einmal nicht an"; "ein Softwareupdate mit der Bezeichnung 90R4 … Vampirverlust (zu hoher dauerhafter Stromverbrauch aus der 12V Batterie"; "12 volt batterie war kaputt und wurde erstmal ersetzt"; second owner: "Auto ging nicht auf, Bordelektronik sprang nicht an." |
| E41 | GoingElectric, "Hilfe, meine Bremsen rosten am e-Up! weg" (303 posts) https://www.goingelectric.de/forum/viewtopic.php?f=388&t=81027 | "Nach 2Jahren und 30tkm … dass meine Bremsscheiben nur teilweise arbeiten"; "Meine schauen bei vergleichbarer Fahrleistung auch so Scheiße aus"; "die Möhre bremst erst unter 10 km/h mit den Scheiben, solange Reku reicht" |
| E42 | GoingElectric, "Sitzheizung Fahrerseite defekt!!!" https://www.goingelectric.de/forum/viewtopic.php?t=72434 | "Hatte den selben Fehler vor 4 Wochen im Citigo-E. Ist auf Garantie repariert worden"; "mein Citigo hat den Fehler aktuell auch"; "Sitzheizung Fahrerseite beim Seat Mii defekt. Erstzulassung 2021"; "Fahrersitzheizung/ Heizelement wurde ausgetauscht" |
| E43 | EV Clinic, "32000€ Battery repaired for 500€ - VW eUP", 09.01.2024 https://evclinic.eu/2024/01/09/32000e-battery-repaired-for-500e-vw-eup/ | "on a 2015 VW eUp"; "the battery error was an interlock issue"; "the issue was not with the battery but with the 'service' interlock switch" |

**For Martin:** independent SK / CZ costs for rows 1, 2, 6; confirm the proposed brake costs 3–5 for the e iV.
