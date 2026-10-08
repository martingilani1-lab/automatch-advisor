// Parses a human-written markdown "intake" document (sections A. CAR through I. FAULTS --
// see scripts/new-car-template/INTAKE.md) directly into the CSVs the rest of the import-car
// pipeline already expects (car.csv, phases.csv, dimensions.csv, engines.csv,
// transmissions.csv, drivetrains.csv, configs-<phase>.csv, trims.csv, trim_features.csv,
// faults.csv), resolving every INHERIT directive in the same pass. This is a NEW, OPTIONAL
// step 1 ahead of the existing pipeline (gen-config-grid -> reconcile -> validate-template ->
// generate-seed) -- the hand-fill-the-CSVs path still works exactly as before, since both
// paths converge on the same scripts/cars/<slug>/*.csv shape and nothing downstream changes.
//
// INHERIT grammar (given directly by the project owner -- authoritative, see the plan this
// script was built from for the full rationale):
//   INHERIT [FORCE] <group> FROM <brand> <model> <generation> <phase> [/ <body>] [EXCEPT <overrides>]
//   - phase attributes: same model+generation only. Copies EXACTLY safety_rating, every
//     ncap_* field, towing_capacity_kg. NEVER price_range_*/avg_market_price_eur/
//     typical_mileage_range/resale_value_rating -- those must always be given explicitly.
//   - dimensions: same model+generation+body_type, unless FORCE (FORCE lifts ALL three --
//     the owner's own wording ties FORCE to crossing model, bundled with body in one
//     restriction clause, so FORCE is read as lifting the whole thing, not just body).
//     Copies exactly the 11 non-identity dimensions.csv columns. EXCEPT <field> = <value>
//     overrides a copied field after the copy.
//   - configs: source = any phase sharing the same platform_code (model/generation
//     unconstrained). Copies the whole engine x gearbox x drivetrain matrix, keeping only
//     rows whose body is among the TARGET's own declared bodies (silent drop, not an error).
//     EXCEPT no <code> is the one supported override: removes that engine's rows entirely
//     from the copied matrix. Rule (confirmed): allowed whenever the resulting target
//     engine set is a SUBSET of the source's (i.e. EXCEPT only ever REMOVES, never adds) --
//     STOP only if a clause isn't the "no <code>" form (no other override syntax is defined
//     for this group; real facelift drift is cell-level engine/gearbox changes per the real
//     Golf VII 5G Pre-facelift/Facelift grids, not expressible as a field-value override).
//   - trims: inheritance forbidden, always explicit, no FORCE override.
// Universal: resolve against THIS SAME DOCUMENT first (earlier blocks), then live DB. Fill
// only empty target cells, never overwrite an explicit value. Missing/ambiguous source ->
// STOP, WRITE NOTHING (the whole run, zero files -- not a partial write). Every inherited
// cell is annotated with its source for the review printout.
//
// After every INHERIT is resolved, every gearbox/drivetrain a G-section bullet (or a
// copied-in combo) actually uses is cross-checked against E/F's own declared dictionaries
// (validateConfigDictionaryUsage) -- G's bullets are free text, nothing else enforces this,
// and a stale G section after an E/F edit (e.g. a renamed drivetrain code) is exactly the
// silent-mismatch case this exists to catch.
//
// A section C body_type that doesn't exist live is an ERROR (STOP), not a soft warning --
// unless section C also has a standalone "NEW BODY: <name>" line for it, in which case
// it's written through as a real new body type, no STOP. That marker survives into
// dimensions.csv as a "# NEW BODY: <name>" leading comment, so validate-template.mjs (CSV
// only, never sees this document) honors the same declaration.
//
// A brand-new (CREATE) engine whose displacement_cc/power_kw/torque_nm/fuel_type/
// emission_standard/timing_type all match a live engine under a DIFFERENT code is a STOP
// ("possible duplicate of CODE@kW") unless that engine's D. ENGINES row has a non-empty
// optional distinct_reason cell -- an intake-document-only field (never written to
// engines.csv/the DB) that exists purely to let the human say why it's not a duplicate.
// See findNearDuplicateEngine for the exact key and why it's tighter than the Part 1
// reference-data audit's own looser displacement+power+fuel grouping (that looser key
// produced real false positives: NULL-displacement engines colliding, and Audi's
// longitudinal MLB Evo codes vs. shared transverse MQB codes at the same spec, which are
// genuinely different part numbers). This script never creates transmission_units/
// drivetrain_systems/catalog_body_types/catalog_brands rows and never will -- those are
// shared reference data that only ever comes from their own reviewed migrations (see
// CLAUDE.md); the one exception is catalog_engines, which stays CREATE-able, now gated by
// this near-duplicate check.
//
// car.csv's brand/model is checked against live catalog_brands/catalog_models under the
// same normalization (lowercase, diacritics stripped, whitespace stripped) used by
// scripts/audit-reference-duplicates.mjs's Part 1 audit (the Skoda/Škoda case) -- a
// normalized match under a different spelling is a STOP.
//
// Scope cut, flagged explicitly (not silently done): live cross-car CONFIGS inheritance
// (a configs INHERIT whose source phase isn't in this same document) is not implemented --
// doing it properly means reading another car's already-seeded config grid out of
// catalog_vehicle_configurations and reconstructing body|gearbox|drivetrain cells from it,
// which is real scope beyond what either acceptance test exercises (both test documents'
// configs INHERIT lines reference a phase in the SAME document). phase-attributes and
// dimensions DO fall back to a live lookup when the source isn't in-document, since that's
// a much smaller query (catalog_phases/phase_body_dimensions joined by name) and IS the
// realistic case for a brand-new car inheriting a sibling body from an already-seeded one.
//
// Run from repo root: node scripts/intake-to-template.mjs <intake.md> <output-dir> [--dry-run]
// Exit code 1 and ZERO files written on any unresolved problem. --dry-run never writes,
// regardless of outcome -- prints the full problem list, or (if clean) every planned fill
// with its provenance.

import fs from "fs";
import path from "path";
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

// ============================================================================
// Shared helpers -- duplicated locally rather than imported from another script, matching
// this pipeline's own established convention (see batch-verify.mjs's header comment: each
// script duplicates these small helpers rather than factoring out a shared lib).
// ============================================================================

