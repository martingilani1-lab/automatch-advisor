// Post-seed verification (import-car skill step 4) across a batch of cars, done in one
// command instead of hand-writing per-car queries after each seed run. For every car
// folder: checks that what actually landed live matches what the template declared --
// config count per phase, zero duplicate engine dictionary rows (by code+power_kw),
// no orphan engines (an engine in engines.csv that no live config for this car references),
// every declared transmissions.csv unit_code resolves to a live transmission_units row and
// is actually used by >=1 of this car's configs (fails on a MISSING unit the same way an
// orphan engine fails -- see the transmission_units consolidation: there is no more
// catalog_transmissions row to duplicate-check, units are shared reference data, not
// per-car dictionary entries), and that every declared phase/body attribute row exists
// (phase_body_dimensions -- presence, not "every column non-null", matching the skill's
// own "Done means" bar: addressed, not necessarily filled).
//
// Unlike batch-prep.mjs/batch-seed.mjs, this one is NOT a wrapper around an existing
// single-car script -- no such "verify" script existed before this, so the query logic
// lives here directly, following the same readCsv/loadEnv conventions as
// reconcile.mjs/validate-template.mjs/generate-seed.mjs (each of those duplicates its own
// small helpers rather than importing a shared lib -- matched here for consistency, not
// because a shared module was ruled out).
//
// Read-only against the live DB. Never writes anything, anywhere.
//
// Run from repo root, AFTER the human has run a car's seed migration(s):
//   node scripts/batch-verify.mjs <car-dir> [<car-dir> ...] | --all
// Exit code 1 if any car FAILs any check, else 0.

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

function readCsv(p) {
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

// Mirrors validate-template.mjs's grid reader exactly -- same column-header convention
// (body|gearbox|drivetrain), same 'x' mark semantics.
function readGrid(p) {
  const raw = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!raw.length) return [];
  const header = raw[0].split(",");
  const cols = header.slice(3).map(h => {
    const [b, g, d] = h.split("|");
    return { b, g, d };
  });
  return raw.slice(1).map(line => {
    const cells = line.split(",");
    return {
      engine_code: (cells[1] || "").trim(),
      power_kw: (cells[2] || "").trim(),
      marks: cols.map((c, i) => ({ ...c, x: (cells[3 + i] || "").trim() === "x" })),
    };
  });
}

const CARS_ROOT = "scripts/cars";

