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

**EV sources for reliability (pass 4):** ADAC Pannenstatistik (it covers EVs), recall databases
(EU Safety Gate, KBA, NHTSA for the same platform), manufacturer service campaigns, battery-health
reports that name the exact model and battery. Generic "EVs are reliable" articles are not evidence.

## Tags

Rule-based tags are computed by the tag-rule migrations, not typed by hand:
`20261102233000_seed_auto_configuration_tags.sql`, `20261103090000_seed_rule_based_tags.sql`,
`20261104203000_seed_dilemma_tags.sql`, `20261112140000_seed_ev_city_commuter_tag.sql`.
All are `INSERT ... ON CONFLICT DO NOTHING`, so they are safe to re-run, and **they must be re-run
after every car seed** — they only tag what existed when they last ran. (That is why the Renault Zoe
R110, 80 kW, has no `city_commuter` tag today although the rule covers it.)

Judgement tags (`comfort_cruiser`, `drivers_choice`, `value_choice` …) are proposed in pass 4 with a
reason and set only when Martin agrees.

## Open questions (schema, not process)

- **Variant body dimensions.** `phase_body_dimensions` is keyed by phase × body, so the i3 and i3s
  (different height and ground clearance on the same body) can't both be stored. Same issue will come
  with sport / raised versions. Until decided: the base variant goes in section C, the variant's
  figures go in section R, never averaged.
- **Recall vs fault** as a real column instead of the `Recall:` text convention.
- **EV-aware tag rules** beyond `city_commuter` (e.g. `ultra_efficient` reads only l/100 km, so no EV
  can get it).

## Pilot log

| car | date | Perplexity calls | time | cost | notes |
|---|---|---|---|---|---|
| BMW i3 (I01) Facelift, pass 2 test | 2026-11-11 | 2 (1 stalled) | ~5 min each | $0.80 | 51/51 values verified; 9 cells left NULL despite a cited manufacturer source |
| BMW i3 (I01) completion, both phases | 2026-11-12 | 2 | ~4 min 20 s | check console | 1 mis-transcribed quote, 2 dead links caught; yearly maintenance and towing from Martin |