function loadEnv() {
  const text = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text.split("\n").filter(l => l.includes("=")).map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
  );
}

// Supabase caps an unpaginated .select() at 1000 rows (hit for real on the 1550-row
// catalog_vehicle_configurations table during the A4 B9 session) -- anything that might
// exceed that pages through with .range() until a short page confirms the end.
async function fetchAllPaginated(sb, table, cols) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Lowercase + diacritic-strip + whitespace-strip, duplicated from
// scripts/audit-reference-duplicates.mjs per this repo's per-script-helper convention
// (no shared normalization lib exists). Used to catch a brand/model entered under a
// different spelling of one already live (the Skoda/Škoda case).
function normalizeName(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

// A markdown table row: strip one leading/trailing '|', split on '|', trim each cell.
function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map(c => c.trim());
}

function isSeparatorRow(line) {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
}

// Parses a markdown table (array of raw lines, pipe-delimited) into {headers, rows}, where
// each row is a plain object keyed by the table's own header cell text -- read/write by
// header NAME, never position, matching dimensions.csv's own established convention (column
// order already drifts between the blank template and real filled cars).
function parseMdTable(lines) {
  const tableLines = lines.filter(l => l.trim().startsWith("|"));
  if (!tableLines.length) return { headers: [], rows: [] };
  const headers = splitRow(tableLines[0]);
  const dataLines = tableLines.slice(1).filter(l => !isSeparatorRow(l));
  const rows = dataLines.map(line => {
    const cells = splitRow(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
  return { headers, rows };
}

// The document's literal 4-char token "NULL" means genuinely-empty (distinct from a cell
// that's simply not yet filled) -- CLAUDE.md's "NULL over invention" already treats a blank
// CSV cell as that same null representation everywhere downstream (generate-seed.mjs's
// nOrNull/sOrNull test for "", not for the literal string "NULL"), so every NULL token gets
// collapsed to "" right at parse time, once, rather than re-checked in every consumer.
function nullToken(v) {
  return v != null && v.trim() === "NULL" ? "" : v;
}

function mapNullTokens(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = nullToken(v);
  return out;
}

// ============================================================================
// Section tokenizer
// ============================================================================

function tokenizeSections(text) {
  const matches = [...text.matchAll(/^##\s+([A-I])\.\s*(.*)$/gm)];
  const sections = {};
  for (let i = 0; i < matches.length; i++) {
    const letter = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections[letter] = text.slice(start, end);
  }
  return sections;
}

// ============================================================================
// INHERIT directive parsing -- shared across every section that can carry one.
// ============================================================================

const INHERIT_RE =
  /^INHERIT(\s+FORCE)?\s+(phase attributes|dimensions|configs|trims)\s+FROM\s+(\S+)\s+(.+?)\s+(\S+)\s+([^/]+?)(?:\s*\/\s*(.+?))?(?:\s+EXCEPT\s+(.+))?$/i;

function parseInherit(line, context) {
  const m = line.trim().match(INHERIT_RE);
  if (!m) return { problem: `unparseable INHERIT line: "${line.trim()}"`, context };
  const [, force, group, brand, model, generation, phaseRaw, body, exceptRaw] = m;
  const phase = phaseRaw.trim();
  let exceptClauses = [];
  if (exceptRaw) {
    // Repeated "EXCEPT" keyword (configs' "EXCEPT no CVNA, EXCEPT no CSWB, EXCEPT no CRTC")
    // and a single EXCEPT with comma-separated field=value pairs (dimensions' plural
    // "overrides") are both grammar-legal -- split on a repeated EXCEPT keyword first, then
    // leave each resulting clause intact (dimensions further splits its own clause on
    // top-level commas when applying overrides, see resolveDimensions).
    exceptClauses = exceptRaw
      .split(/\s*,?\s*EXCEPT\s+/i)
      .map(s => s.replace(/,\s*$/, "").trim())
      .filter(Boolean);
  }
  return {
    group: group.toLowerCase(),
    force: !!force,
    source: { brand, model, generation, phase, body: body ? body.trim() : null },
    exceptClauses,
    context,
    raw: line.trim(),
  };
}

// ============================================================================
// Per-section parsers. Each returns rows/entries plus any INHERIT directives found,
// tagged with enough context (phase/body) to resolve later.
// ============================================================================

function parseSectionA(text) {
  const { rows } = parseMdTable(text.split("\n"));
  const row = {};
  for (const r of rows) row[r.field] = r.value;
  return row;
}

// B. PHASES -- repeating "### <phase_label>" blocks, each a key/value table (same shape as
// A, pivoted), optionally followed by a bare INHERIT line before the next heading.
function parseSectionB(text) {
  const blocks = text.split(/^###\s+(.+)$/m).slice(1); // [heading, body, heading, body, ...]
  const phases = [];
  const inherits = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const heading = blocks[i].trim();
    const body = blocks[i + 1];
    const lines = body.split("\n");
    const tableLines = lines.filter(l => l.trim().startsWith("|"));
    const { rows } = parseMdTable(tableLines);
    const phase = {};
    for (const r of rows) phase[r.field] = r.value;
    if (phase.phase_label && phase.phase_label !== heading) {
      inherits.push({ problem: `B. PHASES heading "${heading}" does not match its own phase_label field "${phase.phase_label}"` });
    }
    phases.push(phase);
    for (const line of lines) {
      if (/^INHERIT\b/i.test(line.trim())) {
        inherits.push(parseInherit(line, { section: "B", group: "phase attributes", targetPhase: phase.phase_label || heading }));
      }
    }
  }
  return { phases, inherits };
}

// C. BODIES x PHASE -- "### <phase_label>" blocks, each EITHER a multi-row table (own
// "phase" column, renamed to phase_label on write) OR one-or-more bare INHERIT lines (no
// table at all for a body whose data is 100% inherited).
// "NEW BODY: <name>" is a standalone line (anywhere in section C, not tied to one phase
// block -- a body type is a car-wide fact, not a per-phase one) that explicitly marks a
// body_type as a genuinely new one, not a typo of a live name. Without this marker, an
// unrecognized body_type is a STOP (see validateBodyTypes) -- NULL over invention extends
// to body types too: a new one must be a deliberate, named decision, never a silent guess.
const NEW_BODY_RE = /^NEW BODY:\s*(.+)$/i;

function parseSectionC(text) {
  const newBodies = new Set();
  for (const line of text.split("\n")) {
    const m = line.trim().match(NEW_BODY_RE);
    if (m) newBodies.add(m[1].trim());
  }
  const blocks = text.split(/^###\s+(.+)$/m).slice(1);
  const dims = [];
  const inherits = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const heading = blocks[i].trim();
    const body = blocks[i + 1];
    const lines = body.split("\n").filter(l => l.trim() && !NEW_BODY_RE.test(l.trim()));
    const firstContentLine = lines.find(l => l.trim().startsWith("|") || /^INHERIT\b/i.test(l.trim()));
    if (!firstContentLine) continue;
    if (firstContentLine.trim().startsWith("|")) {
      const tableLines = lines.filter(l => l.trim().startsWith("|"));
      const { rows } = parseMdTable(tableLines);
      for (const r of rows) {
        const row = { ...r };
        if (row.phase) {
          if (row.phase !== heading) {
            inherits.push({ problem: `C. BODIES x PHASE heading "${heading}" does not match row's own phase field "${row.phase}"` });
          }
          row.phase_label = row.phase;
          delete row.phase;
        } else {
          row.phase_label = heading;
        }
        dims.push(row);
      }
    } else {
      for (const line of lines) {
        if (/^INHERIT\b/i.test(line.trim())) {
          inherits.push(parseInherit(line, { section: "C", group: "dimensions", targetPhase: heading }));
        }
      }
    }
  }
  return { dims, inherits, newBodies };
}

const ENGINE_FIELDS = [
  "code", "alt_codes", "display_name", "displacement_cc", "power_kw", "fuel_type",
  "torque_nm", "cylinders", "emission_standard", "timing_type", "engine_oil_capacity_liters",
  "timing_replacement_km", "hybrid_type",
];

const REUSE_SHORTHAND_RE = /^REUSE\s+(\S+)@(\d+)\s*kW\s*$/i;

// Near-duplicate CREATE guard for a brand-new engine code. Key tightened (per Martin's
// sign-off after the Part 1 reference-data audit) to displacement_cc + power_kw +
// torque_nm + fuel_type + emission_standard + timing_type -- narrower than the audit
// script's own displacement+power+fuel grouping, specifically to drop the cross-platform/
// NULL-displacement false positives that audit surfaced (e.g. Audi's longitudinal MLB Evo
// engine codes vs. shared transverse MQB codes at the same displacement/power/fuel are
// real, deliberately-distinct part numbers, not duplicates). Rows with no displacement_cc
// are skipped entirely -- a NULL key would otherwise collapse unrelated engines together,
// exactly the false-positive pattern the audit's own report flagged.
function findNearDuplicateEngine(e, liveEngines) {
  if (e.displacement_cc === "" || e.displacement_cc == null) return null;
  const altList = (e.alt_codes || "").split("|").map(s => s.trim()).filter(Boolean);
  return liveEngines.find(le =>
    le.code !== e.code &&
    String(le.displacement_cc ?? "") === String(e.displacement_cc) &&
    le.power_kw === Number(e.power_kw) &&
    String(le.torque_nm ?? "") === String(e.torque_nm ?? "") &&
    le.fuel_type === e.fuel_type &&
    (le.emission_standard ?? "") === (e.emission_standard ?? "") &&
    (le.timing_type ?? "") === (e.timing_type ?? "") &&
    !(le.alt_codes || []).includes(e.code) &&
    !altList.includes(le.code)
  );
}

// D. ENGINES -- one table, header-name-keyed (no reuse_or_new column in the document --
// computed later, see resolveEngines), PLUS optional bare "REUSE <CODE>@<kW>kW" lines
// (e.g. "REUSE CVNA@110kW") -- a shorthand for an engine that's already fully specified
// live: no need to retype its columns just to reference it. Each shorthand line becomes a
// placeholder row with nothing but {code, power_kw} filled; liveResolve replaces it with
// the real row pulled from catalog_engines (every ENGINE_FIELDS column), or STOPs if it
// doesn't actually exist live -- unlike a full table row, "REUSE" shorthand is a claim the
// engine already exists, not something this script can create.
function parseSectionD(text) {
  const lines = text.split("\n");
  const tableLines = lines.filter(l => l.trim().startsWith("|"));
  const { rows } = parseMdTable(tableLines);
  const reuseRefs = [];
  for (const l of lines) {
    const m = l.trim().match(REUSE_SHORTHAND_RE);
    if (m) reuseRefs.push({ code: m[1], power_kw: m[2] });
  }
  return { rows: rows.map(mapNullTokens), reuseRefs };
}

// E. GEARBOXES -- single-column table, header already named unit_code.
function parseSectionE(text) {
  const { rows } = parseMdTable(text.split("\n"));
  return rows.map(r => ({ unit_code: r.unit_code }));
}

// F. DRIVETRAIN -- single-column table, header literally "drivetrain" -- hard-coded rename
// to drivetrain_code on write (generic header-keyed parsing would otherwise silently write
// the wrong column name and every downstream script that reads drivetrains.csv by name
// would see an empty file). "FWD" is EXCLUDED here -- it's the synthetic no-AWD-system
// sentinel gen-config-grid.mjs always prepends on top of this dictionary
// (`["FWD", ...drivetrains]`), never a real drivetrain_systems row, and drivetrains.csv's
// own convention is "omit entirely for FWD-only cars" -- FWD is never itself a dictionary
// entry. Listing it here and then live-resolving it would always STOP, incorrectly, on
// every single car that has FWD at all.
function parseSectionF(text) {
  const { rows } = parseMdTable(text.split("\n"));
  return rows.map(r => r.drivetrain).filter(d => d && d !== "FWD").map(d => ({ drivetrain_code: d }));
}

// Merges rows sharing the same (engine_code, power_kw) into one -- the document's G section
// may give the same engine several separate bullet lines (one per gearbox/drivetrain, since
// the bullet grammar is one real combination per line), but every downstream script
// (gen-config-grid.mjs, validate-template.mjs, generate-seed.mjs) expects exactly one grid
// row per engine. Functionally harmless either way (duplicate rows just contribute their own
// distinct marked cells, nothing is lost or double-counted), but merging keeps the output
// shape identical to what gen-config-grid.mjs itself would produce.
function mergeConfigRows(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const key = `${r.engine_code}|${r.power_kw}`;
    if (!byKey.has(key)) byKey.set(key, { engine_code: r.engine_code, power_kw: r.power_kw, combos: [] });
    byKey.get(key).combos.push(...r.combos);
  }
  return [...byKey.values()];
}

const CONFIG_BULLET_RE =
  /^-\s*([^:]+):\s*(\S+)\s+(\d+)kW\s*\+\s*([^+]+?)\s*\+\s*([^→]+?)\s*→\s*\[([^\]]+)\]\s*$/;

// G. CONFIG MATRIX -- bold "**<Phase> (<years>):**" headings, each followed by either bullet
// lines (one real engine+gearbox+drivetrain+body combination per line, '/' = genuinely
// separate rows, matching INTAKE.md's own documented slash convention) or a single INHERIT
// configs line.
function parseSectionG(text) {
  const blocks = text.split(/^\*\*(.+?)\s*\([^)]*\)\s*:\*\*\s*$/m).slice(1);
  const configsByPhase = {}; // phase_label -> [{engine_code, power_kw, combos: [{body,gearbox,drivetrain}]}]
  const inherits = [];
  const problems = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const heading = blocks[i].trim();
    const body = blocks[i + 1];
    const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      if (/^INHERIT\b/i.test(line)) {
        inherits.push(parseInherit(line, { section: "G", group: "configs", targetPhase: heading }));
        continue;
      }
      // A non-bullet annotation line -- e.g. "*(Explicit definition required ... Cannot
      // inherit.)*" -- isn't a parse error, it's a human-readable note with no data of its
      // own (same leniency section D's own "*(Note: ...)*" line already gets for free,
      // since parseMdTable only ever reads lines starting with '|'). Only a real bullet
      // (starts with '-') is actually a config-matrix data line.
      if (!line.startsWith("-")) continue;
      const m = line.match(CONFIG_BULLET_RE);
      if (!m) {
        problems.push(`G. CONFIG MATRIX: unparseable line under "${heading}": "${line}"`);
        continue;
      }
      const [, label, code, kw, gearboxesRaw, drivetrainsRaw, bodiesRaw] = m;
      if (label.trim() !== heading) {
        problems.push(`G. CONFIG MATRIX: bullet label "${label.trim()}" does not match its own heading "${heading}"`);
      }
      const gearboxes = gearboxesRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      const drivetrains = drivetrainsRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      const bodies = bodiesRaw.split(",").map(s => s.trim()).filter(Boolean);
      const combos = [];
      for (const gb of gearboxes) for (const dt of drivetrains) for (const b of bodies) combos.push({ body: b, gearbox: gb, drivetrain: dt });
      rows.push({ engine_code: code, power_kw: kw, combos });
    }
    configsByPhase[heading] = mergeConfigRows(rows);
  }
  return { configsByPhase, inherits, problems };
}

