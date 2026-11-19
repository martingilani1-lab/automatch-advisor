# Research process for a catalog car

How one car phase goes from "not in the catalog" to a reviewed seed. Decided by Martin on
2026-11-11/12 and tried on the BMW i3 (I01) pilot. Import rules stay in `CLAUDE.md`; which fields
must be filled is in [FIELD-LEVELS.md](FIELD-LEVELS.md); the document the research fills is
`scripts/new-car-template/RESEARCH-PACK.md`.

## Roles

| who | does | never does |
|---|---|---|
| Research tool (Perplexity via MCP, or Claude Code's own web search) | finds values, each with a URL and a verbatim quote | decides what is true |
| Claude Code | opens every source and checks the quote, merges the passes into one intake, runs the completeness check, writes the seed files | trusts a citation it hasn't opened; writes to the DB before Martin's review |
| Martin | approves the configuration list, supplies market and own-experience figures (source `M`), decides exceptions, signs off the seed | — |

**Whoever found a value does not verify it.** In the i3 pilot Perplexity returned no invented values,
but one quote was mis-transcribed (ADAC €270 read as €1,270) and two cited URLs were dead. Only
opening the source caught them.

## The five passes

One car phase per run. Each pass fills its own sections of the research pack and ends at a gate.

| # | pass | pack sections | main sources | gate |
|---|---|---|---|---|
| 1 | Identity + configurations | A, B (years, platform, chassis, cycle), E / F (unit names), G | manufacturer price lists and press kits for the phase's years | **Martin approves the configuration list (G).** Every later pass hangs off it. |
| 2 | Technical data | C, D, J, towing | manufacturer technical data, ADAC Autokatalog | every value has a checked quote |
| 3 | Safety + equipment | B (NCAP), C (ISOFIX), H, H2 | Euro NCAP datasheet, price lists | every trim feature has a `feature_group` |
| 4 | Reliability + service | D2, E, F (service, ratings), I, K | ADAC Pannenstatistik, TÜV Report, recall databases, model forums | each rating of 3 or lower is backed by a listed fault |
| 5 | Market | B2 | current SK / CZ listings, or Martin's own figure | at least 10 listings, dated — **run last, right before the seed** (prices go stale) |

After the passes, Claude Code derives (never researches) the rule-based tags — see "Tags" below.

**Split the work across sessions** (Martin, 2026-11-19, after the ID.3): one session for pass 1 (+2) up to the
configuration gate, one for passes 3–4 (trims, faults in depth), one for pass 5 + seed. A model with several phases or
an EV variant (Citigo e iV, Up! e-up!) may take a session per phase. Leave a hand-over note at each split.

## Completeness gate

Before a seed file is written, every field in FIELD-LEVELS.md is checked:

- **required** empty → STOP, goes to Martin with what was searched and where.
- **conditional** whose condition holds and is empty → same STOP.
- Martin either supplies the value (source `M`, with a one-line reason), or approves an exception
  in the intake's section M (`field | target | reason | approved`). An exception is the only way a
  required field may stay empty. Neither path ever makes up a figure.

Until `validate-template.mjs` reads `scripts/catalog-field-levels.json` (next step), Claude Code runs
this check by hand and lists the result in its summary.

## NULL, N/A, 0 and M

| written | means | stored as |
|---|---|---|
| `NULL` | looked for, not found (unknown) | NULL — reported as a gap |
| `N/A` | does not apply to this car (oil capacity of an EV, NCAP % before 2009) | NULL — not a gap |
| `0` | a real zero the manufacturer states or Martin confirms — today only `towing_capacity_kg` | 0 |
| value with source `M` | Martin's own figure from the SK / CZ market or his experience | the value, source `M` in section K |

**Towing.** `towing_capacity_kg = 0` means the car may not tow (no trailer homologation); `NULL` means
unknown. A car is only `0` when a manufacturer document says so, or Martin confirms it. Absence from
spec sheets alone is not enough: that stays `NULL` and goes to Martin. When the phase is `0`, the
configuration towing columns are `N/A`. (BMW i3 I01: `0`, confirmed by Martin 2026-11-12 — aftermarket
hitches are approved for bike carriers only.)

## Using Perplexity

Connected in the Codespace as a local MCP server (`@perplexity-ai/mcp-server`, key from the
`PERPLEXITY_API_KEY` Codespaces secret — never in a file).

- **One topic per call** (engine reliability; gearbox; faults; towing + weights). A whole pass in one
  call ran close to 5 minutes and stalled once; a stalled call is still billed.
- `perplexity_ask` for single values, `perplexity_research` only for a topic that needs several
  sources. `perplexity_search` returns links and snippets only.
- **Budget: 8 calls per car phase.** A call that times out or fails twice ends that topic; report it,
  don't retry in a loop.
- **Log every call:** tool, topic, duration, outcome. Check the spend in the console after the run.
- **Manufacturer wins.** Tell the tool explicitly: when sources disagree and one is the
  manufacturer's own document, use it and note the other. In the first i3 test it left 9 cells
  NULL although it had already cited the BMW PDF that settled them.
- Observed so far (i3 pilot, one car): about $0.40 per `perplexity_research` call, 4–5 minutes;
  3 calls for the whole car. Treat as a first data point, not a budget.

Market data (pass 5) is not done through Perplexity until it has been shown to read listings
reliably; Martin's own figure is the fallback.

## Faults and recalls

A recall is a dated campaign that fixes the affected cars; a fault is a pattern owners keep meeting.
Both go in `catalog_component_faults`, but a recall's text starts with `Recall:` and names the
affected years / build range and whether the campaign fixed it
(`Recall: 2019–2020 i3 120 Ah — EME ... fixed under campaign ...`). A recall that was fixed by the
campaign does not by itself lower a reliability rating. (There is no schema column for this yet —
see open questions.)

**Cost and probability (pass 4).** Every fault carries a repair cost (EUR, out of warranty, SK / CZ)
and an `annual_probability` — the share of cars that meet it in one year. The Costs tab
(`app/db-test/lib/repairBuffer.ts`) uses them in two different ways (Martin, 2026-11-14):

- **Wear** — a part replaced every N years has `annual_probability = 1/N` (12 V battery every
  4 years = 0.25; anything at 0.2 or above counts as wear). Its cost is spread over the year and is
  part of the yearly total.
- **Possible fault** — anything below 0.2 (A/C compressor 0.002). Never spread over the year: it is
  listed with its one-off repair price, how often it happens in words (rare under 1 %, occasional
  1–5 %, common above 5 % of cars a year) and its `pre_purchase_check`. An owner who meets it pays
  the whole repair at once, so a yearly share would mislead.

A rate a source gives over several years ("2 % after 10 years") is converted to a yearly one by
Claude or Martin, never by the research tool. Faults that only hit some build years get
`affected_year_from / _to`. A fault without a price is still listed, as "repair price not known" —
never filled in.

**Engine and gearbox faults are stored per unit, not per phase.** When the same engine row is used
on two phases (the i3 94 Ah on Pre-facelift and Facelift), the fault's build years are the only
thing that keeps it off the wrong phase — the i3 "motor mount, up to 2015" fault showed on the 2017+
Facelift until the comparison started filtering by years (2026-11-15). So: an engine / gearbox that
spans phases → every fault on it gets `affected_year_from / _to` whenever it didn't hit all years.

**Recalls: one row per manufacturer campaign code** (VW 93MI, Renault 0DKQ …). Look the code up in EU Safety
Gate (the car-recalls.eu mirror shows code, build window and alert number) and check UK / DE references belong to the
same code before citing them together — the ID.3 import merged 93MI and 93MF into one text (fixed 2026-11-19).

**Repair costs: independent-shop SK / CZ prices** (Martin, 2026-11-19). A dealer figure (ADAC, a forum invoice) is
evidence of the fault, not the price to store; when Martin supplies independent-shop figures they go in as source `M`.
A part of a fault with no independent figure (ID.3 front discs) keeps the sourced figure and the text says which part.

**Owner patterns: the model's own forum first** (meinid.com for MEB, zoe-forum.de …): a long thread with several
owners, a VW field action / TPI number or a garage invoice is a pattern; a single post, a "known issues" aggregator
(au7o, carwiki) or a dealer blog is not. ADAC's model page "Gebrauchtwageninfo" PDF (`gw0NNN-…-bericht.pdf`) and the
ADAC Dauertest page give TÜV weak points and real repair invoices — open them first.

**EV sources for reliability (pass 4):** ADAC Pannenstatistik (it covers EVs), recall databases
(EU Safety Gate, KBA, NHTSA for the same platform), manufacturer service campaigns, battery-health
reports that name the exact model and battery. Generic "EVs are reliable" articles are not evidence.

## Trims (pass 3)

- Only a manufacturer price list counts (VW ČR / SK "Ceník / Cenník"). A bank or fleet configuration of one car
  (options included) or a one-model action edition ("People", "Limited") is not a trim line — record it, don't add it
  (ID.3 "Easy", "Pro People", 2026-11-19).
- Dead dealer PDFs: search the price list's **order code** (`"E113MJ02"`) — other dealers host the same file. Internet
  Archive copies are often cut at 1 MB (unreadable); fetch with the `…/web/<ts>id_/<url>` form.
- Read ●/○/− columns with `pdftotext -table -enc UTF-8` (plain `-layout` misaligns the marks).
- A tier that only changes battery / charging has no feature rows of its own — fine.
- Safety slugs: parking sensors = `reversing_detection`; `parking_assist` only for systems that steer.

## Market (pass 5) — practical

- **Record every listing id** with price and km in the research doc; without them the market can't be re-checked
  (ID.3 import, 2026-11-18).
- SK: auto.bazos.sk search + autobazar.eu `/vysledky/osobne-vozidla/<brand>/<model>/` (cards show `XX kraj`; SK
  regions BA TT TN NR ZA BB PO KE, others / none = CZ dealers). Merge duplicates by price + km.
- CZ: sauto.cz JSON `/api/v1/items/search?manufacturer_model_seo=<brand>%3A<model>&category_id=838&…` from a sauto tab
  (model seo has no dash: `id3`); it has `manufacturing_date`. The Seznam consent wall needs Martin's OK (given once,
  2026-11-19). Plus auto.bazos.cz.
