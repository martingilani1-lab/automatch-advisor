---
name: research-car
description: Researching one car phase on the web and filling the research intake document (scripts/new-car-template/RESEARCH-PACK.md format) with a verified quote for every value. Use when Martin asks to research / look up / fill data for a car, model, generation or phase, or to verify data an outside tool (Gemini, Perplexity) produced. Output is a document for review, never a database write.
---

# Researching a car phase (AutoMatch)

Built from the first Gemini test run on the BMW i3 facelift (2026-11-10): about half of the values
an AI research tool produced were unsupported, and several contradicted the tool's own quote.
Everything below exists to stop that. Works best in a **Local** desktop session — cloud sessions
block many source sites (BMW / VW press, ADAC, Google Docs).

## Inputs
- Car + phase from Martin, e.g. "Kia Ceed (CD), Pre-facelift". One phase per run.
- The process (five passes, gates, Perplexity budget and logging): `docs/intake/RESEARCH-PROCESS.md`.
  Which fields are required: `docs/intake/FIELD-LEVELS.md`. Run one pass at a time; pass 1's
  configuration list needs Martin's approval before passes 2–5.
- The format and all rules: `scripts/new-car-template/RESEARCH-PACK.md` — read PART 1 and
  PART 2 in full before searching. Its hard rules apply to you exactly as to any outside tool (NULL over
  guessing, N/A, evidence quote per value, no conversions, exact phase / variant scope, closed
  vocabularies, codes never guessed).
- If the car is already in the catalog: query it first (Supabase MCP, read-only) and run in
  **verification mode** — every stored value gets confirmed with a quote, corrected with a quote,
  or flagged; nothing is silently overwritten.

## Source order (try in this order per value)
1. Manufacturer: press kits / technical data / price lists for that model year
   (press.bmwgroup.com, volkswagen-newsroom.com, skoda-storyboard.com, media.renault.com,
   toyota-europe newsroom, hyundai / kia newsroom …).
2. ADAC Autokatalog (adac.de/rund-ums-fahrzeug/autokatalog) — one page per variant with dimensions,
   EU weight, NEDC / WLTP consumption and range, 0–100, top speed, ground clearance. Best single
   source for per-configuration facts.
3. Euro NCAP datasheet (euroncap.com) — NCAP only.
4. Spec databases (auto-data.net, ultimatespecs, cars-data) — only for what 1–2 don't publish; one
   database = one source however many pages.
5. Faults / reliability: ADAC Pannenstatistik, TÜV Report, recall databases, model-specific owner
   forums, carcomplaints.com. Aggregator "reliability report" sites with no named source
   (e.g. carchecker.pro) are leads, not evidence.
6. Market data (B2): only listing searches filtered to this generation + phase years
   (autobazar.sk / .eu, sauto.cz, bazos). A page covering all years is wrong scope → NULL.
   Under 10 listings → NULL.

## Procedure
1. Section B first (years, platform, NCAP), then G (which configurations existed), then D / D2,
   E / F, C, J, H / H2, I, B2, O — the order in the pack.
2. For every value: open the page, copy the quote that contains the number, record URL + quote in Q.
   If you cannot open the page, the value is NULL (a search-result snippet is not evidence unless it
   contains the full number and its context).
3. **Self-check before handing over** — go through Q and confirm, for every non-NULL value:
   the number appears in its quote; the quote is about this phase / variant / cycle; the standard
   matches the STANDARDS table. Fix or NULL every failure. List every NULL that should exist in R.
4. Save as `docs/intake/research/<brand>-<model>-<generation>-<phase>.md` and tell Martin in a
   table: filled / NULL / conflicts found, plus anything that contradicts the live catalog.
5. Converting to the import format (`scripts/new-car-template/INTAKE.md`) and seeding are the
   `import-car` skill's job, after Martin has reviewed this document.

## Perplexity (MCP)
- One topic per call, at most 8 calls per car phase; a call that times out or fails twice ends that
  topic. Log tool, topic, duration and outcome for every call and put the log in the output document.
- Tell it the manufacturer-wins rule explicitly; verify every value it returns by opening the source
  yourself (the i3 run had a mis-transcribed figure and two dead links behind valid-looking citations).

## Completeness
Before handing over, check the merged result against `docs/intake/FIELD-LEVELS.md` and list every
required / applicable conditional field that is still empty, with where you looked. Those go to
Martin; never fill them to make the list shorter.

## Never
- Write to the database from this skill (reads only).
- Fill a value from memory without a quote, even a "well-known" one.
- Resolve a disagreement between sources by averaging or picking the plausible one — NULL + R,
  unless one side is the manufacturer.