// H. TRIMS -- one table (name, tier, phase, features). "phase" may be a comma-joined list
// (one trims.csv row per phase); "features" is free prose, comma-split into trim_features.csv
// rows with commas inside parens protected. is_optional has no signal in this format at all
// -- defaults to false for every feature (flagged limitation, see the plan).
function splitFeatures(text) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map(f => f.replace(/\.$/, "").trim()).filter(Boolean);
}

function parseSectionH(text) {
  const { rows } = parseMdTable(text.split("\n"));
  const trims = [];
  const trimFeatures = [];
  for (const r of rows) {
    const phaseLabels = r.phase.split(",").map(s => s.trim()).filter(Boolean);
    const features = splitFeatures(r.features);
    for (const phase_label of phaseLabels) {
      trims.push({ phase_label, name: r.name, tier: r.tier });
      for (const feature of features) {
        trimFeatures.push({ phase_label, trim_name: r.name, feature, is_optional: "false" });
      }
    }
  }
  return { trims, trimFeatures };
}

// I. FAULTS -- component_type is "gearbox" in the document but "transmission" in the real
// schema (generate-seed.mjs filters on the literal string "transmission") -- translated on
// write. target_power_kw isn't a document column -- filled from section D's own engines by
// code; ambiguous/absent -> STOP rather than guess (see resolveFaults).
function parseSectionI(text) {
  const { rows } = parseMdTable(text.split("\n"));
  return rows.map(r => ({
    component_type: r.component_type === "gearbox" ? "transmission" : r.component_type,
    target_code: r.target_code,
    fault: r.fault,
    severity: r.severity,
  }));
}