- DE reference: mobile.de model page `suchen.mobile.de/auto/<brand>-<model>.html`; for filters get the `ms=` code
  from the page html (ID.3 = `25200;81`), then `search.html?ms=…&fr=2024:&ml=1000:&dam=false`.
- A build year that straddles a facelift is left out unless the ad says which phase.

## Tags

Rule-based tags are computed by the tag-rule migrations, not typed by hand:
`20261102233000_seed_auto_configuration_tags.sql`, `20261103090000_seed_rule_based_tags.sql`,
`20261104203000_seed_dilemma_tags.sql`, `20261112140000_seed_ev_city_commuter_tag.sql`.
All are `INSERT ... ON CONFLICT DO NOTHING`, so they are safe to re-run, and **they must be re-run
after every car seed** — they only tag what existed when they last ran. (That is why the Renault Zoe
R110, 80 kW, has no `city_commuter` tag today although the rule covers it.)

Judgement tags (`comfort_cruiser`, `drivers_choice`, `value_choice` …) are proposed in pass 4 with a
reason and set only when Martin agrees.

## Figures that look comparable but aren't

- **Weighted plug-in figures.** A PHEV's or range extender's official consumption (kWh **and**
  l/100 km) comes from a test that assumes the battery does most of the driving (i3 REx: 11.5 kWh +
  0.6 l, NEDC). It is not what the car uses on electricity alone or on petrol alone. Store it as
  published, but never compare it with a pure EV's or a petrol car's figure as if it were lower, and
  never compute a tank range from it (9 L ÷ 0.6 l = "1 500 km"). The comparison marks it "weighted
  (hybrid test)".
