// Generic, data-driven seed-SQL generator for ONE car's filled intake template. This is
// the reusable building block batch-seed.mjs calls per car — the same generation logic
// that was previously hand-written per car (Golf IV, León, Toledo, Audi A3) is now one
// script, following the import-car skill exactly: casts on every VALUES-CTE literal,
// row-count guards on any UPDATE, reconcile-resolved FKs (never hand-typed UUIDs),
// dependency order.
//
// Read-only against the live DB (used only to resolve REUSE/CREATE and to detect alias
// drift for the guarded alt_codes UPDATE section). Writes ONE .sql file. NEVER executes
// anything against Supabase, no matter what flags are passed.
//
// Run from repo root: node scripts/generate-seed.mjs <template-dir> [output-path]
// If output-path is omitted, writes to supabase/migrations/<timestamp>_seed_<car>.sql.

import fs from "fs";
import path from "path";
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

// Column lists: SINGLE SOURCE OF TRUTH per table. Each constant below is used BOTH to
// build the corresponding "insert into TABLE (...)" column list further down AND by the
// live preflight check (REQUIRED_COLUMNS, derived from these same constants, immediately
// below) — a column added to an INSERT here is automatically covered by the preflight
// check, and vice versa, since both read the exact same array. This is what the
// seats_count-ordering bug's fix should have been from the start: previously
// REQUIRED_COLUMNS was a second, independently hand-typed list that could silently drift
// from what the INSERTs actually wrote.
const BRANDS_COLS = ["name", "country"];
const MODELS_COLS = ["brand_id", "name", "segment", "origin_country"];
const PHASES_COLS = [
  "model_id", "generation_code", "phase_label", "year_from", "year_to", "display_name",
  "platform_code", "safety_rating", "ncap_year", "ncap_adult_pct", "ncap_child_pct",
  "ncap_pedestrian_pct", "ncap_safety_assist_pct", "avg_market_price_eur",
  "price_range_min_eur", "price_range_max_eur", "typical_mileage_range",
  "resale_value_rating", "towing_capacity_kg",
];
const BODY_TYPES_COLS = ["name"];
const ENGINES_COLS = [
  "code", "alt_codes", "display_name", "displacement_cc", "power_kw", "fuel_type", "torque_nm",
  "cylinders", "emission_standard", "timing_type", "engine_oil_capacity_liters",
  "timing_replacement_km", "hybrid_type",
];
// transmission_units is reference data (not seeded per-car — see CLAUDE.md "a gearbox with
// no unit STOPS the import"), but its columns are still checked live here since every
// config/fault INSERT below resolves against code/alt_codes and would fail confusingly if
// either were missing.
const TRANSMISSION_UNITS_COLS = ["id", "code", "alt_codes"];
const DIMENSIONS_COLS = [
  "phase_id", "body_type_id", "length_mm", "width_mm", "height_mm", "ground_clearance_mm",
  "curb_weight_kg", "boot_capacity_liters", "boot_max_liters", "gross_vehicle_weight_kg",
  "payload_kg", "fuel_tank_capacity_liters", "seats_count",
];
const CONFIGS_COLS = ["phase_id", "body_type_id", "engine_id", "unit_id", "drivetrain_id"];
const TRIMS_COLS = ["phase_id", "name", "tier"];
const TRIM_FEATURES_COLS = ["trim_id", "feature", "is_optional"];
// catalog_component_faults has FOUR separate INSERTs (engine / transmission / drivetrain /
// vehicle faults), each writing a different subset of columns — REQUIRED_COLUMNS below is
// their union, computed, not retyped. drivetrain/vehicle added alongside
// 20261009101500_extend_catalog_component_faults_to_4_levels.sql (schema) and
// scripts/catalog-vocabularies.json's new catalog_component_faults.category entry.
const COMPONENT_FAULTS_ENGINE_COLS = ["component_type", "engine_id", "fault", "severity"];
const COMPONENT_FAULTS_TRANS_COLS = ["component_type", "unit_id", "fault", "severity"];
const COMPONENT_FAULTS_DRIVETRAIN_COLS = ["component_type", "drivetrain_id", "fault", "severity"];
// Vehicle-level faults attach to a specific PHASE, not a component — faults.csv's
// target_code column is repurposed to hold the phase_label for these rows (resolved the
// same way dimensions.csv/configs/trims already resolve phase_label -> phase_id, see the
// phase_lookup CTEs below), and category is REQUIRED (catalog_component_faults_category_check).
const COMPONENT_FAULTS_VEHICLE_COLS = ["component_type", "phase_id", "fault", "severity", "category"];

