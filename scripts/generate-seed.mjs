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

function loadEnv() {
  const text = fs.readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text.split("\n").filter(l => l.includes("=")).map(l => {
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

  const { data: liveBrands } = await sb.from("catalog_brands").select("name");
  const { data: liveBodyTypes } = await sb.from("catalog_body_types").select("name");
  const { data: liveEngines } = await sb.from("catalog_engines").select("code, power_kw, alt_codes");
  const { data: liveTrans } = await sb.from("catalog_transmissions").select("code");
  const { data: liveDrivetrains } = await sb.from("drivetrain_systems").select("code");

  const liveEngineMap = new Map(liveEngines.map(e => [`${e.code}|${e.power_kw}`, e]));
  const liveTransSet = new Set(liveTrans.map(t => t.code));
  const liveBodySet = new Set(liveBodyTypes.map(b => b.name));
  const liveDrivetrainSet = new Set(liveDrivetrains.map(d => d.code));

  const reuseEngines = engines.filter(e => e.reuse_or_new === "REUSE" && e.code && e.power_kw);
  const newEngines = engines.filter(e => e.reuse_or_new === "NEW" && e.code && e.power_kw);
  const reuseTrans = trans.filter(t => t.reuse_or_new === "REUSE" && t.code);
  const newTrans = trans.filter(t => t.reuse_or_new === "NEW" && t.code);

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
  const carSlug = `${car.brand}_${car.model}_${genCode}`.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  p(
    `-- ${car.brand} ${car.model} (${genCode}) seed: generated by scripts/generate-seed.mjs from`,
    `-- the filled intake template at ${dir}/, per the import-car skill.`,
    "--",
    "-- REUSE/CREATE summary (reconciled live at generation time):",
    `--   engines: ${reuseEngines.length} REUSE, ${newEngines.length} NEW${newEngines.length ? ` (${newEngines.map(e => e.code).join(", ")})` : ""}`,
    `--   transmissions: ${reuseTrans.length} REUSE, ${newTrans.length} NEW${newTrans.length ? ` (${newTrans.map(t => t.code).join(", ")})` : ""}`,
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
    p(`  if exists (select 1 from catalog_engines where code = '${esc(e.code)}') then`);
    p(`    raise exception 'catalog_engines.${esc(e.code)} already exists — reconcile is stale (was this already seeded?), re-check before running.';`);
    p("  end if;");
  }
  if (reuseTrans.length) {
    p("  if (select count(*) from catalog_transmissions where code in (");
    p(`    ${reuseTrans.map(t => `'${esc(t.code)}'`).join(", ")}`);
    p(`  )) <> ${reuseTrans.length} then`);
    p("    raise exception 'One or more REUSE transmissions are missing live — reconcile is stale, re-check before running.';");
    p("  end if;");
  }
  for (const t of newTrans) {
    p(`  if exists (select 1 from catalog_transmissions where code = '${esc(t.code)}') then`);
    p(`    raise exception 'catalog_transmissions.${esc(t.code)} already exists — reconcile is stale, re-check before running.';`);
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
  p("insert into catalog_brands (name, country)", `values ('${esc(car.brand)}', '${esc(car.brand_country)}')`, "on conflict (name) do nothing;", "");

  // ---- 2. model ----
  header("MODEL");
  p("insert into catalog_models (brand_id, name, segment, origin_country)", `select id, '${esc(car.model)}', '${esc(car.segment)}', '${esc(car.origin_country)}'`, `from catalog_brands where name = '${esc(car.brand)}'`, "on conflict (brand_id, name) do nothing;", "");

  // ---- 3. phases ----
  header("PHASES", "every column explicitly cast.");
  p(
    "insert into catalog_phases (",
    "  model_id, generation_code, phase_label, year_from, year_to, display_name, platform_code,",
    "  safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct, ncap_safety_assist_pct,",
    "  avg_market_price_eur, price_range_min_eur, price_range_max_eur, typical_mileage_range,",
    "  resale_value_rating, towing_capacity_kg",
    ")",
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
    "  select 1 from catalog_phases cp where cp.model_id = m.id and cp.phase_label = v.phase_label",
    ");",
    ""
  );

  // ---- 4. body types ----
  if (newBodies.length) {
    header("BODY TYPES", `${newBodies.length} NEW; ${usedBodies.length - newBodies.length} already exist and are reused untouched.`);
    p("insert into catalog_body_types (name)", `values ${newBodies.map(b => `('${esc(b)}')`).join(", ")}`, "on conflict (name) do nothing;", "");
  } else {
    header("BODY TYPES", "none — all body types used by this car already exist and are reused.");
  }

  // ---- 5. engines ----
  if (newEngines.length) {
    header("ENGINES", `${newEngines.length} NEW row(s). Plain INSERT ... VALUES (not a VALUES-CTE), so no casting issue.`);
    p("insert into catalog_engines (code, alt_codes, display_name, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km)", "values");
    p(newEngines.map(e => `  ('${esc(e.code)}', ${arrLit(e.alt_codes)}, ${sOrNull(e.display_name)}, ${e.power_kw}, '${esc(e.fuel_type)}', ${nOrNull(e.torque_nm)}, ${sOrNull(e.cylinders)}, ${sOrNull(e.emission_standard)}, ${sOrNull(e.timing_type)}, ${nOrNull(e.engine_oil_capacity_liters)}, ${nOrNull(e.timing_replacement_km)})`).join(",\n"));
    p("on conflict (code, power_kw) do nothing;", "");
  } else {
    header("ENGINES", "none — all engines this car uses are REUSE, resolved by code+power_kw at config-insert time.");
  }

  // ---- 6. transmissions ----
  if (newTrans.length) {
    header("TRANSMISSIONS", `${newTrans.length} NEW row(s). Plain INSERT ... VALUES, no casting issue.`);
    p("insert into catalog_transmissions (code, type, speeds)", "values");
    p(newTrans.map(t => `  ('${esc(t.code)}', '${esc(t.type)}', ${t.speeds})`).join(",\n"));
    p("on conflict (code) do nothing;", "");
  } else {
    header("TRANSMISSIONS", "none — all transmissions this car uses are REUSE.");
  }

  // ---- 7. phase_body_dimensions ----
  header("PHASE_BODY_DIMENSIONS", `${dims.length} row(s), one per (phase x body).`);
  p("with dim_values (phase_label, body_type, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters, seats_count) as (", "  values");
  p(dims.map(d => `    (${sTxt(d.phase_label)}, ${sTxt(d.body_type)}, ${nInt(d.length_mm)}, ${nInt(d.width_mm)}, ${nInt(d.height_mm)}, ${nInt(d.ground_clearance_mm)}, ${nInt(d.curb_weight_kg)}, ${nInt(d.boot_capacity_liters)}, ${nInt(d.boot_max_liters)}, ${nInt(d.gross_vehicle_weight_kg)}, ${nInt(d.payload_kg)}, ${nNum(d.fuel_tank_capacity_liters)}, ${nInt(d.seats_count)})`).join(",\n"));
  p(
    "),",
    "phase_lookup as (",
    "  select cp.id, cp.phase_label",
    "  from catalog_phases cp",
    "  join catalog_models cm on cm.id = cp.model_id",
    "  join catalog_brands cb on cb.id = cm.brand_id",
    `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and cp.generation_code = '${esc(genCode)}'`,
    ")",
    "insert into phase_body_dimensions (phase_id, body_type_id, length_mm, width_mm, height_mm, ground_clearance_mm, curb_weight_kg, boot_capacity_liters, boot_max_liters, gross_vehicle_weight_kg, payload_kg, fuel_tank_capacity_liters, seats_count)",
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
    `    where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and cp.generation_code = '${esc(genCode)}'`,
    "  ),",
    "  body_lookup as (",
    "    select id, name from catalog_body_types",
    "  ),",
    "  engine_lookup as (",
    "    select id, code, power_kw from catalog_engines",
    "  ),",
    "  trans_lookup as (",
    "    select id, code from catalog_transmissions",
    "  ),",
    "  dt_lookup as (",
    `    select id, code from drivetrain_systems${usedDrivetrains.length ? ` where code in (${usedDrivetrains.map(d => `'${esc(d)}'`).join(", ")})` : " where false"}`,
    "  ),",
    "  configs (phase_label, body_name, engine_code, engine_power_kw, trans_code, dt_code) as (",
    "    values"
  );
  p(configs.map(c => {
    const dt = (c.d && c.d !== "FWD" && c.d !== "RWD") ? `'${esc(c.d)}'::text` : "null::text";
    return `      ('${esc(c.phase_label)}'::text, '${esc(c.b)}'::text, '${esc(c.engine_code)}'::text, ${c.power_kw}::integer, '${esc(c.g)}'::text, ${dt})`;
  }).join(",\n"));
  p(
    "  )",
    "insert into catalog_vehicle_configurations (phase_id, body_type_id, engine_id, transmission_id, drivetrain_id)",
    "select p.id, b.id, e.id, t.id, d.id",
    "from configs c",
    "join phase_lookup p on p.phase_label = c.phase_label",
    "join body_lookup b on b.name = c.body_name",
    "join engine_lookup e on e.code = c.engine_code and e.power_kw = c.engine_power_kw",
    "join trans_lookup t on t.code = c.trans_code",
    "left join dt_lookup d on d.code = c.dt_code",
    "on conflict (",
    "  phase_id, body_type_id, engine_id, transmission_id,",
    "  coalesce(drivetrain_id, '00000000-0000-0000-0000-000000000000'::uuid)",
    ") do nothing;",
    ""
  );

  // ---- 9. trims ----
  if (trims.length) {
    header("TRIMS", `${trims.length} row(s).`);
    p("insert into catalog_trims (phase_id, name, tier)", "select p.id, v.name, v.tier", "from (", "  values");
    p(trims.map(t => `    ('${esc(t.phase_label)}'::text, '${esc(t.name)}'::text, ${t.tier}::integer)`).join(",\n"));
    p(
      ") as v(phase_label, name, tier)",
      "join (",
      "  select cp.id, cp.phase_label",
      "  from catalog_phases cp",
      "  join catalog_models cm on cm.id = cp.model_id",
      "  join catalog_brands cb on cb.id = cm.brand_id",
      `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and cp.generation_code = '${esc(genCode)}'`,
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
    p("with trim_lookup as (", "  select ct.id, cp.phase_label, ct.name", "  from catalog_trims ct", "  join catalog_phases cp on cp.id = ct.phase_id", "  join catalog_models cm on cm.id = cp.model_id", "  join catalog_brands cb on cb.id = cm.brand_id", `  where cb.name = '${esc(car.brand)}' and cm.name = '${esc(car.model)}' and cp.generation_code = '${esc(genCode)}'`, ")");
    p("insert into catalog_trim_features (trim_id, feature, is_optional)", "select tl.id, v.feature, v.is_optional", "from (", "  values");
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
  if (engFaults.length || transFaults.length) {
    header("COMPONENT FAULTS", `${engFaults.length + transFaults.length} row(s).`);
    if (engFaults.length) {
      const keys = [...new Set(engFaults.map(f => `('${esc(f.target_code)}', ${f.target_power_kw})`))];
      p("with", "  engine_lookup as (", "    select id, code, power_kw from catalog_engines", `    where (code, power_kw) in (${keys.join(", ")})`, "  ),", "  engine_faults (target_code, target_power_kw, fault, severity) as (", "    values");
      p(engFaults.map(f => `      ('${esc(f.target_code)}'::text, ${f.target_power_kw}::integer, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text)`).join(",\n"));
      p(
        "  )",
        "insert into catalog_component_faults (component_type, engine_id, fault, severity)",
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
      const keys = [...new Set(transFaults.map(f => `'${esc(f.target_code)}'`))];
      p("with", "  trans_lookup as (", `    select id, code from catalog_transmissions where code in (${keys.join(", ")})`, "  ),", "  trans_faults (target_code, fault, severity) as (", "    values");
      p(transFaults.map(f => `      ('${esc(f.target_code)}'::text, '${esc(f.fault)}'::text, '${esc(f.severity)}'::text)`).join(",\n"));
      p(
        "  )",
        "insert into catalog_component_faults (component_type, transmission_id, fault, severity)",
        "select 'transmission', t.id, f.fault, f.severity",
        "from trans_faults f",
        "join trans_lookup t on t.code = f.target_code",
        "where not exists (",
        "  select 1 from catalog_component_faults ccf where ccf.transmission_id = t.id and ccf.fault = f.fault",
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

  const sql = L.join("\n").replace(/\n{3,}/g, "\n\n");

  let outPath = outArg;
  if (!outPath) {
    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    outPath = `supabase/migrations/${ts}_seed_${carSlug}.sql`;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sql);
  console.log(`Wrote ${outPath}`);
  console.log(`  engines: ${reuseEngines.length} REUSE, ${newEngines.length} NEW | transmissions: ${reuseTrans.length} REUSE, ${newTrans.length} NEW`);
  console.log(`  body types: ${newBodies.length} NEW | configs: ${configs.length} | trims: ${trims.length} | faults: ${engFaults.length + transFaults.length}`);
  if (aliasUpdates.length) console.log(`  ALIAS DRIFT: ${aliasUpdates.map(u => u.code).join(", ")} — guarded UPDATE section included`);
  console.log("  NOT executed. Review before running.");
}

main();
