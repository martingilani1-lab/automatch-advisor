// Validates a filled new-car intake template BEFORE any seed SQL is generated from it.
// Catches problems that are cheap to fix here and expensive to debug once they're buried
// in a 300-line generated migration. Read-only against the live DB; never writes, never
// seeds.
//
// Checks:
//   - config-grid rows reference an engine (code+power_kw) that's actually in engines.csv
//   - config-grid 'x' cells reference a gearbox code that's actually in transmissions.csv
//     (transmissions.csv is unit_code only post catalog_transmissions -> transmission_units
//     consolidation -- no reuse_or_new/type/speeds columns anymore)
//   - fault severity values are in the recommended vocabulary (critical/moderate/minor —
//     not a live CHECK constraint today, flagged for consistency, not schema truth)
//   - engines.csv emission_standard values are in the frozen, spaceless vocabulary a real
//     catalog_engines CHECK constraint enforces live (catalog_engines_emission_standard_check,
//     added in 20261006140000_normalize_emission_standard.sql) — this one IS schema truth,
//     catching a bad value here instead of at seed-run time
//   - phases.csv / dimensions.csv numeric columns that are empty on EVERY row — not wrong,
//     but the seed generator MUST cast these explicitly (::integer) or Postgres will infer
//     'unknown'/text and the INSERT will fail (the Golf IV all-NULL-NCAP bug)
//   - orphan engines: rows in engines.csv never marked 'x' in any config grid
//   - dimensions.csv body types that don't exist live (informational — may be an
//     intentional NEW body type, or a typo; not auto-distinguishable)
//   - no live transmission_units or drivetrain_systems row (global, not scoped to this
//     car) has a reliability_note/maintenance_note still starting with the literal string
//     "DRAFT" — an early catch (before a seed even exists) alongside batch-verify.mjs's
//     post-seed version of the same check, so an unreviewed draft note can't go live
//     unnoticed
//
// Run from repo root: node scripts/validate-template.mjs [template-dir]
// Exit code 1 if any ERROR was found; WARNINGs alone exit 0.

import fs from "fs";
import path from "path";
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

function loadEnv() {
  const text = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter(l => l.includes("="))
      .map(l => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
      })
  );
}

