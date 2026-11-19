# VW ID.3 (E1) completion — pass 4 (faults) done, trims and market still open

Researched 2026-11-18 by Claude Code (local session), following `docs/intake/RESEARCH-PROCESS.md`,
`docs/intake/FIELD-LEVELS.md`, the `research-car` skill and `scripts/new-car-template/RESEARCH-PACK.md`.
It continues `docs/intake/research/vw-id3-e1.md` (import of the same day). Style follows
`renault-zoe-x10-completion.md`.

**Scope of this session: item 1 of the brief (faults, pass 4) in depth.** Items 2 (trims), 3 (market
re-check) and 4 (ground clearance, facelift weights / height, 4-seat Pro S) are **not done**. What was found
for them on the way is in sections 5 and 6, and what is left is in section 8.

Evidence refs continue the import doc's numbering (E1–E20 are there; E21 onwards are here). "Found by":
**C** = Claude's own search / download; **P→C** = Perplexity lead, source opened and quote checked by Claude.

---

## 0. Martin's decisions

| # | topic | question | Claude's recommendation | status |
|---|---|---|---|---|
| X1 | new faults | 5 owner-reported patterns + 1 missed recall, all on the Pre-facelift (section 3) | add them (INSERT file) | **accepted** (Martin 2026-11-18) — live |
| X2 | battery-recall text | the live text of the two engine recall rows mixes two VW campaigns: 93MI (02/2022–08/2024, modules out of spec) and 93MF (07/2022–06/2025, overheating at a high state of charge, charge limited to 80 %). "UK R/2026/397" and the 80 % advice sit on the 93MI row, but they belong to 93MF (E27–E30) | rewrite both texts, keep the years (UPDATE file, 14 rows) | **accepted** (Martin ran the UPDATE 2026-11-18) — live |
| X3 | 12 V battery cost | ADAC paid **456 €** for a new 12 V battery on its long-term car (German VW dealer, fitted) — E22 | 456 / 456 on both 12 V rows (UPDATE file), unless you have an SK / CZ independent figure | **accepted** (Martin ran the UPDATE 2026-11-18) — live |
| X4 | costs with no source | front-suspension bushes, rear drive shaft — no out-of-warranty price found in any source | NULL ("repair price not known"), or your SK / CZ figure (source `M`) | open — **your figure welcome** |
| X5 | Facelift copies | the five patterns are documented on 2020–2022 cars only. The facelift uses the same brakes (rear drums, E33), flap and CO2 heat pump, but its cars are at most 3 years old and no owner / TÜV source for them was found | **don't copy** onto the Facelift yet (NULL over invention); re-check when TÜV data for 2023+ builds exists | open |
| X6 | ratings | motors 4, gearboxes 5 | **unchanged** — every new fault is vehicle-level (body, climate, brakes, flap); the motor rows still carry only fixed recalls, and ADAC calls the drive "zuverlässige Antriebstechnik" (E21) | open |
| X8 | costs from Martin's table (section 4b) | Martin confirmed the pasted table as his own figures (source `M`) | Martin then sent corrected figures and asked for **independent-shop prices** ("use independent shop"): 12 V **160 / 250**, charging flap **80 / 180**, rear drive shaft **150 / 300**, brakes **120 / 760** (rear drums M 120–350; front discs + pads stay ADAC 760, no independent figure) + text: sticking rear drums, VW TPI drum seal (E35). Unchanged: CO2 A/C 250 / 2 000 (M's independent 350–900 covers leaks only; compressor failure has only part / dealer prices in M; live range sourced, E23). Front wishbone bushes stay NULL. M's HV-module, inverter and eCall prices have no fault row (no pattern found, section 4) — not used. Files: `20261118220000` (dealer-topped) **ran** on 2026-11-18 although marked superseded; `20261118223000` then rolled back on its guard (changed nothing, now SUPERSEDED); `20261119090000_vw_id3_e1_fault_costs_independent_topup.sql` moves the live rows the rest of the way (12 V max 456 → 250, flap 110 / 227 → 80 / 180, shaft max 280 → 300; brakes already right) — UPDATE, Martin runs | **accepted** (Martin 2026-11-18) — top-up file written 2026-11-19, not run |
| X7 | not filed | HV PTC air heater (one blog), refrigerant error B1903F0 on 2024+ cars (3 owners, 2026), water ingress, motor whine, on-board charger, GPS antenna (single cases) | leave out, listed in section 4 | open |