// Checked live before generating anything (see preflightSchemaCheck below). This is what
// closes the seats_count-ordering bug class: running this script before a schema migration
// it depends on (e.g. the phase_body_dimensions.seats_count move) has been applied now
// fails loudly here, with NO file written, instead of writing a seed that only fails once
// the human runs it in the SQL editor.
const REQUIRED_COLUMNS = {
  catalog_brands: BRANDS_COLS,
  catalog_models: MODELS_COLS,
  catalog_phases: PHASES_COLS,
  catalog_body_types: BODY_TYPES_COLS,
  catalog_engines: ENGINES_COLS,
  transmission_units: TRANSMISSION_UNITS_COLS,
  phase_body_dimensions: DIMENSIONS_COLS,
  catalog_vehicle_configurations: CONFIGS_COLS,
  catalog_trims: TRIMS_COLS,
  catalog_trim_features: TRIM_FEATURES_COLS,
  catalog_component_faults: [...new Set([...COMPONENT_FAULTS_ENGINE_COLS, ...COMPONENT_FAULTS_TRANS_COLS, ...COMPONENT_FAULTS_DRIVETRAIN_COLS, ...COMPONENT_FAULTS_VEHICLE_COLS])],
};

// These scripts only have the PostgREST/supabase-js client (no direct Postgres
// connection), so information_schema.columns isn't queryable the same way as a regular
// table. Instead: probe each table by SELECTing its required columns (limit 0, no rows
// fetched) — Postgres raises 42703 (undefined_column) with an exact "column X does not
// exist" message if any are missing. The combined per-table probe is the fast path (one
// request); only on failure does it fall back to a per-column probe to name exactly which
// one(s) are missing.
async function preflightSchemaCheck(sb) {
  const missing = [];
  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    const { error } = await sb.from(table).select(cols.join(",")).limit(0);
    if (!error) continue;
    if (error.code !== "42703") {
      missing.push({ table, col: "(table itself)", detail: error.message });
      continue;
    }
    for (const col of cols) {
      const { error: colErr } = await sb.from(table).select(col).limit(0);
      if (colErr && colErr.code === "42703") missing.push({ table, col });
    }
  }
  return missing;
}