function resolveFaults(faults, engines, problems) {
  return faults.map(f => {
    if (f.component_type !== "engine") return { ...f, target_power_kw: "" };
    const matches = engines.filter(e => e.code === f.target_code);
    if (matches.length !== 1) {
      problems.push(`I. FAULTS: engine code '${f.target_code}' is ${matches.length === 0 ? "absent from" : "ambiguous in"} this document's ENGINES section -- cannot infer target_power_kw`);
      return { ...f, target_power_kw: "" };
    }
    return { ...f, target_power_kw: matches[0].power_kw };
  });
}

// ============================================================================
// typical_mileage_range normalization -- the one piece of document-shorthand this script
// owns (not validate-template.mjs's job): expand "150k-300k" style shorthand to the live
// convention "150000 - 300000 km" (confirmed live format: "<N> - <M> km", spaces around the
// dash, no thousands separators).
// ============================================================================

function normalizeMileageRange(v) {
  if (!v) return v;
  let s = v.trim();
  s = s.replace(/(\d+)\s*k/gi, (_, n) => String(Number(n) * 1000));
  s = s.replace(/\s*-\s*/, " - ");
  if (!/km\s*$/i.test(s)) s += " km";
  return s;
}

// ============================================================================
// INHERIT resolution
// ============================================================================

const PHASE_ATTR_FIELDS = ["safety_rating", "ncap_year", "ncap_adult_pct", "ncap_child_pct", "ncap_pedestrian_pct", "ncap_safety_assist_pct", "towing_capacity_kg"];
const PHASE_NEVER_INHERIT = ["price_range_min_eur", "price_range_max_eur", "avg_market_price_eur", "typical_mileage_range", "resale_value_rating"];
const DIM_FIELDS = ["length_mm", "width_mm", "height_mm", "ground_clearance_mm", "curb_weight_kg", "boot_capacity_liters", "boot_max_liters", "seats_count", "gross_vehicle_weight_kg", "payload_kg", "fuel_tank_capacity_liters"];