- **Cycles.** Every consumption and range value carries its cycle (NEDC / WLTP, about 15–25 %
  apart). Figures of different cycles are never ranked against each other.
- **A source gives a range, the column wants one number** ("290 to 300 km"): Martin picks which
  end (or the midpoint) and the choice is written in the research doc with the source. Two sessions
  picking differently is how the i3 Facelift went 300 → 290 → 300 (2026-11-10 / 12 / 15).

## Migrations written for review go stale

A migration written for Martin to run is checked against the live data **of the day it is
written**. If it waits, other files can change the same rows: the i3 Facelift file of 2026-11-10
expected the range to be NULL, but a later file had set it to 290, so it would have rolled back
(2026-11-15). So:

- Before Martin runs a file that is more than a day old, Claude re-checks each of its guards against
  the live DB (a read-only query per guard) and rewrites it if anything moved.
- A file that is replaced is never deleted: it gets a `SUPERSEDED — DO NOT RUN` header naming the
  file that replaces it, and the research doc says so.
- After Martin says "ran it", Claude reads the changed rows back. "Success, no rows returned" with
  nothing changed = an old SQL editor tab with an open transaction — re-run in a fresh tab.
- If rows still haven't changed: check `pg_stat_activity` for an `idle in transaction` session and note
  `pg_stat_user_tables.n_tup_upd` for the table — a run that really executed raises it by the number of rows touched
  (ID.3 2026-11-18: two "ran it" with nothing changed, the third worked).