function loadEnv() {
  const text = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text.split("\n").filter(l => l.includes("=")).map(l => {
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
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function readGrid(p) {
  const raw = fs.readFileSync(p, "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  if (!raw.length) return [];
  const header = raw[0].split(",");
  const cols = header.slice(3).map(h => {
    const [b, g, d] = h.split("|");
    return { b, g, d };
  });
  const out = [];
  for (const line of raw.slice(1)) {
    const cells = line.split(",");
    const phase_label = cells[0], engine_code = cells[1], power_kw = cells[2];
    cols.forEach((col, i) => {
      if ((cells[3 + i] || "").trim() === "x") out.push({ phase_label, engine_code, power_kw, ...col });
    });
  }
  return out;
}

const esc = s => (s || "").replace(/'/g, "''");
const nOrNull = v => (v === "" || v == null) ? "null" : v;
const sOrNull = v => (v === "" || v == null) ? "null" : `'${esc(v)}'`;
const nInt = v => (v === "" || v == null) ? "null::integer" : `${v}::integer`;
const nNum = v => (v === "" || v == null) ? "null::numeric" : `${v}::numeric`;
const sTxt = v => (v === "" || v == null) ? "null::text" : `'${esc(v)}'::text`;
// Models with no real generation code (e.g. a brand-new single-generation nameplate like
// Cupra Terramar) get generation_code = NULL in catalog_phases (via sTxt above), not an
// empty string. Every later lookup keyed by this car's generation must match that the
// same way -- a literal `cp.generation_code = ''` comparison would silently match zero
// rows against a NULL column (NULL = '' is NULL, never true in Postgres), so dimensions/
// configs/trims/the post-condition assertions would all come up empty. This helper is the
// single place that decides `= 'X'` vs `is null`, used everywhere genCode was previously
// interpolated directly.
const genCodeSql = gc => (gc === "" || gc == null) ? "cp.generation_code is null" : `cp.generation_code = '${esc(gc)}'`;
const genCodeLabel = gc => (gc === "" || gc == null) ? "no generation code" : gc;
const arrLit = alt => alt ? `'{${alt.split("|").map(s => s.trim()).filter(Boolean).map(esc).join(",")}}'` : "'{}'";
const setEq = (a, b) => {
  const sa = new Set(a || []), sb = new Set(b || []);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
};
const pgArrayLiteral = arr => `{${(arr || []).join(",")}}`;

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node scripts/generate-seed.mjs <template-dir> [output-path]");
    process.exit(1);
  }
  const outArg = process.argv[3];

  const car = readCsv(path.join(dir, "car.csv"))[0];
  const phases = readCsv(path.join(dir, "phases.csv"));
  const dims = readCsv(path.join(dir, "dimensions.csv"));
  const engines = readCsv(path.join(dir, "engines.csv"));
  const trans = readCsv(path.join(dir, "transmissions.csv"));
  const trims = readCsv(path.join(dir, "trims.csv"));
  const trimFeatures = readCsv(path.join(dir, "trim_features.csv"));
  const faults = readCsv(path.join(dir, "faults.csv"));

  if (!car || !car.brand || !car.model) {
    console.error(`${dir}: car.csv is empty or missing brand/model — nothing to generate.`);
    process.exit(1);
  }
  if (!phases.length) {
    console.error(`${dir}: phases.csv is empty — nothing to generate.`);
    process.exit(1);
  }

  const gridFiles = fs.readdirSync(dir).filter(f => /^configs-.*\.csv$/.test(f) && !f.includes("DEFERRED"));
  const configs = gridFiles.flatMap(f => readGrid(path.join(dir, f)));

  const genCode = phases[0].generation_code;

  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const missingCols = await preflightSchemaCheck(sb);
  if (missingCols.length) {
    for (const m of missingCols) {
      console.error(`Preflight failed: column ${m.col} does not exist in table ${m.table} — run schema migrations first.`);
    }
    process.exit(1);
  }

  const { data: liveBrands } = await sb.from("catalog_brands").select("name");
  const { data: liveBodyTypes } = await sb.from("catalog_body_types").select("name");
  const { data: liveEngines } = await sb.from("catalog_engines").select("code, power_kw, alt_codes");
  const { data: liveUnits } = await sb.from("transmission_units").select("id, code, alt_codes");
  const { data: liveDrivetrains } = await sb.from("drivetrain_systems").select("code");

  const liveEngineMap = new Map(liveEngines.map(e => [`${e.code}|${e.power_kw}`, e]));
  const liveBodySet = new Set(liveBodyTypes.map(b => b.name));
  const liveDrivetrainSet = new Set(liveDrivetrains.map(d => d.code));

  // Transmission match is by real gearbox identity, never speed count (CLAUDE.md "Adding a
  // new car / model — RULES"): a unit_code resolves if it's a transmission_units.code OR
  // sits in that row's alt_codes. There is no CREATE path here anymore — a gearbox with no
  // matching unit is a hard STOP (see the unresolved-codes check below), not something this
  // script can seed inline.
  const resolveUnit = code => liveUnits.find(u => u.code === code || (u.alt_codes || []).includes(code));

  const reuseEngines = engines.filter(e => e.reuse_or_new === "REUSE" && e.code && e.power_kw);
  const newEngines = engines.filter(e => e.reuse_or_new === "NEW" && e.code && e.power_kw);
  const usedUnitCodes = [...new Set(trans.map(t => t.unit_code).filter(Boolean))];
  const unresolvedUnitCodes = usedUnitCodes.filter(c => !resolveUnit(c));

  if (unresolvedUnitCodes.length) {
    console.error(`${dir}/transmissions.csv references unit_code(s) with no matching transmission_units row: ${unresolvedUnitCodes.join(", ")}`);
    console.error("STOP — per CLAUDE.md: a gearbox with no matching unit blocks the import. Add the unit via its own reviewed migration first (see the transmission_units linking-audit workflow); this script does not create transmission rows.");
    process.exit(1);
  }

  const usedBodies = [...new Set(dims.map(d => d.body_type).filter(Boolean))];
  const newBodies = usedBodies.filter(b => !liveBodySet.has(b));

  const usedDrivetrains = [...new Set(configs.map(c => c.d).filter(d => d && d !== "FWD" && d !== "RWD"))];

  // detect alias drift: REUSE engines whose template alt_codes differ from live
  const aliasUpdates = [];
  for (const e of reuseEngines) {
    if (!e.alt_codes) continue;
    const templateAlt = e.alt_codes.split("|").map(s => s.trim()).filter(Boolean);
    const live = liveEngineMap.get(`${e.code}|${e.power_kw}`);
    const liveAlt = live ? live.alt_codes || [] : [];
    if (!setEq(templateAlt, liveAlt)) {
      aliasUpdates.push({ code: e.code, power_kw: e.power_kw, from: liveAlt, to: templateAlt });
    }
  }

  const L = [];
  const p = (...lines) => L.push(...lines);
  const carSlug = `${car.brand}_${car.model}_${genCodeLabel(genCode)}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  p(
    `-- ${car.brand} ${car.model} (${genCodeLabel(genCode)}) seed: generated by scripts/generate-seed.mjs from`,
    `-- the filled intake template at ${dir}/, per the import-car skill.`,
    "--",
    "-- REUSE/CREATE summary (reconciled live at generation time):",
    `--   engines: ${reuseEngines.length} REUSE, ${newEngines.length} NEW${newEngines.length ? ` (${newEngines.map(e => e.code).join(", ")})` : ""}`,
    `--   transmissions: ${usedUnitCodes.length} unit_code(s) referenced, all resolved live against transmission_units (${usedUnitCodes.join(", ")})`,
    `--   body types: ${usedBodies.length - newBodies.length} REUSE, ${newBodies.length} NEW${newBodies.length ? ` (${newBodies.join(", ")})` : ""}`,
    `--   drivetrain systems referenced: ${usedDrivetrains.length ? usedDrivetrains.join(", ") : "none (FWD only)"}`,
    `--   brand: ${liveBrands.some(b => b.name === car.brand) ? "REUSE" : "NEW"}. model: ${car.model} (assumed NEW unless already present).`,
    "--",
    `-- Configs: ${configs.length} total, one row per 'x' cell across ${gridFiles.length} config grid file(s)`,
    "-- (" + gridFiles.join(", ") + ") — every FK resolves by code/name via a CTE, never a",
    "-- hand-typed UUID.",
    "--",
    aliasUpdates.length
      ? `-- ALIAS DRIFT DETECTED: ${aliasUpdates.length} REUSE engine(s) need a guarded alt_codes UPDATE`
      : "-- No alt_codes drift detected between the template and live data.",
    "--",
    "-- TYPE CASTS: every WITH ... AS (VALUES ...) SELECT ... INSERT block explicitly casts",
    "-- each literal (::integer / ::numeric / ::text) — required by the import-car skill to",
    "-- avoid the all-NULL-column VALUES-CTE type-inference bug (Golf IV/León/Toledo/A3 all",
    "-- hit this on their all-NULL NCAP columns).",
    "--",
    aliasUpdates.length
      ? "-- Contains a DESTRUCTIVE step (alt_codes UPDATE, section marked below) — file-only,"
      : "-- No destructive step in this file — everything is additive INSERT, so it all may run",
    aliasUpdates.length ? "-- human-run, NOT executed here." : "-- via MCP once reviewed.",
    "--",
    "-- Review-only. NOT executed by this script.",
    ""
  );

  // ---- preflight ----
  p("do $$", "begin");
  p("  if to_regclass('public.catalog_brands') is null then");
  p("    raise exception 'catalog_brands does not exist — run the catalog_ schema migration first.';");
  p("  end if;");
  for (const dt of usedDrivetrains) {
    p(`  if not exists (select 1 from drivetrain_systems where code = '${esc(dt)}') then`);
    p(`    raise exception 'drivetrain_systems.${esc(dt)} is missing — needed for this car''s configs.';`);
    p("  end if;");
  }
  for (const b of usedBodies.filter(b => !newBodies.includes(b))) {
    p(`  if not exists (select 1 from catalog_body_types where name = '${esc(b)}') then`);
    p(`    raise exception 'catalog_body_types.''${esc(b)}'' is missing — reconcile is stale, re-check before running.';`);
    p("  end if;");
  }
  if (reuseEngines.length) {
    p("  if (select count(*) from catalog_engines where (code, power_kw) in (");
    p(`    ${reuseEngines.map(e => `('${esc(e.code)}', ${e.power_kw})`).join(", ")}`);
    p(`  )) <> ${reuseEngines.length} then`);
    p("    raise exception 'One or more REUSE engines are missing live — reconcile is stale, re-check before running.';");
    p("  end if;");
  }
  for (const e of newEngines) {
    // Checks (code, power_kw) together, not code alone — the real DB key, matching the
    // REUSE check above. A bare code-only check false-positives whenever the same primary
    // code is legitimately shared by two different real engines at different power levels
    // (e.g. CHYA/44kW on Fabia NJ vs. CHYA/48kW on Polo AW) — it would wrongly block this
    // car's genuinely-new (code, power_kw) pair just because an unrelated engine reused
    // the same code at a different power.
    p(`  if exists (select 1 from catalog_engines where code = '${esc(e.code)}' and power_kw = ${e.power_kw}) then`);
    p(`    raise exception 'catalog_engines.${esc(e.code)} (power_kw=${e.power_kw}) already exists — reconcile is stale (was this already seeded?), re-check before running.';`);
    p("  end if;");
  }
  for (const uc of usedUnitCodes) {
    p(`  if not exists (select 1 from transmission_units where code = '${esc(uc)}' or '${esc(uc)}' = any(alt_codes)) then`);
    p(`    raise exception 'No transmission_units row matches unit_code ''${esc(uc)}'' — reconcile is stale, re-check before running.';`);
    p("  end if;");
  }
  p("end $$;", "");

  let section = 1;
  const header = (title, note) => {
    p(
      "-- ════════════════════════════════════════════════════════════",
      `-- ${section}. ${title}`,
      ...(note ? [`--    ${note}`] : []),
      "-- ════════════════════════════════════════════════════════════",
      ""
    );
    section++;
  };

  // ---- 1. brand ----
  header("BRAND");
  p(`insert into catalog_brands (${BRANDS_COLS.join(", ")})`, `values ('${esc(car.brand)}', '${esc(car.brand_country)}')`, "on conflict (name) do nothing;", "");

  // ---- 2. model ----
  header("MODEL");
  p(`insert into catalog_models (${MODELS_COLS.join(", ")})`, `select id, '${esc(car.model)}', '${esc(car.segment)}', '${esc(car.origin_country)}'`, `from catalog_brands where name = '${esc(car.brand)}'`, "on conflict (brand_id, name) do nothing;", "");

  // ---- 3. phases ----
  header("PHASES", "every column explicitly cast.");
  p(
    `insert into catalog_phases (${PHASES_COLS.join(", ")})`,
    "select m.id, v.generation_code, v.phase_label, v.year_from, v.year_to, v.display_name, v.platform_code,",
    "  v.safety_rating, v.ncap_year, v.ncap_adult_pct, v.ncap_child_pct, v.ncap_pedestrian_pct, v.ncap_safety_assist_pct,",
    "  v.avg_market_price_eur, v.price_range_min_eur, v.price_range_max_eur, v.typical_mileage_range,",
    "  v.resale_value_rating, v.towing_capacity_kg",
    "from (",
    "  values"
  );
  p(phases.map(ph => `    (${sTxt(ph.generation_code)}, ${sTxt(ph.phase_label)}, ${nInt(ph.year_from)}, ${nInt(ph.year_to)}, ${sTxt(ph.display_name)}, ${sTxt(ph.platform_code)}, ${nInt(ph.safety_rating)}, ${nInt(ph.ncap_year)}, ${nInt(ph.ncap_adult_pct)}, ${nInt(ph.ncap_child_pct)}, ${nInt(ph.ncap_pedestrian_pct)}, ${nInt(ph.ncap_safety_assist_pct)}, ${nInt(ph.avg_market_price_eur)}, ${nInt(ph.price_range_min_eur)}, ${nInt(ph.price_range_max_eur)}, ${sTxt(ph.typical_mileage_range)}, ${sTxt(ph.resale_value_rating)}, ${nInt(ph.towing_capacity_kg)})`).join(",\n"));
  p(
    ") as v(generation_code, phase_label, year_from, year_to, display_name, platform_code,",
    "  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,",
    "  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,",
    "  resale_value_rating, towing_capacity_kg)",
    `join catalog_models m on m.name = '${esc(car.model)}'`,
    `join catalog_brands cb on cb.id = m.brand_id and cb.name = '${esc(car.brand)}'`,
    "where not exists (",
    "  select 1 from catalog_phases cp where cp.model_id = m.id and cp.generation_code = v.generation_code and cp.phase_label = v.phase_label",
    ");",
    ""
  );

  // ---- 4. body types ----
  if (newBodies.length) {
    header("BODY TYPES", `${newBodies.length} NEW; ${usedBodies.length - newBodies.length} already exist and are reused untouched.`);
    p(`insert into catalog_body_types (${BODY_TYPES_COLS.join(", ")})`, `values ${newBodies.map(b => `('${esc(b)}')`).join(", ")}`, "on conflict (name) do nothing;", "");
  } else {
    header("BODY TYPES", "none — all body types used by this car already exist and are reused.");
  }

  // ---- 5. engines ----
  if (newEngines.length) {
    header("ENGINES", `${newEngines.length} NEW row(s). Plain INSERT ... VALUES (not a VALUES-CTE), so no casting issue.`);
    p(`insert into catalog_engines (${ENGINES_COLS.join(", ")})`, "values");
    p(newEngines.map(e => `  ('${esc(e.code)}', ${arrLit(e.alt_codes)}, ${sOrNull(e.display_name)}, ${nOrNull(e.displacement_cc)}, ${e.power_kw}, '${esc(e.fuel_type)}', ${nOrNull(e.torque_nm)}, ${sOrNull(e.cylinders)}, ${sOrNull(e.emission_standard)}, ${sOrNull(e.timing_type)}, ${nOrNull(e.engine_oil_capacity_liters)}, ${nOrNull(e.timing_replacement_km)}, ${sOrNull(e.hybrid_type)})`).join(",\n"));
    p("on conflict (code, power_kw) do nothing;", "");
  } else {
    header("ENGINES", "none — all engines this car uses are REUSE, resolved by code+power_kw at config-insert time.");
  }

  // ---- transmissions: no INSERT here at all — every unit_code was already confirmed to
  // resolve against a live transmission_units row before generation started (the
  // unresolvedUnitCodes check above). transmission_units is reference data, never seeded
  // per-car; configs below resolve it by code/alt_codes.

  // ---- 7. phase_body_dimensions ----
  header("PHASE_BODY_DIMENSIONS", `${dims.length} row(s), one per (phase x body).`);
  p(`with dim_values (phase_label, body_type, ${DIMENSIONS_COLS.slice(2).join(", ")}) as (`, "  values");
  p(dims.map(d => `    (${sTxt(d.phase_label)}, ${sTxt(d.body_type)}, ${nInt(d.length_mm)}, ${nInt(d.width_mm)}, ${nInt(d.height_mm)}, ${nInt(d.ground_clearance_mm)}, ${nInt(d.curb_weight_kg)}, ${nInt(d.boot_capacity_liters)}, ${nInt(d.boot_max_liters)}, ${nInt(d.gross_vehicle_weight_kg)}, ${nInt(d.payload_kg)}, ${nNum(d.fuel_tank_capacity_liters)}, ${nInt(d.seats_count)})`).join(",\n"));
  p(
    "),",
    "phase_lookup as (",
    "  select cp.id, cp.phase_label",
    "  from catalog_phases cp",
    "  join catalog_models cm on cm.id = cp.model_id",
    "  join catalog_brands cb on cb.id = cm.brand_id",
    `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)}`,
    ")",
    `insert into phase_body_dimensions (${DIMENSIONS_COLS.join(", ")})`,
    "select p.id, bt.id, v.length_mm, v.width_mm, v.height_mm, v.ground_clearance_mm, v.curb_weight_kg, v.boot_capacity_liters, v.boot_max_liters, v.gross_vehicle_weight_kg, v.payload_kg, v.fuel_tank_capacity_liters, v.seats_count",
    "from dim_values v",
    "join phase_lookup p on p.phase_label = v.phase_label",
    "join catalog_body_types bt on bt.name = v.body_type",
    "on conflict (phase_id, body_type_id) do nothing;",
    ""
  );

  // ---- 8. configs ----
  header("VEHICLE CONFIGURATIONS", `${configs.length} row(s), one per marked 'x' cell. dt = null means no AWD system.`);
  p(
    "with",
    "  phase_lookup as (",
    "    select cp.id, cp.phase_label",
    "    from catalog_phases cp",
    "    join catalog_models cm on cm.id = cp.model_id",
    "    join catalog_brands cb on cb.id = cm.brand_id",
    `    where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)}`,
    "  ),",
    "  body_lookup as (",
    "    select id, name from catalog_body_types",
    "  ),",
    "  engine_lookup as (",
    "    select id, code, power_kw from catalog_engines",
    "  ),",
    "  unit_lookup as (",
    "    select id, code, alt_codes from transmission_units",
    "  ),",
    "  dt_lookup as (",
    `    select id, code from drivetrain_systems${usedDrivetrains.length ? ` where code in (${usedDrivetrains.map(d => `'${esc(d)}'`).join(", ")})` : " where false"}`,
    "  ),",
    "  configs (phase_label, body_name, engine_code, engine_power_kw, unit_code, dt_code) as (",
    "    values"
  );
  p(configs.map(c => {
    const dt = (c.d && c.d !== "FWD" && c.d !== "RWD") ? `'${esc(c.d)}'::text` : "null::text";
    return `      ('${esc(c.phase_label)}'::text, '${esc(c.b)}'::text, '${esc(c.engine_code)}'::text, ${c.power_kw}::integer, '${esc(c.g)}'::text, ${dt})`;
  }).join(",\n"));
  p(
    "  )",
    `insert into catalog_vehicle_configurations (${CONFIGS_COLS.join(", ")})`,
    "select p.id, b.id, e.id, u.id, d.id",
    "from configs c",
    "join phase_lookup p on p.phase_label = c.phase_label",
    "join body_lookup b on b.name = c.body_name",
    "join engine_lookup e on e.code = c.engine_code and e.power_kw = c.engine_power_kw",
    "join unit_lookup u on u.code = c.unit_code or c.unit_code = any(u.alt_codes)",
    "left join dt_lookup d on d.code = c.dt_code",
    "on conflict (",
    "  phase_id, body_type_id, engine_id, unit_id,",
    "  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)",
    ") do nothing;",
    ""
  );

  // ---- 9. trims ----
  if (trims.length) {
    header("TRIMS", `${trims.length} row(s).`);
    p(`insert into catalog_trims (${TRIMS_COLS.join(", ")})`, "select p.id, v.name, v.tier", "from (", "  values");
    p(trims.map(t => `    ('${esc(t.phase_label)}'::text, '${esc(t.name)}'::text, ${t.tier}::integer)`).join(",\n"));
    p(
      ") as v(phase_label, name, tier)",
      "join (",
      "  select cp.id, cp.phase_label",
      "  from catalog_phases cp",
      "  join catalog_models cm on cm.id = cp.model_id",
      "  join catalog_brands cb on cb.id = cm.brand_id",
      `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)}`,
      ") as p on p.phase_label = v.phase_label",
      "where not exists (",
      "  select 1 from catalog_trims ct where ct.phase_id = p.id and ct.name = v.name",
      ");",
      ""
    );
  } else {
    header("TRIMS", "none supplied.");
  }

  // ---- 10. trim features ----
  const realFeatures = trimFeatures.filter(f => f.phase_label && f.trim_name && f.feature);
  if (realFeatures.length) {
    header("TRIM FEATURES", `${realFeatures.length} row(s).`);
    p("with trim_lookup as (", "  select ct.id, cp.phase_label, ct.name", "  from catalog_trims ct", "  join catalog_phases cp on cp.id = ct.phase_id", "  join catalog_models cm on cm.id = cp.model_id", "  join catalog_brands cb on cb.id = cm.brand_id", `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)}`, ")");
    p(`insert into catalog_trim_features (${TRIM_FEATURES_COLS.join(", ")})`, "select tl.id, v.feature, v.is_optional", "from (", "  values");
    p(realFeatures.map(f => `    (${sTxt(f.phase_label)}, ${sTxt(f.trim_name)}, ${sTxt(f.feature)}, ${f.is_optional === "true" ? "true" : "false"})`).join(",\n"));
    p(
      ") as v(phase_label, trim_name, feature, is_optional)",
      "join trim_lookup tl on tl.phase_label = v.phase_label and tl.name = v.trim_name",
      "where not exists (",
      "  select 1 from catalog_trim_features ctf where ctf.trim_id = tl.id and ctf.feature = v.feature",
      ");",
      ""
    );
  }

  // ---- 11. faults ----
  const engFaults = faults.filter(f => f.component_type === "engine" && f.target_code && f.fault);
  const transFaults = faults.filter(f => f.component_type === "transmission" && f.target_code && f.fault);
  const drivetrainFaults = faults.filter(f => f.component_type === "drivetrain" && f.target_code && f.fault);
  const vehicleFaults = faults.filter(f => f.component_type === "vehicle" && f.target_code && f.fault);
  if (engFaults.length || transFaults.length || drivetrainFaults.length || vehicleFaults.length) {
    header("COMPONENT FAULTS", `${engFaults.length + transFaults.length + drivetrainFaults.length + vehicleFaults.length} row(s).`);
    if (engFaults.length) {
      const keys = [...new Set(engFaults.map(f => `('${esc(f.target_code)}', ${f.target_power_kw})`))];
      p("with", "  engine_lookup as (", "    select id, code, power_kw from catalog_engines", `    where (code, power_kw) in (${keys.join(", ")})`, "  ),", "  engine_faults (target_code, target_power_kw, fault, severity) as (", "    values");
      p(engFaults.map(f => `      ('${esc(f.target_code)}'::text, ${f.target_power_kw}::integer, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text)`).join(",\n"));
      p(
        "  )",
        `insert into catalog_component_faults (${COMPONENT_FAULTS_ENGINE_COLS.join(", ")})`,
        "select 'engine', e.id, f.fault, f.severity",
        "from engine_faults f",
        "join engine_lookup e on e.code = f.target_code and e.power_kw = f.target_power_kw",
        "where not exists (",
        "  select 1 from catalog_component_faults ccf where ccf.engine_id = e.id and ccf.fault = f.fault",
        ");",
        ""
      );
    }
    if (transFaults.length) {
      // Matched by real gearbox identity (code or alt_codes), same as configs above — never
      // by speed count.
      p("with", "  unit_lookup as (", "    select id, code, alt_codes from transmission_units", "  ),", "  trans_faults (target_code, fault, severity) as (", "    values");
      p(transFaults.map(f => `      ('${esc(f.target_code)}'::text, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text)`).join(",\n"));
      p(
        "  )",
        `insert into catalog_component_faults (${COMPONENT_FAULTS_TRANS_COLS.join(", ")})`,
        "select 'transmission', u.id, f.fault, f.severity",
        "from trans_faults f",
        "join unit_lookup u on u.code = f.target_code or f.target_code = any(u.alt_codes)",
        "where not exists (",
        "  select 1 from catalog_component_faults ccf where ccf.unit_id = u.id and ccf.fault = f.fault",
        ");",
        ""
      );
    }
    if (drivetrainFaults.length) {
      // drivetrain_systems has no alt_codes column (confirmed live) -- code only, same
      // shared-reference-data discipline as transmission_units otherwise.
      p("with", "  drivetrain_lookup as (", "    select id, code from drivetrain_systems", "  ),", "  drivetrain_faults (target_code, fault, severity) as (", "    values");
      p(drivetrainFaults.map(f => `      ('${esc(f.target_code)}'::text, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text)`).join(",\n"));
      p(
        "  )",
        `insert into catalog_component_faults (${COMPONENT_FAULTS_DRIVETRAIN_COLS.join(", ")})`,
        "select 'drivetrain', d.id, f.fault, f.severity",
        "from drivetrain_faults f",
        "join drivetrain_lookup d on d.code = f.target_code",
        "where not exists (",
        "  select 1 from catalog_component_faults ccf where ccf.drivetrain_id = d.id and ccf.fault = f.fault",
        ");",
        ""
      );
    }
    if (vehicleFaults.length) {
      // target_code holds the phase_label for a vehicle-level fault (not a component code --
      // there is no component) -- resolved against THIS car's own phases, same phase_lookup
      // pattern as dimensions/configs/trims above, not a live-DB-wide lookup.
      p(
        "with",
        "  phase_lookup as (",
        "    select cp.id, cp.phase_label",
        "    from catalog_phases cp",
        "    join catalog_models cm on cm.id = cp.model_id",
        "    join catalog_brands cb on cb.id = cm.brand_id",
        `    where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)}`,
        "  ),",
        "  vehicle_faults (phase_label, fault, severity, category) as (",
        "    values"
      );
      p(vehicleFaults.map(f => `      ('${esc(f.target_code)}'::text, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text, '${esc(f.category)}'::text)`).join(",\n"));
      p(
        "  )",
        `insert into catalog_component_faults (${COMPONENT_FAULTS_VEHICLE_COLS.join(", ")})`,
        "select 'vehicle', p.id, f.fault, f.severity, f.category",
        "from vehicle_faults f",
        "join phase_lookup p on p.phase_label = f.phase_label",
        "where not exists (",
        "  select 1 from catalog_component_faults ccf where ccf.phase_id = p.id and ccf.fault = f.fault",
        ");",
        ""
      );
    }
  } else {
    header("COMPONENT FAULTS", "none supplied.");
  }

  // ---- 12. destructive: alias updates ----
  if (aliasUpdates.length) {
    header(
      "DESTRUCTIVE — alt_codes UPDATE(s)",
      "UPDATE of existing data: stays file-only, human-run, NOT executed here. Each guarded to fire only if the live value still matches what was seen at generation time, and to affect exactly 1 row."
    );
    p("begin;", "");
    for (const u of aliasUpdates) {
      p(
        "do $$",
        "declare",
        "  n integer;",
        "begin",
        "  update catalog_engines",
        `  set alt_codes = '${pgArrayLiteral(u.to)}'`,
        `  where code = '${esc(u.code)}' and power_kw = ${u.power_kw} and alt_codes = '${pgArrayLiteral(u.from)}';`,
        "  get diagnostics n = row_count;",
        "  if n <> 1 then",
        `    raise exception 'Expected ${esc(u.code)} (${u.power_kw}kW) alt_codes to be exactly ${pgArrayLiteral(u.from)} and updated once, %% affected — aborting.', n;`.replace("%%", "%"),
        "  end if;",
        "end $$;",
        ""
      );
    }
    p("commit;", "");
  }

  // ---- 13. post-condition assertions ----
  // Closes the phases-guard bug class: a silent WHERE NOT EXISTS false-positive (matching
  // an unrelated generation's same-labeled phase, or any other cross-generation collision)
  // would previously leave phases/configs at 0 with no error anywhere in the file. This is
  // the LAST thing the seed does — asserts the live counts for THIS car's generation_code
  // are exactly what this seed intends, whether those rows were just inserted or already
  // present, and aborts loudly if not.
  header(
    "POST-CONDITION ASSERTIONS",
    "Asserts exactly the expected phase and config counts for this generation_code exist live -- catches a silent guard false-positive (e.g. the phases-guard bug: matching another generation's same-labeled phase) instead of leaving it undetected."
  );
  p(
    "do $$",
    "declare",
    "  phase_n integer;",
    "  config_n integer;",
    "begin",
    "  select count(*) into phase_n",
    "  from catalog_phases cp",
    "  join catalog_models cm on cm.id = cp.model_id",
    "  join catalog_brands cb on cb.id = cm.brand_id",
    `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)};`,
    `  if phase_n <> ${phases.length} then`,
    `    raise exception 'Expected ${phases.length} phase(s) for ${esc(car.brand)} ${esc(car.model)} (${genCodeLabel(genCode)}), found %% -- a phase guard may have false-positived against another generation.', phase_n;`.replace("%%", "%"),
    "  end if;",
    "",
    "  select count(*) into config_n",
    "  from catalog_vehicle_configurations cvc",
    "  join catalog_phases cp on cp.id = cvc.phase_id",
    "  join catalog_models cm on cm.id = cp.model_id",
    "  join catalog_brands cb on cb.id = cm.brand_id",
    `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and ${genCodeSql(genCode)};`,
    `  if config_n <> ${configs.length} then`,
    `    raise exception 'Expected ${configs.length} config(s) for ${esc(car.brand)} ${esc(car.model)} (${genCodeLabel(genCode)}), found %%.', config_n;`.replace("%%", "%"),
    "  end if;",
    "end $$;",
    ""
  );

  const sql = L.join("\n").replace(/\n{3,}/g, "\n\n");

  let outPath = outArg;
  if (!outPath) {
    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    outPath = `supabase/migrations/${ts}_seed_${carSlug}.sql`;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath}`);
  console.log(`  engines: ${reuseEngines.length} REUSE, ${newEngines.length} NEW | transmissions: ${usedUnitCodes.length} unit_code(s) resolved`);
  console.log(`  body types: ${newBodies.length} NEW | configs: ${configs.length} | trims: ${trims.length} | faults: ${engFaults.length + transFaults.length + drivetrainFaults.length + vehicleFaults.length}`);
  if (aliasUpdates.length) console.log(`  ALIAS DRIFT: ${aliasUpdates.map(u => u.code).join(", ")} — guarded UPDATE section included`);
  console.log("  NOT executed. Review before running.");
}

main();
