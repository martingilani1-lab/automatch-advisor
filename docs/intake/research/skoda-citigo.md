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