- Before writing a replacement for an unrun file, read the live rows: the "superseded" file may have run after all
  (ID.3 costs 2026-11-18). Write the replacement from the live state, and fix the old file's header to say it ran.

## Open questions (schema, not process)

- **Variant body dimensions.** `phase_body_dimensions` is keyed by phase × body, so the i3 and i3s
  (different height and ground clearance on the same body) can't both be stored. Same issue will come
  with sport / raised versions. Until decided: the base variant goes in section C, the variant's
  figures go in section R, never averaged. Partly solved for the tank: a configuration can carry its
  own `fuel_tank_capacity_liters` (20261115163000, the i3 REx's 9 L); gross weight and payload still
  can't.
- **Recall vs fault** as a real column instead of the `Recall:` text convention.
- **EV-aware tag rules** beyond `city_commuter` (e.g. `ultra_efficient` reads only l/100 km, so no EV
  can get it).

## Pilot log

| car | date | Perplexity calls | time | cost | notes |
|---|---|---|---|---|---|
| BMW i3 (I01) Facelift, pass 2 test | 2026-11-11 | 2 (1 stalled) | ~5 min each | $0.80 | 51/51 values verified; 9 cells left NULL despite a cited manufacturer source |
| BMW i3 (I01) completion, both phases | 2026-11-12 | 2 | ~4 min 20 s | check console | 1 mis-transcribed quote, 2 dead links caught; yearly maintenance and towing from Martin |
| BMW i3 (I01) REx, research + market | 2026-11-15 | 4 + 0 | short | check console | first EREV: 2 vocabulary values + 1 CHECK widened; market read straight from the sites (70 listings, SK / CZ / DE apart) — Perplexity not needed; 2026-11-10 facelift files found stale and rewritten |
| VW ID.3 (E1) import + completion | 2026-11-18/19 | 3 | — | check console | one session per whole car was too thin (Martin) → completion pass in 2 more sessions; recall texts mixed two campaigns; market ids not recorded at import; trims from a bank config replaced by the VW ČR list |