// RFC4180: a doubled quote ("") inside a quoted field is a literal quote, not a close+reopen.
// The previous version toggled inQ on every '"' and dropped all of them -- correct for a
// field that's merely wrapped in quotes, but it silently stripped quote characters that were
// meant to survive as literal text (e.g. a fault description quoting "Kangarooing").
function parseCsvLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function readCsv(p) {
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8").split("\n");
  const contentLines = raw.map((l, i) => [l, i + 1]).filter(([l]) => l.trim() && !l.trim().startsWith("#"));
  if (!contentLines.length) return [];
  const header = parseCsvLine(contentLines[0][0]);
  return contentLines.slice(1).map(([line, lineNum]) => {
    const cells = parseCsvLine(line);
    const row = { __line: lineNum };
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function readGrid(p) {
  const raw = fs.readFileSync(p, "utf8").split("\n");
  const contentLines = raw.map((l, i) => [l, i + 1]).filter(([l]) => l.trim() && !l.trim().startsWith("#"));
  if (!contentLines.length) return [];
  const header = contentLines[0][0].split(",");
  const cols = header.slice(3).map(h => {
    const [b, g, d] = h.split("|");
    return { b, g, d };
  });
  return contentLines.slice(1).map(([line, lineNum]) => {
    const cells = line.split(",");
    return {
      line: lineNum,
      engine_code: (cells[1] || "").trim(),
      power_kw: (cells[2] || "").trim(),
      marks: cols.map((c, i) => ({ ...c, x: (cells[3 + i] || "").trim() === "x" })),
    };
  });
}

const dir = process.argv[2] || "scripts/new-car-template";
const problems = [];
const err = (file, row, msg) => problems.push({ level: "ERROR", file, row, msg });
const warn = (file, row, msg) => problems.push({ level: "WARN", file, row, msg });

const phases = readCsv(path.join(dir, "phases.csv"));
const dims = readCsv(path.join(dir, "dimensions.csv"));
const engines = readCsv(path.join(dir, "engines.csv"));
const trans = readCsv(path.join(dir, "transmissions.csv"));
const faults = readCsv(path.join(dir, "faults.csv"));

const gridFiles = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => /^configs-.*\.csv$/.test(f) && !f.includes("DEFERRED"))
  : [];
const grids = gridFiles.map(f => ({ file: f, rows: readGrid(path.join(dir, f)) }));

// 1 & 2: config rows reference real engines/gearboxes
const engineKeys = new Set(engines.filter(e => e.code && e.power_kw).map(e => `${e.code}|${e.power_kw}`));
const gearboxCodes = new Set(trans.filter(t => t.unit_code).map(t => t.unit_code));
const usedEngineKeys = new Set();

for (const g of grids) {
  for (const r of g.rows) {
    const anyMark = r.marks.some(m => m.x);
    if (!anyMark) continue;
    const key = `${r.engine_code}|${r.power_kw}`;
    if (!r.engine_code) continue;
    if (!engineKeys.has(key)) {
      err(g.file, r.line, `engine ${r.engine_code} (${r.power_kw}kW) has a marked config but is not in engines.csv`);
    } else {
      usedEngineKeys.add(key);
    }
    for (const m of r.marks) {
      if (!m.x) continue;
      if (m.g && !gearboxCodes.has(m.g)) {
        err(g.file, r.line, `column ${m.b}|${m.g}|${m.d} marked 'x' but gearbox '${m.g}' is not in transmissions.csv`);
      }
    }
  }
}

// 3: orphan engines
for (const e of engines) {
  if (!e.code || !e.power_kw) continue;
  const key = `${e.code}|${e.power_kw}`;
  if (!usedEngineKeys.has(key)) {
    warn("engines.csv", e.__line, `engine ${e.code} (${e.power_kw}kW) is never marked 'x' in any config grid — orphaned, or the grid isn't filled yet`);
  }
}

// 4: fault severity + empty fault text
const ALLOWED_SEVERITY = ["critical", "moderate", "minor"];
for (const f of faults) {
  if (f.severity && !ALLOWED_SEVERITY.includes(f.severity)) {
    err("faults.csv", f.__line, `severity '${f.severity}' not in (${ALLOWED_SEVERITY.join(",")}) — not a live DB CHECK, but keep it consistent`);
  }
  if (f.component_type && !f.fault) {
    err("faults.csv", f.__line, `fault text is empty for ${f.component_type} ${f.target_code}`);
  }
}

// 4b: emission_standard vocabulary — mirrors the live CHECK constraint
// (catalog_engines_emission_standard_check, added in 20261006140000_normalize_emission_standard.sql)
// exactly, spaceless spellings only ('Euro 6d' is the old, now-normalized-away spelling —
// catching it here instead of at seed-run time against a constraint that didn't exist
// before this check was added).
const ALLOWED_EMISSION_STANDARD = ["Euro1", "Euro2", "Euro3", "Euro4", "Euro5", "Euro6", "Euro6c", "Euro6d", "Euro6e"];
for (const e of engines) {
  if (e.emission_standard && !ALLOWED_EMISSION_STANDARD.includes(e.emission_standard)) {
    err("engines.csv", e.__line, `emission_standard '${e.emission_standard}' is not in the frozen vocabulary (${ALLOWED_EMISSION_STANDARD.join(", ")}) — the live catalog_engines CHECK constraint will reject this; a space ('Euro 6d') is the usual mistake, not a new standard`);
  }
}

// 5: NCAP/int columns that would hit the VALUES-CTE text-cast issue
const PHASE_INT_COLS = [
  "year_from", "year_to", "safety_rating", "ncap_year", "ncap_adult_pct", "ncap_child_pct",
  "ncap_pedestrian_pct", "ncap_safety_assist_pct", "avg_market_price_eur", "price_range_min_eur",
  "price_range_max_eur", "towing_capacity_kg",
];
for (const col of PHASE_INT_COLS) {
  if (phases.length && phases.every(p => (p[col] ?? "") === "")) {
    warn("phases.csv", "*", `column '${col}' is empty on every row — fine, but the seed generator MUST cast it explicitly (::integer), or Postgres infers 'unknown'/text and the INSERT fails (the Golf IV NCAP bug)`);
  }
}
// seats_count lives on dimensions.csv (phase x body), not phases.csv -- it varies by body
// (e.g. Audi TT Coupe seats 4, Roadster seats 2), same reasoning as every other dimension.
const DIM_INT_COLS = [
  "length_mm", "width_mm", "height_mm", "ground_clearance_mm", "curb_weight_kg",
  "boot_capacity_liters", "boot_max_liters", "gross_vehicle_weight_kg", "payload_kg",
  "seats_count",
];
for (const col of DIM_INT_COLS) {
  if (dims.length && dims.every(d => (d[col] ?? "") === "")) {
    warn("dimensions.csv", "*", `column '${col}' is empty on every row — same VALUES-CTE cast requirement as above`);
  }
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 6: body types vs live
  if (dims.length) {
    const { data: liveBody, error } = await sb.from("catalog_body_types").select("name");
    if (error) throw error;
    const liveNames = new Set((liveBody || []).map(b => b.name));
    const templateBodies = new Set(dims.map(d => d.body_type).filter(Boolean));
    for (const b of templateBodies) {
      if (!liveNames.has(b)) {
        warn("dimensions.csv", "*", `body type '${b}' does not exist live — will be CREATEd by the seed. Confirm that's intended, not a typo of: ${[...liveNames].join(", ")}`);
      }
    }
  }

  // 7: no live transmission_units/drivetrain_systems note still starts with "DRAFT" --
  // global, not scoped to this car's own units, since the point is catching a forgotten
  // draft systemically (see batch-verify.mjs's post-seed version of this same check).
  {
    const { data: units, error: e1 } = await sb.from("transmission_units").select("code, reliability_note, maintenance_note");
    if (e1) throw e1;
    for (const u of units || []) {
      for (const field of ["reliability_note", "maintenance_note"]) {
        if (u[field] && u[field].startsWith("DRAFT")) {
          err("(live reference data)", "*", `transmission_units '${u.code}'.${field} starts with 'DRAFT' -- not yet reviewed, must not stay live`);
        }
      }
    }
    const { data: drivetrains, error: e2 } = await sb.from("drivetrain_systems").select("code, reliability_note, maintenance_note");
    if (e2) throw e2;
    for (const d of drivetrains || []) {
      for (const field of ["reliability_note", "maintenance_note"]) {
        if (d[field] && d[field].startsWith("DRAFT")) {
          err("(live reference data)", "*", `drivetrain_systems '${d.code}'.${field} starts with 'DRAFT' -- not yet reviewed, must not stay live`);
        }
      }
    }
  }

  console.log(`Validated ${dir}\n`);
  for (const p of problems) {
    console.log(`[${p.level}] ${p.file}:${p.row}  ${p.msg}`);
  }
  const errors = problems.filter(p => p.level === "ERROR");
  const warns = problems.filter(p => p.level === "WARN");
  console.log(`\n${errors.length} error(s), ${warns.length} warning(s).`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