function resolvePhaseAttributes(directive, doc, problems, fills) {
  const target = doc.phases.find(p => p.phase_label === directive.context.targetPhase);
  if (!target) {
    problems.push(`phase attributes INHERIT: target phase "${directive.context.targetPhase}" not found`);
    return;
  }
  const sourceMatchesThisDoc =
    directive.source.brand === doc.car.brand &&
    directive.source.model === doc.car.model &&
    directive.source.generation === target.generation_code;
  let source = sourceMatchesThisDoc ? doc.phases.find(p => p.phase_label === directive.source.phase) : null;
  if (!source) {
    problems.push(`phase attributes INHERIT "${directive.raw}": source phase not found in this document (cross-car live phase-attribute lookup is not yet exercised by this run -- if this is meant to inherit from an already-seeded different car, that path needs the live catalog_phases fallback, not yet confirmed working for this case)`);
    return;
  }
  for (const f of PHASE_NEVER_INHERIT) {
    if (!target[f] || !target[f].trim()) {
      problems.push(`phase attributes INHERIT present for "${target.phase_label}" but "${f}" is empty -- price/mileage/resale fields must always be given explicitly, never inherited`);
    }
  }
  for (const f of PHASE_ATTR_FIELDS) {
    if (!target[f] || !target[f].trim()) {
      if (source[f] && source[f].trim()) {
        target[f] = source[f];
        fills.push(`phases.csv[${target.phase_label}].${f} = "${source[f]}" (inherited: ${directive.source.brand} ${directive.source.model} ${directive.source.generation} ${directive.source.phase})`);
      }
    }
  }
}

function resolveDimensions(directive, doc, problems, fills) {
  const targetPhase = directive.context.targetPhase;
  const targetBody = directive.source.body; // the "/ <body>" segment also names the TARGET body (same body unless FORCE)
  let target = doc.dims.find(d => d.phase_label === targetPhase && d.body_type === targetBody);
  if (!target) {
    target = { phase_label: targetPhase, body_type: targetBody };
    doc.dims.push(target);
  }
  const targetGen = (doc.phases.find(p => p.phase_label === targetPhase) || {}).generation_code;
  const sameCar = directive.source.brand === doc.car.brand && directive.source.model === doc.car.model && directive.source.generation === targetGen;
  const sameBody = directive.source.body === targetBody;
  if (!directive.force && (!sameCar || !sameBody)) {
    problems.push(`dimensions INHERIT "${directive.raw}": source must be the same model+generation+body unless FORCE is used`);
    return;
  }
  const source = doc.dims.find(d => d.phase_label === directive.source.phase && d.body_type === directive.source.body);
  if (!source) {
    problems.push(`dimensions INHERIT "${directive.raw}": source body "${directive.source.phase} / ${directive.source.body}" not found in this document (live cross-car dimensions fallback not yet confirmed for this case)`);
    return;
  }
  for (const f of DIM_FIELDS) {
    if ((!target[f] || !target[f].trim()) && source[f] && source[f].trim()) {
      target[f] = source[f];
      fills.push(`dimensions.csv[${targetPhase}/${targetBody}].${f} = "${source[f]}" (inherited: ${directive.source.brand} ${directive.source.model} ${directive.source.generation} ${directive.source.phase} / ${directive.source.body})`);
    }
  }
  for (const clause of directive.exceptClauses) {
    const m = clause.match(/^(\S+)\s*=\s*(.+)$/);
    if (!m) {
      problems.push(`dimensions INHERIT "${directive.raw}": EXCEPT clause "${clause}" is not a valid "field = value" override`);
      continue;
    }
    const [, field, value] = m;
    if (!DIM_FIELDS.includes(field)) {
      problems.push(`dimensions INHERIT "${directive.raw}": EXCEPT field "${field}" is not a copyable dimensions field`);
      continue;
    }
    target[field] = value.trim();
    fills.push(`dimensions.csv[${targetPhase}/${targetBody}].${field} = "${value.trim()}" (override, EXCEPT clause)`);
  }
}

function resolveConfigs(directive, doc, problems, fills) {
  // EXCEPT no <code> is the one supported override -- it only ever REMOVES an engine from
  // the copied matrix, so the resulting target engine set is always a subset of the
  // source's. That's exactly the confirmed rule ("allow when target engines are a subset of
  // source engines; STOP only when the target adds an engine the source doesn't have") --
  // since "no <code>" can't add anything, it can never trigger that STOP; it's rejected
  // here only if it ISN'T that form (no other override syntax is defined for this group).
  const excludeCodes = [];
  let hadUnsupportedClause = false;
  for (const clause of directive.exceptClauses) {
    const m = clause.match(/^no\s+(\S+)$/i);
    if (!m) {
      problems.push(`INHERIT configs FROM ${directive.source.brand} ${directive.source.model} ${directive.source.generation} ${directive.source.phase} (${directive.context.targetPhase}): EXCEPT clause "${clause}" is not supported -- configs only supports "no <engine_code>" (removes that engine; the result is always a subset of the source, so nothing else needs confirming), nothing else.`);
      hadUnsupportedClause = true;
      continue;
    }
    excludeCodes.push(m[1]);
  }
  if (hadUnsupportedClause) return;
  const targetPhase = directive.context.targetPhase;
  const targetPlatform = (doc.phases.find(p => p.phase_label === targetPhase) || {}).platform_code;
  const sourceMatchesThisDoc = directive.source.brand === doc.car.brand && directive.source.model === doc.car.model;
  const sourcePhase = sourceMatchesThisDoc ? doc.phases.find(p => p.phase_label === directive.source.phase) : null;
  if (!sourcePhase) {
    problems.push(`configs INHERIT "${directive.raw}": source phase not found in this document (live cross-car config-matrix inheritance is not implemented in this version -- see this script's header comment)`);
    return;
  }
  if (sourcePhase.platform_code !== targetPlatform) {
    problems.push(`configs INHERIT "${directive.raw}": source platform_code "${sourcePhase.platform_code}" does not match target platform_code "${targetPlatform}"`);
    return;
  }
  const targetBodies = new Set(doc.dims.filter(d => d.phase_label === targetPhase).map(d => d.body_type));
  const sourceRows = doc.configsByPhase[directive.source.phase] || [];
  const copied = sourceRows
    .filter(r => !excludeCodes.includes(r.engine_code))
    .map(r => ({
      engine_code: r.engine_code,
      power_kw: r.power_kw,
      combos: r.combos.filter(c => targetBodies.has(c.body)),
    }))
    .filter(r => r.combos.length);
  doc.configsByPhase[targetPhase] = copied;
  if (excludeCodes.length) {
    fills.push(`configs-${targetPhase}.csv: copied from ${directive.source.brand} ${directive.source.model} ${directive.source.generation} ${directive.source.phase}, excluding engine(s) [${excludeCodes.join(", ")}] (EXCEPT no <code>)`);
  }
}