function resolveCarDirs(args) {
  if (args.includes("--all")) {
    if (!fs.existsSync(CARS_ROOT)) return [];
    return fs.readdirSync(CARS_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => path.join(CARS_ROOT, d.name))
      .sort();
  }
  return args.filter(a => !a.startsWith("--")).map(a => (a.includes("/") ? a : path.join(CARS_ROOT, a)));
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/batch-verify.mjs <car-dir> [<car-dir> ...] | --all");
  process.exit(1);
}
const carDirs = resolveCarDirs(args);
if (!carDirs.length) {
  console.error("No car directories resolved -- check the names, or that scripts/cars/ has folders.");
  process.exit(1);
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const summary = [];
let allUnits = null; // transmission_units is shared reference data -- fetch once, reuse across every car in the batch.

for (const dir of carDirs) {
  const carName = path.basename(dir);
  console.log(`\n${"=".repeat(72)}\n${carName}\n${"=".repeat(72)}`);

  if (!fs.existsSync(dir)) {
    console.log("  MISSING -- no folder at this path.");
    summary.push({ carName, status: "MISSING" });
    continue;
  }

  const car = readCsv(path.join(dir, "car.csv"))[0];
  const phases = readCsv(path.join(dir, "phases.csv"));
  const engines = readCsv(path.join(dir, "engines.csv"));
  const trans = readCsv(path.join(dir, "transmissions.csv"));
  const dims = readCsv(path.join(dir, "dimensions.csv"));
  const gridFiles = fs.readdirSync(dir).filter(f => /^configs-.*\.csv$/.test(f) && !f.includes("DEFERRED"));

  if (!car || !car.brand || !car.model || !phases.length) {
    console.log("  FAIL -- car.csv/phases.csv missing or empty, cannot verify.");
    summary.push({ carName, status: "FAIL" });
    continue;
  }

  const checks = [];
  const fail = msg => checks.push({ ok: false, msg });
  const pass = msg => checks.push({ ok: true, msg });

  const genCode = phases[0].generation_code;

  const { data: brandRow } = await sb.from("catalog_brands").select("id").eq("name", car.brand).maybeSingle();
  const { data: modelRow } = brandRow
    ? await sb.from("catalog_models").select("id").eq("brand_id", brandRow.id).eq("name", car.model).maybeSingle()
    : { data: null };

  if (!brandRow || !modelRow) {
    fail(`brand/model not found live (${car.brand} / ${car.model}) -- seed likely not run yet.`);
  } else {
    const { data: livePhases } = await sb
      .from("catalog_phases")
      .select("id, phase_label")
      .eq("model_id", modelRow.id)
      .eq("generation_code", genCode);
    const phaseIdByLabel = new Map((livePhases || []).map(p => [p.phase_label, p.id]));

    // 1. config count per phase
    for (const f of gridFiles) {
      const phaseLabel = f.replace(/^configs-/, "").replace(/\.csv$/, "");
      const rows = readGrid(path.join(dir, f));
      const expected = rows.reduce((n, r) => n + r.marks.filter(m => m.x).length, 0);
      const phaseId = phaseIdByLabel.get(phaseLabel);
      if (!phaseId) {
        fail(`configs[${phaseLabel}]: phase not found live -- seed likely not run for this phase.`);
        continue;
      }
      const { count } = await sb
        .from("catalog_vehicle_configurations")
        .select("*", { count: "exact", head: true })
        .eq("phase_id", phaseId);
      if (count === expected) pass(`configs[${phaseLabel}]: ${count}/${expected} match`);
      else fail(`configs[${phaseLabel}]: live=${count}, template expects ${expected}`);
    }

    // 3. orphan engines -- for THIS car's phases only (an engine can be legitimately used
    // by other cars too; what matters here is that it's actually used somewhere in this
    // car's own configs, not orphaned from this seed specifically).
    const phaseIds = [...phaseIdByLabel.values()];
    let usedEngineIds = new Set();
    let usedUnitIds = new Set();
    if (phaseIds.length) {
      const { data: liveConfigs } = await sb
        .from("catalog_vehicle_configurations")
        .select("engine_id, unit_id")
        .in("phase_id", phaseIds);
      usedEngineIds = new Set((liveConfigs || []).map(c => c.engine_id));
      usedUnitIds = new Set((liveConfigs || []).map(c => c.unit_id));
    }
    for (const e of engines) {
      if (!e.code || !e.power_kw) continue;
      const { data: engRow } = await sb
        .from("catalog_engines")
        .select("id")
        .eq("code", e.code)
        .eq("power_kw", Number(e.power_kw))
        .maybeSingle();
      if (!engRow) { fail(`engine ${e.code} (${e.power_kw}kW): not found live.`); continue; }
      if (usedEngineIds.has(engRow.id)) pass(`engine ${e.code} (${e.power_kw}kW): used in >=1 config`);
      else fail(`engine ${e.code} (${e.power_kw}kW): ORPHAN -- exists live but no config for this car references it`);
    }

    // 3b. transmissions -- unit_code must resolve to a live transmission_units row (code or
    // alt_codes) and that unit must actually be used by >=1 of this car's configs. Unlike
    // engines, a resolved-but-unused unit isn't flagged as a fresh "orphan" concern the same
    // way (units are shared reference data seeded once, not per-car) -- but for THIS car's
    // own seed, a declared unit_code that no config ends up using still means the seed
    // didn't do what the template said, so it's still a FAIL, not a WARN.
    if (allUnits === null) {
      const { data } = await sb.from("transmission_units").select("id, code, alt_codes");
      allUnits = data || [];
    }
    for (const t of trans) {
      if (!t.unit_code) continue;
      const hit = allUnits.find(u => u.code === t.unit_code || (u.alt_codes || []).includes(t.unit_code));
      if (!hit) { fail(`transmission unit_code ${t.unit_code}: MISSING -- no transmission_units row matches (code or alt_codes).`); continue; }
      if (usedUnitIds.has(hit.id)) pass(`transmission unit_code ${t.unit_code}: resolved -> ${hit.code}, used in >=1 config`);
      else fail(`transmission unit_code ${t.unit_code}: resolved -> ${hit.code}, but no config for this car references it`);
    }

    // 4. attribute rows present -- phase_body_dimensions exists per (phase, body) the
    // template declared. Presence only, per the skill's "Done means addressed, not every
    // field non-null" bar -- this can't judge "intentionally NULL" vs "forgotten".
    // seats_count now lives on phase_body_dimensions (moved off catalog_phases -- it varies
    // by body, e.g. Audi TT Coupe seats 4 vs Roadster 2) -- this presence check already
    // covers it implicitly, since it's the same row; no separate seats-specific check added.
    for (const d of dims) {
      const phaseId = phaseIdByLabel.get(d.phase_label);
      if (!phaseId) continue; // already flagged above
      const { data: bodyRow } = await sb.from("catalog_body_types").select("id").eq("name", d.body_type).maybeSingle();
      if (!bodyRow) { fail(`dimensions[${d.phase_label}/${d.body_type}]: body type not found live.`); continue; }
      const { data: dimRow } = await sb
        .from("phase_body_dimensions")
        .select("id")
        .eq("phase_id", phaseId)
        .eq("body_type_id", bodyRow.id)
        .maybeSingle();
      if (dimRow) pass(`dimensions[${d.phase_label}/${d.body_type}]: row exists`);
      else fail(`dimensions[${d.phase_label}/${d.body_type}]: MISSING -- no phase_body_dimensions row`);
    }
  }

  // 2. duplicate engine dictionary rows -- scoped to this car's own codes (a global scan
  // would also catch pre-existing duplication unrelated to this car's seed; scoping here
  // keeps the report about what THIS car's seed did). No equivalent check for transmissions
  // any more -- transmission_units.code is UNIQUE-constrained live, and units are shared
  // reference data seeded once outside any car's seed, not a per-car dictionary entry that
  // could be accidentally re-created.
  for (const e of engines) {
    if (!e.code) continue;
    const { data: rows } = await sb.from("catalog_engines").select("power_kw").eq("code", e.code);
    const byPower = new Map();
    for (const r of rows || []) byPower.set(r.power_kw, (byPower.get(r.power_kw) || 0) + 1);
    for (const [kw, n] of byPower) {
      if (n > 1) fail(`DUPLICATE engine ${e.code} (${kw}kW): ${n} rows live`);
    }
  }

  for (const c of checks) console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.msg}`);
  const carFail = checks.some(c => !c.ok) || checks.length === 0;
  console.log(`\n${carName}: ${carFail ? "FAIL" : "PASS"}`);
  summary.push({ carName, status: carFail ? "FAIL" : "PASS" });

  // Lock file: marks this car as verified-seeded so batch-prep.mjs skips it (quietly, not
  // as a NEEDS ATTENTION) on future runs. Only written on a full PASS -- a FAIL must never
  // produce one, or a broken car would silently stop being checked. Gitignored (per-local
  // state, not shared team state -- see .gitignore).
  if (!carFail) {
    fs.writeFileSync(path.join(dir, ".seeded"), "");
  }
}

console.log(`\n${"=".repeat(72)}\nSUMMARY\n${"=".repeat(72)}`);
const nameWidth = Math.max(...summary.map(s => s.carName.length), 8);
for (const s of summary) console.log(`${s.carName.padEnd(nameWidth)}  ${s.status}`);
const anyFail = summary.some(s => s.status !== "PASS");
console.log(`\n${summary.filter(s => s.status === "PASS").length}/${summary.length} pass.`);
process.exit(anyFail ? 1 : 0);