**Migration files (2026-11-18), both written for review, nothing run:**
- `supabase/migrations/20261118200000_vw_id3_e1_faults_insert.sql` — 6 new vehicle-fault rows (X1; additive
  INSERT, may run via MCP once you have reviewed it).
- `supabase/migrations/20261118200500_vw_id3_e1_completion_updates.sql` — recall texts (X2, 14 rows) and the
  12 V cost (X3, 2 rows). UPDATE: **you run it**. Written against the live rows of 2026-11-18; if it waits
  more than a day, its guards are re-checked first (rule 6b).

After both: read back, preview then re-run the four tag-rule migrations, `npm test`.

**2026-11-18, INSERT ran:** Martin approved; `20261118200000` ran via MCP (file unchanged since commit d26e14e).
Read back: 10 Pre-facelift vehicle faults (4 + 6), the six new rows with the costs / probabilities / years above.
Tag-rule preview (all four files in one transaction, rolled back): **nothing pending** — so no re-run needed
(tags don't read faults). `npm test` 144/144.

**2026-11-18, UPDATE ran:** Martin ran `20261118200500` (X2, X3 accepted). The first two runs did not reach the
DB (rows unchanged, no open transaction on the server); the third did. Read back: 7 rows with the 93MI text, 7 with
93MF, 0 old texts left, 12 V battery 456 / 456 on both phases, `n_tup_upd` on the table +16 (24 → 40). Fault totals
unchanged (11 vehicle, 14 engine). `npm test` 144/144. No tag rule reads faults, so no new tag preview.

---

## 1. Live rows (Supabase MCP, read-only, 2026-11-18)

Matches the seed exactly: phases `a9f3cd71…` (Pre-facelift) and `558a6aeb…` (Facelift); 9 motors rated 4; gearboxes
`VW 0MH` and `generic:Single-speed EV (MEB 2024)` rated 5; 11 configurations, each tagged `green_zone`; `isofix_3x` on
both phases; trims Easy (24 features), Pure (18), Pro (3), Pro S (1), GTX (4); **19 faults** — 14 engine (two battery
recalls × 7 motors, cost / probability NULL), 5 vehicle (12 V × 2 at 0.2, software 0.02, two recalls). Ground clearance
NULL on both bodies. No fault has a cost.

`catalog_component_faults.category` allows only `electrical`, `body_rust`, `suspension`, `steering`, `brakes`, `climate`,
`interior` for vehicle rows. There is no drivetrain system for the ID.3 (rear-wheel drive, `drivetrain_id` NULL), so the
drive-shaft fault is filed as a vehicle `suspension` row.

---

## 2. What the main sources say (pass 4)

- **ADAC Gebrauchtwageninfo ID.3 (E21)** — TÜV: "Problematisch sind am ehesten die Achsaufhängungen und die Funktion der
  Fußbremse"; ADAC Pannenstatistik "sehr gut" (rating 0.8 for 2020, 0.9 for 2021 registrations); cons "vor allem frühe
  Modelle mit erheblichen Softwareproblemen"; pros "zuverlässige Antriebstechnik". Workshop prices (German, fitted):
  "Bremsscheiben und -beläge vorne 760", "Bremsscheiben und -beläge hinten 740" (the 740 is a generic line — every ID.3 has
  rear **drums**, E33), "Wartung 1 340 … 0/24".
- **ADAC long-term test, 220 000 km (E22)**, Pro S 4-seat "Tour" bought 05/2021 — defects: rear-right drive shaft clicking
  from ~55 000 km, "Das Problem ist bei VW nicht unbekannt", fixed under warranty after two attempts, back at ~100 000 km;
  charging-flap motor "für 227 Euro erneuert"; 12 V battery 456 € (didn't cure a no-start, software 3.7 did); GPS antenna
  525 € (e-Call / navigation); front-right wishbone rubber bush with starting play at the end of the warranty; second HU at
  217 000 km "ohne Mängel". No brake or tyre defect.
- **TÜV-Report** (via E21 and press): ID.3 above average for defect-free cars; weak points axle mounts and foot brake. Not
  opened in the original (the TÜV PDF tables are paywalled); E21 is ADAC quoting it.
- **meinid.com owners' forum** — the climate thread (E23, 16 pages) and the HU thread (E24) carry the two clearest owner
  patterns, below.
- **Recalls** — EU Safety Gate (via the car-recalls.eu mirror, E26–E28), UK DVSA (E29), KBA via electrive (E30).

---

## 3. Faults — proposal (X1, X2, X3)

Frequency words → `annual_probability` as for the i3 / Zoe: rare 0.005, occasional 0.02, wear 1/N. No source gives a rate
for any of these; "occasional" is Claude's reading of "several owners in one forum thread + ADAC / TÜV naming it".
Costs are German dealer / workshop figures (none found for SK / CZ) — X3, X4.

### 3a. New rows (INSERT file)

| # | phase | category | fault (DB text) | severity | years | cost EUR | prob. | pre_purchase_check | evidence |
|---|---|---|---|---|---|---|---|---|---|
| N1 | Pre-facelift | climate | CO2 (R744) air-conditioning / heat-pump circuit loses refrigerant or the compressor fails — no cooling (and weak heating with the heat pump), message "air conditioning not working properly". VW replaced refrigerant lines (field action 87H2) and compressors (87H3) on early cars; a refill costs about 250 €, chafed lines about 2 000 €. | moderate | — (whole phase) | **250 – 2 000** | 0.02 | Run MAX A/C on the test drive: the vents must blow clearly cold within a few minutes. Ask whether VW field actions 87H2 / 87H3 were done. | E23 (P→C) |
| N2 | Pre-facelift | brakes | Brakes corrode because regenerative braking leaves them little work — front discs rust and the rear drums brake unevenly, a common reason for failing the first HU even at low mileage. | minor | — | **760** (front discs and pads, fitted; rear drums: no price) | 0.02 | Look at the front discs (rust ridges); ask for the last HU report — brake-test values per axle. | E21, E24 |
| N3 | Pre-facelift | suspension | Front suspension wears — wishbone rubber bushes get play; TÜV names the axle mounts as the ID.3's main HU finding. | moderate | — | NULL (X4) | 0.02 | Check the front wishbone bushes for play on a lift; listen for knocks over bumps. | E21, E22, E24 |
| N4 | Pre-facelift | suspension | Rear drive shaft clicks when the load changes (pulling away, manoeuvring), usually rear right; VW knows the problem — the shaft is repaired or replaced, sometimes more than once. | minor | — | NULL (X4) | 0.02 | Manoeuvre slowly forward and back with the window open and listen for a click from the rear. | E22 |
| N5 | Pre-facelift | electrical | Charging-flap actuator fails — the flap no longer opens or closes and its plastic can crack; flap with actuator replaced. | minor | — | **227** | 0.02 | Open and close the charging flap a few times with the key / app. | E22, E25 |
| N6 | Pre-facelift | electrical | Recall: ID.3 built 13.10.–6.11.2020 (VW campaign 93J9, EU Safety Gate INFO/00079/21) — the protective earth conductor on the charger may come loose, with a risk of electric shock; fixed in the campaign. | critical | 2020–2020 | N/A (recall) | N/A | Ask a Volkswagen dealer to confirm campaign 93J9 is closed for this VIN. | E26 |

Notes:
- **N1 is not a fixed recall**: the field actions covered early cars, but owners of 07/2021 builds report the same fault
  later (E23), so it stays an owner fault with a cost. The cost range is the two dealer figures in the thread (refill 250
  / 260 €; two chafed lines 2 000 € with heat pump). No out-of-warranty compressor price was found.
- **N2 cost** is ADAC's German price for front discs and pads; the column holds one figure, the text says front axle.
- **N6 vs. the live interior-light recall**: different campaigns (Safety Gate 29/2021 roof module 05/2020–01/2021 is the
  live "interior light" row; 13/2021 is the charger earth conductor).

### 3b. Changed rows (UPDATE file)

| rows | live | proposed | evidence |
|---|---|---|---|
| 7 × "Recall: ID.3 built 02/2022–08/2024 (ADAC, 03/2026; UK R/2026/397) …" | cites UK R/2026/397 and "charge to 80 % only" | "Recall: ID.3 built 02/2022–08/2024 (VW campaign 93MI, KBA 16271R; EU Safety Gate SR/00953/26, 04/2026) — high-voltage battery modules out of specification can lose range, light the yellow warning lamp and overheat while charging, with a fire risk; software update, modules checked and replaced where needed." Check: "… confirm campaign 93MI is closed …". Years 2022–2024 unchanged. | E27, E30 |
| 7 × "Recall: ID.3 built 10/2022–04/2025 (UK R/2026/150) …" | UK self-discharge campaign only | "Recall: ID.3 built 07/2022–06/2025 (VW campaign 93MF; EU Safety Gate SR/03126/26, 11/2026; UK R/2026/397) — battery cells can overheat at a high state of charge, with a fire risk; charging is limited to 80 % until the battery is checked and repaired. In the UK, cars built 10/2022–04/2025 also had a battery check for cells with raised self-discharge (R/2026/150)." Check: "… confirm campaign 93MF is closed …; a car still limited to 80 % charge has not been repaired." Years 2022–2025 unchanged. | E28, E29 |
| 12 V battery, Pre-facelift and Facelift | cost NULL | 456 / 456 (X3) | E22 |

Which motors: both campaigns fall inside the build windows of the same 7 motors already carrying the rows
(`EBJ-58kWh@150`, `EBJ-77kWh@150`, all five `EDC` / `EDF` / `EEW`). `EBJ-45kWh@110` (built 2021) and `EBJ-58kWh@107`
(to 01/2022) are outside both, as before. Note electrive (E30) gives the ID.3's own 93MI window as 24.06.2023–23.08.2024
(Safety Gate gives 17.02.2022 for the campaign as a whole); the row keeps 2022–2024, the wider one.

### 3c. Ratings (X6)

Motors stay **4**: the only motor-level faults are battery recalls fixed by campaigns (RESEARCH-PROCESS.md: a fixed recall
does not lower a rating), ADAC's breakdown figures are very good (E20, E21) and its long-term car needed no drive repair
in 220 000 km beyond the drive shaft. Gearboxes stay **5**: no reducer fault anywhere (the drive shaft is not the
reducer). The new vehicle faults are what keeps the car honest; they don't belong on the motor rows (rule 9).

---

## 4. Looked for, not filed (X7)

| topic | what was found | why not filed |
|---|---|---|
| HV PTC air heater (Z115) | one editorial blog: loud bang at cold start, heating out, "Kostenvoranschlag für Austausch: ca. 2.000 Euro", 2020–2021 builds (E31) | single source, no owner thread or VW document found; worth re-checking |
| refrigerant error B1903F0 | meinid thread 11278, 07–09/2026: three owners (two ID.3 incl. a 2024 Pro S, one ID.4), fault logged "unberechtigt", "Zur Zeit ist keine zielführende Reparatur möglich" (E32) | too new and too few; a Facelift candidate if it grows |
| water ingress | one forum post (passenger footwell), otherwise only generic template pages | no pattern |
| motor noise / whine | nothing ID.3-specific (the EV Clinic material is eGolf / ID.4 inverter crash repair) | no source |
| on-board charger | EV Clinic calls its mounting behind the rear bumper a design flaw, quotes €1 500–4 500 for repair — no failure pattern | not a fault pattern |
| charging-plug lock | one thread (plug stuck after 11 kW charge, cured by locking / unlocking); emergency release exists | not a hardware fault |
| GPS antenna | ADAC long-term car, 525 € (e-Call and navigation out) | single case |
| HV battery wear | ADAC long-term car: SoH 89 % at 220 158 km (E22) | no fault — supports the 4 |

---

## 4b. Cost table pasted by Martin (2026-11-18) — checked

A table of 11 "estimated repair costs (parts + labour)" with no source or date. Checked against this doc's evidence and
a few new searches. **None of its figures can be quoted to a source**; any use goes in as source `M` with Martin's
reason (RESEARCH-PROCESS.md), never as researched.

| row in the table | table | what the evidence says | verdict |
|---|---|---|---|
| infotainment freeze: update / ICAS3 unit | 80–150 / 1 200–1 800 | updates were free in VW's 2022 campaign (E17); no ICAS3 replacement pattern found | not used (live software row stays cost NULL) |
| Travel / Lane Assist steering wheel | 650–950 | not found as a pattern in any source read | not used |
| eCall / OCU | 120–200 / 550–850 | ADAC long-term car: GPS antenna 525 € took out e-Call (single case, E22) | not used (single case, section 4) |
| 12 V battery | 160–250 | ADAC paid 456 € at a German VW dealer (E22, live) | an independent-garage figure could set **min**, if it is Martin's (`M`) |
| inverter / HV fuse | 400–700 / 2 500–4 000 | no ID.3 pattern found (EV Clinic material is eGolf / ID.4 crash repair) | not used |
| HV battery module | 1 800–2 800 out of warranty | the module faults found are recalls (cost N/A) | not used |
| charging flap actuator | 110–180 | ADAC 227 € (E22, live) | could set **min**, if `M` |
| rear drive shaft splines cleaned / bonded | 150–280 | ADAC: shaft repaired under warranty, no price; the bonding fix appears only on an aggregator site; parts-guide prices 200–600 € per shaft are generic | live row is NULL — **usable only as `M`** |
| rear brakes seized / rusted | 120–350 | **new owner evidence**: meinid thread 6388 "Feste Bremsen" (6+ pages) — rear drums stick after standing in the wet or frost, the car jumps or won't move; a VW TPI adds a seal to the drum, done under warranty for some (E35). No ID.3 out-of-warranty price; a used-car blog says "mindestens 220 Euro" for shoes | supports N2; the text could name the sticking drums and the TPI seal (UPDATE) — cost only as `M` |
| front sway-bar end links | 90–160 | meinid thread 10748 (5 posts) is only about which brand to buy; no failure pattern | not a fault — not used |
| heat-pump R744 leak: valve / sensor + recharge | 350–900 | inside the live N1 range 250–2 000 (E23) | no change |

New evidence (belongs with section 9):

| ref | found by | source | quote |
|---|---|---|---|
| E35 | C | meinid.com thread "Feste Bremsen" https://www.meinid.com/thread/6388-feste-bremsen/ | PaulFr: "wenn ich im Regen gefahren bin dann sind am nächsten Tag die Bremsen etwas fest aber nach 2 Tagen sind die richtig fest"; TD82: "kommt mit den Trommelbremsen leider (vor allem bei Nässe und dann längeren Standzeiten) vor"; Fridolin12: "Hinten links ist offenbar die trommelbremse festgefroren"; Noname: "Gerade meinen ID.3 aus der Werkstatt geholt. Ab jetzt knallt da nichts mehr."; PaulFr: "Arbeiten wurden in der Werkstatt ausgeführt seither keine festen Bremsen mehr"; LadekarteX: "Die Trommeln werden auf der Rückseite abgedichtet" |

## 5. Trims (item 2) — what this session found, not finished

- **Internet Archive is back.** It holds `tukas.cz …/id-3-14-10-2021.pdf` (capture 2022-08-14) and
  `…/id-3-facelift-08-2023.pdf` (capture 2025-02-13), but **both captures stop at 1 048 576 bytes** (of 1 974 240 and
  ~3.7 MB). The text uses Type0 fonts whose ToUnicode maps are in the missing part, so no page can be read — nothing
  quoted from them. The two gabriel.sk PDFs (2024, 2025) have no capture at all. (E34)
- Lead, not yet opened: automobilrevue.cz "Volkswagen ID.3 na českém trhu" — CZ trim list Life / Style / Business /
  Family / Tech / Max with prices (search text: Life 1 014 900, Style 1 097 900, Business 1 106 900, Family 1 133 900,
  Tech 1 177 900, Max 1 235 900 Kč). A journalist's page, not a VW document — usable only as a lead or with your OK.
- E4–E7 stay as they are (search text only).

## 6. Other gaps (item 4) — partial

- **Ground clearance**: the ADAC Autokatalog field "Bodenfreiheit maximal" is **empty** on all 10 variant pages read
  (313859, 319026, 320811, 320814, 326861, 335151, 335648, 335649, 335652, 336644 — E33). Still NULL.
- **Rear brakes**: ADAC lists "Bremse hinten Trommel" on every one of those 10 pages, GTX / GTX Performance included (E33)
  — used for N2.
- **Facelift height**: ADAC "Höhe 1564 mm" on all six facelift pages (E33) — same as recorded in W1; no new document.
- Weights (W2) and the 4-seat Pro S note: not worked on. Side finding: ADAC 320811 (Pro 107 kW, a 2021 build) shows
  "Leergewicht (EU) 1812 kg"; the live P2 configuration has 1 805 (ADAC 317597, the 11/2020 variant). Not changed.

---

## 7. Perplexity log (budget 8 for the car; 2 used at import, 1 here = 3)

| # | tool | topic | outcome |
|---|---|---|---|
| 3 | `perplexity_ask` (domains meinid.com, goingelectric.de, adac.de, evclinic.eu, tuev-verband.de, autobild.de) | owner-reported hardware faults | one useful lead: meinid thread 1725 "Klimakompressor defekt" (opened by Claude, E23). Everything else it listed was already found or "none found". |

---

## 8. Left for the next session

1. **Trims (item 2)**: find a complete copy of the CZ 10/2021 and 08/2023 lists (other dealer sites; the archive copies
   are truncated); SK 2020–2022 trims beyond Easy; facelift `EBJ` trims before 05/2024. Decide on the automobilrevue.cz lead.
2. **Market (item 3)**: open every SK / CZ listing from the import's section 8, drop damaged / duplicate / mis-phased
   ones, record the list, refresh with the ECB rate of the day; SK / CZ / DE apart, ≥ 10 per country. Run last.
3. **Item 4**: ground clearance (VW technical data sheet — ADAC has none); facelift weights (vw.sk / vw.cz sheet,
   W2); 4-seat Pro S (payload 339–354 kg) — note in R or a con, as V6.
4. After Martin's review of this doc: run the INSERT via MCP, Martin runs the UPDATE; read back; tag-rule preview + re-run;
   `npm test`.

---

## 9. Evidence

| ref | found by | source | quote |
|---|---|---|---|
| E21 | C | ADAC Gebrauchtwageninfo "VW ID.3 (seit 2020)" https://assets.adac.de/Autodatenbank/GWInfo/gw0493-vw-id3-seit-2020-bericht.pdf | "Problematisch sind am ehesten die Achsaufhängungen und die Funktion der Fußbremse. In der ADAC Pannenstatistik sehen die Werte bisher sehr gut aus."; "vor allem frühe Modelle mit erheblichen Softwareproblemen (Updates teilweise verfügbar)"; "zuverlässige Antriebstechnik"; "Bremsscheiben und -beläge vorne 760"; "Bremsscheiben und -beläge hinten 740"; "Wartung 1 340 … 0/24"; Pannenstatistik 2024 "ADAC-Bewertung 0,8 … 0,9" |
| E22 | C | ADAC Dauertest "VW ID.3 nach 220.000 Kilometern", 10.07.2026 https://www.adac.de/rund-ums-fahrzeug/autokatalog/autotest/vw-id3-dauertest/ | "Bei etwa 55.000 Kilometern war beim Lastwechsel im Rangierbetrieb hinten rechts ein Klacken zu hören, das auf eine defekte Antriebswelle zurückgeführt wurde. Das Problem ist bei VW nicht unbekannt."; "dafür zwei Reparaturanläufe notwendig"; "kam das Klacken bei knapp 100.000 Kilometern wieder"; "Ein Tausch der 12-Volt-Batterie (456 Euro) brachte nur vermeintliche Abhilfe."; "Der Stellmotor (Dreh-Drück-Mechanismus) öffnete nicht mehr richtig, was dazu führte, dass der Kunststoff an der Ladeklappe beim Öffnen gerissen ist. Die Ladeklappe mit Stellmotor musste für 227 Euro erneuert werden."; "einzig an einem Gummilager im vorderen rechten Dreieckslenker war angehendes Lagerspiel zu sehen"; "die zweite Hauptuntersuchung mit 217.000 Kilometer ohne Mängel"; "eine defekte GPS-Antenne … Reparaturkosten: 525 Euro" |
| E23 | P→C | meinid.com thread "Klimakompressor defekt" (16 pages) https://www.meinid.com/thread/1725-klimakompressor-defekt/ | borg139: "Bei meine ID Pure mit Wärmepumpe wurde heue erfolgreich die Feldaktion 87H3 Kriterium 01 (Tausch Klimakompressor) durchgeführt."; WaermepumpenID3: "Rückrufaktion "87H2"W-Kältemittelleitungen ersetzen"; nick-tech: "neuen CO2 Klima Kompressor. Das mach einem Jahr und ca. 20.500 km"; akkuhalbvoll: "BJ 07.2021 … Klimatisierung funktioniert nicht richtig. Werkstatt aufsuchen." and "Jedenfalls hat es 260 Euro gekostet."; akkuhalbvoll: "bei mir waren es 250 Euro"; matze-pe: "Auch zwei gescheuerte Schläuche haben mit ein / Ausbau 2000€ gekostet.Hatte ich mit WäPu im Mai.Gab zwar 50% Kulanz" |
| E24 | C | meinid.com thread "Wie hat euer ID bei der HU abgeschnitten?" https://www.meinid.com/thread/5191-wie-hat-euer-id-bei-der-hu-abgeschnitten/ | blueser53: "Mein ID 3 hat nur 10500 km Laufleistung. Mir wurde die TÜV-Plakette verweigert wegen erheblicher Mängel: 1. Betriebsbremsanlage Mindestabbremsung nicht erreicht. 2. Betriebsbremse 2. Achse ungleichmäßig"; Don Low: "1. TÜV nach 3 Jahren und 42k km mit erheblichen Mängeln (defekt an VA) nicht bestanden."; ID-Smiley: "Rostansatz bei den vorderen Scheibenbremsen"; most posters: passed "ohne Mängel" |
| E25 | C | meinid.com thread "Batterieladeklappe öffnet/schließt nicht mehr" https://www.meinid.com/thread/4742-batterieladeklappe-%C3%B6ffnet-schlie%C3%9Ft-nicht-mehr/ | "Mein Tankdeckel am ID 3 schließt nicht mehr" (18.12.2022); same symptom on an ID.3 Pro S 77 kWh (02/2023) and an ID.4 GTX (read via WebFetch summary) |
| E26 | C | EU Safety Gate via car-recalls.eu, Rapex 13/2021 https://car-recalls.eu/recall/volkswagen-id-3-2020-pe-conductor/ | "INFO/00079/21"; "Type: E1"; "13. 10. 2020 - 6. 11. 2020"; "The protective earthed conductor (PE conductor) on the charger may become detached."; "VW recall code: 93J9" |
| E27 | C | EU Safety Gate via car-recalls.eu, Alert 13/2026 https://car-recalls.eu/recall/volkswagen-id-3-2022-2024-ev-hybrid-fire/ | "SR/00953/26"; "93MI"; "17. 2. 2022 - 23. 8. 2024"; "The high-voltage battery's cell modules could overheat during charging. This may lead to fire." |
| E28 | C | EU Safety Gate via car-recalls.eu, Alert 44/2026 (published 06/11/2026) https://car-recalls.eu/recall/volkswagen-id-3-2022-2025-ev-hybrid-fire/ | "SR/03126/26"; "13. 7. 2022 - 6. 6. 2025"; "With a high state of charge, the high-voltage battery may overheat. This increases the risk of a vehicle fire."; code "93MF" |
| E29 | C | UK DVSA via carpeep https://carpeep.co.uk/volkswagen/id3 | R/2026/397 "93MF - Charging restricted to 80%", built 09/2022–05/2024; R/2026/150 "Battery Check", built 10/2022–04/2025, "increased self-discharge"; R/2026/046 built 07–10/2023 (21 cars) |
| E30 | C | electrive.net, 24.03.2026 https://www.electrive.net/2026/03/24/vw-muss-fast-100-000-meb-stromer-zurueckrufen/ | VW code 93MI, KBA 16271R; ID.3 built 24.06.2023–23.08.2024; "Es besteht Brandgefahr"; "Als Maßnahme wird bei der Rückrufaktion ein Softwareupdate durchgeführt." |
| E31 | C | hh-autos.com, "Volkswagen schweigt zu einem teuren Serienfehler im ID.3" https://hh-autos.com/vw-id3-ptc-heizer-kostenfalle/ | "Hochvolt-PTC-Luftheizer (Bauteil Z115 im Klimakasten)"; "Kostenvoranschlag für Austausch: ca. 2.000 Euro." — **not used** (section 4) |
| E32 | C | meinid.com thread 11278 "TPI für Wärmepumpe" https://www.meinid.com/thread/11278-tpi-f%C3%BCr-w%C3%A4rmepumpe/ | "B1903F0: Füllmenge Kältemittel ist zu gering"; "Zur Zeit ist keine zielführende Reparatur möglich." — **not used** |
| E33 | C | ADAC Autokatalog variant pages (10, ids in section 6) https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/vw/id3/ | "Bremse vorne Scheibe", "Bremse hinten Trommel" (all 10); "Bodenfreiheit maximal" (no value, all 10); facelift "Höhe 1564 mm" |
| E34 | C | Internet Archive https://web.archive.org/web/20220814121851/https://www.tukas.cz/wp-content/uploads/2019/05/id-3-14-10-2021.pdf, https://web.archive.org/web/20250213153021/https://www.tukas.cz/wp-content/uploads/2023/09/id-3-facelift-08-2023.pdf | both captures 1 048 576 bytes (truncated), unreadable |