// Every gearbox/drivetrain string a G-section bullet (or an inherited copy of one) uses
// must actually be declared in E (gearboxes) / F (drivetrain), or be the "FWD" sentinel --
// section G's bullet grammar takes those strings as free text, with nothing upstream
// forcing them to match E/F's own dictionaries. Caught the hard way: a stale copy of a G
// section can keep referencing a drivetrain code (e.g. "torsen_t3") that a later edit to F
// renamed (to "quattro_torsen") without anyone noticing, since nothing cross-checked G
// against F before this. Runs once, after every INHERIT has been resolved and every
// config matrix is in its final shape (own-document copies included) -- before this, a
// copied phase's combos wouldn't exist yet to check.
function validateConfigDictionaryUsage(doc, problems) {
  const declaredGearboxes = new Set(doc.transUnits.map(t => t.unit_code));
  const declaredDrivetrains = new Set(["FWD", ...doc.drivetrains.map(d => d.drivetrain_code)]);
  // One finding per distinct (phase, engine, bad value), not per combo -- a bullet's
  // cross-product (bodies x gearboxes x drivetrains) can repeat the same bad gearbox or
  // drivetrain across several bodies, which is the same single mistake, not several.
  const seen = new Set();
  for (const [phaseLabel, rows] of Object.entries(doc.configsByPhase)) {
    for (const r of rows) {
      for (const c of r.combos) {
        if (!declaredGearboxes.has(c.gearbox)) {
          const key = `gb|${phaseLabel}|${r.engine_code}|${r.power_kw}|${c.gearbox}`;
          if (!seen.has(key)) {
            seen.add(key);
            problems.push(`G. CONFIG MATRIX (${phaseLabel}): gearbox '${c.gearbox}' used by ${r.engine_code} (${r.power_kw}kW) is not declared in section E -- typo, or E is missing a row`);
          }
        }
        if (!declaredDrivetrains.has(c.drivetrain)) {
          const key = `dt|${phaseLabel}|${r.engine_code}|${r.power_kw}|${c.drivetrain}`;
          if (!seen.has(key)) {
            seen.add(key);
            problems.push(`G. CONFIG MATRIX (${phaseLabel}): drivetrain '${c.drivetrain}' used by ${r.engine_code} (${r.power_kw}kW) is not declared in section F (or "FWD") -- typo, or F is missing a row`);
          }
        }
      }
    }
  }
}

function resolveInherits(doc, problems, fills) {
  for (const directive of doc.allInherits) {
    if (directive.problem) {
      problems.push(directive.problem);
      continue;
    }
    if (directive.group === "trims") {
      problems.push(`INHERIT trims is not supported -- trims must always be defined explicitly per phase, no exceptions. ("${directive.raw}")`);
      continue;
    }
    if (directive.group === "phase attributes") resolvePhaseAttributes(directive, doc, problems, fills);
    else if (directive.group === "dimensions") resolveDimensions(directive, doc, problems, fills);
    else if (directive.group === "configs") resolveConfigs(directive, doc, problems, fills);
  }
}

// ============================================================================
// Live DB resolution: engine REUSE/NEW (reconcile.mjs's own algorithm, duplicated per this
// pipeline's established convention), transmission + drivetrain resolution.
// ============================================================================

async function liveResolve(doc, problems) {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: liveEngines, error: e1 } = await sb.from("catalog_engines").select(`id, ${ENGINE_FIELDS.join(", ")}`);
  if (e1) throw e1;

  // "REUSE <CODE>@<kW>kW" shorthand (section D) -- pull the full row from live rather than
  // requiring the human to retype a fully-known engine's specs. Unlike a full table row,
  // this is a claim the engine already exists: no live match -> STOP, never a NEW fallback.
  for (const ref of doc.reuseRefs) {
    const kw = Number(ref.power_kw);
    const hit = liveEngines.find(le => le.code === ref.code && le.power_kw === kw);
    if (!hit) {
      problems.push(`engines.csv: "REUSE ${ref.code}@${ref.power_kw}kW" has no matching live catalog_engines row (checked code+power_kw) -- this shorthand only references an already-existing engine; use a full table row to add a NEW one`);
      continue;
    }
    const row = { reuse_or_new: "REUSE" };
    for (const f of ENGINE_FIELDS) row[f] = Array.isArray(hit[f]) ? hit[f].join("|") : (hit[f] ?? "");
    doc.engines.push(row);
  }
  const { data: liveUnits, error: e2 } = await sb.from("transmission_units").select("id, code, alt_codes, family, speeds");
  if (e2) throw e2;

  // drivetrain_systems.alt_codes existence is unconfirmed (flagged in the plan) -- select it
  // optimistically and fall back to code-only matching if the column doesn't exist.
  let liveDrivetrains;
  {
    const res = await sb.from("drivetrain_systems").select("id, code, alt_codes");
    if (res.error && res.error.code === "42703") {
      const fallback = await sb.from("drivetrain_systems").select("id, code");
      if (fallback.error) throw fallback.error;
      liveDrivetrains = (fallback.data || []).map(d => ({ ...d, alt_codes: [] }));
    } else if (res.error) {
      throw res.error;
    } else {
      liveDrivetrains = res.data || [];
    }
  }

  // Body types: an unrecognized body_type is an ERROR (STOP), not a soft warning --
  // "Estate 5-door" when the live name is "Estate" is exactly the kind of near-duplicate
  // CLAUDE.md's own intake rules already warn against ("REUSE the exact existing spelling,
  // don't invent a near-duplicate"), and a silent WARN let it through undetected before.
  // The one escape hatch is an explicit "NEW BODY: <name>" line in section C -- a real new
  // body type is a deliberate, named decision, never a guess this script makes for you.
  const { data: liveBodyTypes, error: e4 } = await sb.from("catalog_body_types").select("name");
  if (e4) throw e4;
  const liveBodyNames = new Set((liveBodyTypes || []).map(b => b.name));
  const usedBodies = new Set(doc.dims.map(d => d.body_type).filter(Boolean));
  for (const b of usedBodies) {
    if (!liveBodyNames.has(b) && !doc.newBodies.has(b)) {
      problems.push(`dimensions.csv: body_type '${b}' does not exist live and isn't declared with "NEW BODY: ${b}" -- typo of one of [${[...liveBodyNames].sort().join(", ")}], or a genuinely new body type that needs that explicit marker`);
    }
  }

  // Needed only for the near-duplicate STOP message's "models using it" context -- paginated
  // since catalog_vehicle_configurations is already past the 1000-row unpaginated cap.
  let modelsUsingEngineCache = null;
  async function modelsUsingEngine(engineId) {
    if (!modelsUsingEngineCache) {
      const [configs, phases, models, brands] = await Promise.all([
        fetchAllPaginated(sb, "catalog_vehicle_configurations", "engine_id, phase_id"),
        fetchAllPaginated(sb, "catalog_phases", "id, model_id, generation_code"),
        fetchAllPaginated(sb, "catalog_models", "id, brand_id, name"),
        fetchAllPaginated(sb, "catalog_brands", "id, name"),
      ]);
      modelsUsingEngineCache = { configs, phases, models, brands };
    }
    const { configs, phases, models, brands } = modelsUsingEngineCache;
    const phaseById = new Map(phases.map(p => [p.id, p]));
    const modelById = new Map(models.map(m => [m.id, m]));
    const brandById = new Map(brands.map(b => [b.id, b]));
    const names = new Set();
    for (const c of configs) {
      if (c.engine_id !== engineId) continue;
      const phase = phaseById.get(c.phase_id);
      if (!phase) continue;
      const model = modelById.get(phase.model_id);
      if (!model) continue;
      const brand = brandById.get(model.brand_id);
      names.add(`${brand ? brand.name : "?"} ${model.name} (${phase.generation_code || "?"})`);
    }
    return [...names];
  }

  for (const e of doc.engines) {
    const kw = Number(e.power_kw);
    const primary = liveEngines.find(le => le.code === e.code && le.power_kw === kw);
    if (primary) {
      e.reuse_or_new = "REUSE";
      continue;
    }
    const alias = liveEngines.find(le => (le.alt_codes || []).includes(e.code));
    if (alias) {
      problems.push(`engine ${e.code} (${e.power_kw}kW): COLLISION -- not a primary code live, but IS an alt_code of ${alias.code} (${alias.power_kw}kW) -- resolve before seeding, do not create a duplicate`);
      continue;
    }
    // CREATE near-duplicate guard -- see findNearDuplicateEngine's own comment for the key.
    // Escape hatch: a non-empty distinct_reason cell on this engine's D. ENGINES row (an
    // intake-document-only field, never written to engines.csv/the DB -- it only ever
    // needs to justify this one STOP at authoring time).
    if (!e.distinct_reason) {
      const dup = findNearDuplicateEngine(e, liveEngines);
      if (dup) {
        const models = await modelsUsingEngine(dup.id);
        problems.push(`engine ${e.code} (${e.power_kw}kW): possible duplicate of ${dup.code}@${dup.power_kw}kW (${models.join(", ") || "no live config"}) -- same displacement/power/torque/fuel/emission_standard/timing_type under a different code. Use REUSE, add as alt_code, or mark DISTINCT: <reason> in this engine's distinct_reason cell.`);
        continue;
      }
    }
    e.reuse_or_new = "NEW";
  }

  // Brand/model near-duplicate: this car's own car.csv name vs. a live brand/model under a
  // different spelling (the Skoda/Škoda case) -- car.csv is parsed identically by both the
  // markdown and manual paths, so this belongs here (wherever doc.car is resolved against
  // live data), not duplicated per path.
  {
    const liveBrands = await fetchAllPaginated(sb, "catalog_brands", "id, name");
    const brandNorm = normalizeName(doc.car.brand);
    const brandMatch = liveBrands.find(b => normalizeName(b.name) === brandNorm && b.name !== doc.car.brand);
    if (brandMatch) {
      problems.push(`car.csv: brand '${doc.car.brand}' normalizes the same as live brand '${brandMatch.name}' -- use the existing spelling, or this is a genuine new brand under a confusingly similar name`);
    } else {
      const exactBrand = liveBrands.find(b => b.name === doc.car.brand);
      if (exactBrand) {
        const liveModels = await fetchAllPaginated(sb, "catalog_models", "brand_id, name");
        const modelNorm = normalizeName(doc.car.model);
        const modelMatch = liveModels.find(
          m => m.brand_id === exactBrand.id && normalizeName(m.name) === modelNorm && m.name !== doc.car.model
        );
        if (modelMatch) {
          problems.push(`car.csv: model '${doc.car.model}' normalizes the same as live model '${modelMatch.name}' (brand ${doc.car.brand}) -- use the existing spelling, or this is a genuine new model under a confusingly similar name`);
        }
      }
    }
  }

  for (const t of doc.transUnits) {
    const hit = liveUnits.find(lu => lu.code === t.unit_code || (lu.alt_codes || []).includes(t.unit_code));
    if (!hit) {
      problems.push(`transmissions.csv: unit_code '${t.unit_code}' has no matching live transmission_units row (checked code and alt_codes) -- add it via its own reviewed migration first, there is no CREATE path for transmissions`);
    }
  }

  for (const d of doc.drivetrains) {
    const hit = liveDrivetrains.find(ld => ld.code === d.drivetrain_code || (ld.alt_codes || []).includes(d.drivetrain_code));
    if (!hit) {
      problems.push(`drivetrains.csv: drivetrain code '${d.drivetrain_code}' has no matching live drivetrain_systems row -- shared reference data, never created inline`);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter(a => !a.startsWith("--"));
  const [intakePath, outDir] = positional;
  if (!intakePath || !outDir) {
    console.error("Usage: node scripts/intake-to-template.mjs <intake.md> <output-dir> [--dry-run]");
    process.exit(1);
  }

  const text = fs.readFileSync(intakePath, "utf8");
  const sections = tokenizeSections(text);
  const problems = [];
  const fills = [];

  const car = sections.A ? parseSectionA(sections.A) : {};
  const { phases, inherits: bInherits } = sections.B ? parseSectionB(sections.B) : { phases: [], inherits: [] };
  const { dims, inherits: cInherits, newBodies } = sections.C ? parseSectionC(sections.C) : { dims: [], inherits: [], newBodies: new Set() };
  const { rows: engines, reuseRefs } = sections.D ? parseSectionD(sections.D) : { rows: [], reuseRefs: [] };
  const transUnits = sections.E ? parseSectionE(sections.E) : [];
  const drivetrains = sections.F ? parseSectionF(sections.F) : [];
  const { configsByPhase, inherits: gInherits, problems: gProblems } = sections.G ? parseSectionG(sections.G) : { configsByPhase: {}, inherits: [], problems: [] };
  const { trims, trimFeatures } = sections.H ? parseSectionH(sections.H) : { trims: [], trimFeatures: [] };
  const faultsRaw = sections.I ? parseSectionI(sections.I) : [];

  problems.push(...gProblems);

  for (const p of phases) {
    if (p.typical_mileage_range) p.typical_mileage_range = normalizeMileageRange(p.typical_mileage_range);
  }

  const doc = { car, phases, dims, engines, reuseRefs, transUnits, drivetrains, configsByPhase, trims, trimFeatures, newBodies, allInherits: [...bInherits, ...cInherits, ...gInherits] };

  resolveInherits(doc, problems, fills);

  validateConfigDictionaryUsage(doc, problems);

  const faults = resolveFaults(faultsRaw, engines, problems);

  // Live resolution runs even if in-document problems were already found, so a single run
  // surfaces the complete problem list (collect-all, not stop-at-first).
  try {
    await liveResolve(doc, problems);
  } catch (err) {
    console.error("[intake-to-template] live DB resolution failed:", err.message || err);
    process.exit(1);
  }

  if (problems.length) {
    console.log(`STOP -- ${problems.length} problem(s) found, nothing written:\n`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`Clean -- ${fills.length} INHERIT fill(s) would be applied:\n`);
    for (const f of fills) console.log(`  - ${f}`);
    console.log("\n--dry-run: nothing written.");
    return;
  }

  writeOutput(outDir, doc, faults);
  console.log(`Wrote ${outDir} -- ${fills.length} INHERIT fill(s) applied:`);
  for (const f of fills) console.log(`  - ${f}`);
}

// ============================================================================
// Write phase -- only reached if problems.length === 0. Every file is built fully in memory
// first (same pattern generate-seed.mjs already uses for its one .sql file, scaled to ~10
// files here) so there is no partial-write risk.
// ============================================================================

function csvLine(cells) {
  return cells.map(c => {
    const s = c == null ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}

function writeCsv(outDir, filename, headers, rows, leadingComments = []) {
  const lines = [...leadingComments, csvLine(headers), ...rows.map(r => csvLine(headers.map(h => r[h] ?? "")))];
  fs.writeFileSync(path.join(outDir, filename), lines.join("\n") + "\n");
}

function writeOutput(outDir, doc, faults) {
  fs.mkdirSync(outDir, { recursive: true });

  writeCsv(outDir, "car.csv", ["brand", "brand_country", "model", "segment", "origin_country"], [doc.car]);
  writeCsv(outDir, "phases.csv",
    ["generation_code", "phase_label", "year_from", "year_to", "display_name", "platform_code", "safety_rating", "ncap_year", "ncap_adult_pct", "ncap_child_pct", "ncap_pedestrian_pct", "ncap_safety_assist_pct", "avg_market_price_eur", "price_range_min_eur", "price_range_max_eur", "typical_mileage_range", "resale_value_rating", "towing_capacity_kg"],
    doc.phases);
  // "# NEW BODY: <name>" leading comments survive into the CSV so validate-template.mjs --
  // which only ever sees the CSV, never this document -- can recognize the same explicit
  // "this is deliberately new, not a typo" declaration downstream.
  writeCsv(outDir, "dimensions.csv",
    ["phase_label", "body_type", "length_mm", "width_mm", "height_mm", "ground_clearance_mm", "curb_weight_kg", "boot_capacity_liters", "boot_max_liters", "gross_vehicle_weight_kg", "payload_kg", "fuel_tank_capacity_liters", "seats_count"],
    doc.dims,
    [...doc.newBodies].map(b => `# NEW BODY: ${b}`));
  writeCsv(outDir, "engines.csv", ["reuse_or_new", ...ENGINE_FIELDS], doc.engines);
  writeCsv(outDir, "transmissions.csv", ["unit_code"], doc.transUnits);
  if (doc.drivetrains.length) writeCsv(outDir, "drivetrains.csv", ["drivetrain_code"], doc.drivetrains);
  writeCsv(outDir, "trims.csv", ["phase_label", "name", "tier"], doc.trims);
  writeCsv(outDir, "trim_features.csv", ["phase_label", "trim_name", "feature", "is_optional"], doc.trimFeatures);
  writeCsv(outDir, "faults.csv", ["component_type", "target_code", "target_power_kw", "fault", "severity"], faults);

  for (const [phaseLabel, rows] of Object.entries(doc.configsByPhase)) {
    const bodyGbDt = [...new Set(rows.flatMap(r => r.combos.map(c => `${c.body}|${c.gearbox}|${c.drivetrain}`)))];
    const headers = ["phase_label", "engine_code", "power_kw", ...bodyGbDt];
    const csvRows = rows.map(r => {
      const row = { phase_label: phaseLabel, engine_code: r.engine_code, power_kw: r.power_kw };
      for (const col of bodyGbDt) row[col] = "";
      for (const c of r.combos) row[`${c.body}|${c.gearbox}|${c.drivetrain}`] = "x";
      return row;
    });
    writeCsv(outDir, `configs-${phaseLabel}.csv`, headers, csvRows);
  }
}

main();
