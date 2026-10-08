// Read-only audit of shared reference data for near-duplicates that aren't linked through
// alt_codes, plus a vocabulary snapshot for the free-text columns that have drifted before
// (emission_standard was exactly this problem -- 'Euro 6d' vs 'Euro6d' -- before
// 20261006140000_normalize_emission_standard.sql normalized and froze it). This script is
// Part 1 of the duplicate-prevention plan: it reports, it decides nothing, it writes
// nothing -- the human reviews each finding before Part 2 (pipeline checks) or Part 3 (DB
// constraints) touch anything.
//
// Default mode runs every check (a-f) and prints a labeled report:
//   node scripts/audit-reference-duplicates.mjs
//
// Preventive mode -- reused by Part 2's "before you add a new transmission_units/
// drivetrain_systems row" step -- checks ONE candidate against live near-duplicate groups
// without touching the DB, exits 1 if an unexplained match is found:
//   node scripts/audit-reference-duplicates.mjs --check-new transmissions <maker> <family> <speeds> [--distinct "<reason>"]
//   node scripts/audit-reference-duplicates.mjs --check-new drivetrains <maker> <type> [--distinct "<reason>"]
//
// Read-only against the live DB in both modes. Never writes anything, anywhere.
//
// Supabase caps an unpaginated .select() at 1000 rows (hit for real on the 1550-row
// catalog_vehicle_configurations table during the A4 B9 session) -- every fetch here goes
// through fetchAll(), which pages with .range() until a short page confirms the end.

import fs from "fs";
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

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, cols) {
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

// Lowercase + diacritic-strip + whitespace-strip. No shared normalization helper exists
// anywhere in the repo (checked app/lib and every scripts/*.mjs) -- this is the first one,
// written here and duplicated into validate-template.mjs/intake-to-template.mjs in Part 2,
// per this repo's established per-script-helper convention rather than a shared import.
function normalizeName(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return groups;
}

// --- a. Engine near-duplicates -------------------------------------------------------

async function auditEngines() {
  const engines = await fetchAll(
    "catalog_engines",
    "id, code, alt_codes, power_kw, displacement_cc, fuel_type, torque_nm, emission_standard, timing_type"
  );
  const configs = await fetchAll("catalog_vehicle_configurations", "engine_id, phase_id");
  const phases = await fetchAll("catalog_phases", "id, model_id, generation_code, phase_label");
  const models = await fetchAll("catalog_models", "id, brand_id, name");
  const brands = await fetchAll("catalog_brands", "id, name");

  const phaseById = new Map(phases.map(p => [p.id, p]));
  const modelById = new Map(models.map(m => [m.id, m]));
  const brandById = new Map(brands.map(b => [b.id, b]));

  function modelsUsingEngine(engineId) {
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

  // Tightened key (per Martin's sign-off after reviewing this check's first pass):
  // displacement_cc + power_kw + torque_nm + fuel_type + emission_standard + timing_type.
  // NULL-displacement engines are skipped entirely -- the looser displacement+power+fuel
  // key used to collapse them into one meaningless group (AMK/APY, AXJ/BAM: both members
  // just happened to have NULL displacement, not an actual spec match).
  const withDisplacement = engines.filter(e => e.displacement_cc != null);
  const groups = groupBy(
    withDisplacement,
    e => `${e.displacement_cc}|${e.power_kw}|${e.torque_nm}|${e.fuel_type}|${e.emission_standard}|${e.timing_type}`
  );
  const findings = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i], b = members[j];
        if (a.code === b.code) continue;
        const linked =
          (a.alt_codes || []).includes(b.code) || (b.alt_codes || []).includes(a.code);
        if (linked) continue;
        findings.push({
          key,
          a: a.code,
          b: b.code,
          displacement_cc: a.displacement_cc,
          power_kw: a.power_kw,
          fuel_type: a.fuel_type,
          modelsA: modelsUsingEngine(a.id),
          modelsB: modelsUsingEngine(b.id),
        });
      }
    }
  }
  return findings;
}

// --- b. alt_code collisions -----------------------------------------------------------

async function auditAltCodeCollisions(table) {
  const rows = await fetchAll(table, "code, alt_codes");
  const codes = new Set(rows.map(r => r.code));
  const altOwners = new Map(); // alt -> [codes that declare it]
  for (const r of rows) {
    for (const alt of r.alt_codes || []) {
      if (!altOwners.has(alt)) altOwners.set(alt, []);
      altOwners.get(alt).push(r.code);
    }
  }
  const findings = [];
  for (const [alt, owners] of altOwners) {
    if (codes.has(alt)) {
      findings.push({ alt, owners, issue: `'${alt}' is itself another row's primary code` });
    }
    const uniqueOwners = [...new Set(owners)];
    if (uniqueOwners.length > 1) {
      findings.push({ alt, owners: uniqueOwners, issue: `'${alt}' is declared as alt_code by 2+ rows` });
    }
  }
  return findings;
}

// --- c. Gearbox near-duplicates ---------------------------------------------------------

async function auditGearboxes() {
  // maker non-null only (per Martin's sign-off) -- a NULL maker makes (maker,family,speeds)
  // grouping meaningless noise: the first pass of this check lumped e.g. "Porsche PDK-8" and
  // "Mercedes-AMG 8-speed DCT" into the same group for no reason but both having no maker set.
  const units = (await fetchAll("transmission_units", "code, maker, family, speeds")).filter(u => u.maker);
  const groups = groupBy(units, u => `${u.maker}|${u.family}|${u.speeds || "?"}`);
  const findings = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    findings.push({ key, codes: members.map(m => m.code) });
  }
  return findings;
}

// --- d. Drivetrain near-duplicates -------------------------------------------------------

async function auditDrivetrains() {
  const systems = await fetchAll("drivetrain_systems", "code, type, maker");
  const groups = groupBy(systems, d => `${d.type}|${d.maker || "?"}`);
  const findings = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    findings.push({ key, codes: members.map(m => m.code) });
  }
  return findings;
}

// --- e. Brand/model normalization collisions ---------------------------------------------

async function auditBrandsModels() {
  const brands = await fetchAll("catalog_brands", "id, name");
  const models = await fetchAll("catalog_models", "id, brand_id, name");

  const brandGroups = groupBy(brands, b => normalizeName(b.name));
  const brandFindings = [];
  for (const [key, members] of brandGroups) {
    const distinctSpellings = new Set(members.map(m => m.name));
    if (distinctSpellings.size > 1) {
      brandFindings.push({ normalized: key, spellings: [...distinctSpellings] });
    }
  }

  const modelsByBrand = groupBy(models, m => m.brand_id);
  const modelFindings = [];
  for (const [brandId, brandModels] of modelsByBrand) {
    const brand = brands.find(b => b.id === brandId);
    const groups = groupBy(brandModels, m => normalizeName(m.name));
    for (const [key, members] of groups) {
      const distinctSpellings = new Set(members.map(m => m.name));
      if (distinctSpellings.size > 1) {
        modelFindings.push({
          brand: brand ? brand.name : brandId,
          normalized: key,
          spellings: [...distinctSpellings],
        });
      }
    }
  }
  return { brandFindings, modelFindings };
}

// --- f. Vocabulary snapshot -------------------------------------------------------------

async function auditVocabulary() {
  const targets = [
    { table: "catalog_phases", column: "resale_value_rating" },
    { table: "catalog_engines", column: "timing_type" },
    { table: "catalog_engines", column: "cylinders" },
    { table: "catalog_engines", column: "fuel_type" },
    { table: "catalog_engines", column: "hybrid_type" },
    { table: "catalog_component_faults", column: "severity" },
    { table: "catalog_models", column: "segment" },
  ];
  const results = [];
  for (const { table, column } of targets) {
    const rows = await fetchAll(table, column);
    const counts = new Map();
    for (const r of rows) {
      const v = r[column];
      const k = v === null || v === undefined ? "NULL" : v;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    // flag raw values that collapse to the same normalized (lowercase, space-stripped) form
    const byNormalized = new Map();
    for (const raw of counts.keys()) {
      if (raw === "NULL") continue;
      const norm = raw.toLowerCase().replace(/\s+/g, "");
      if (!byNormalized.has(norm)) byNormalized.set(norm, []);
      byNormalized.get(norm).push(raw);
    }
    const variants = [...byNormalized.values()].filter(v => v.length > 1);
    results.push({ table, column, counts: [...counts.entries()], variants });
  }
  return results;
}

// --- report printing ---------------------------------------------------------------------

function printReport(a, bEngines, bUnits, c, d, e, f) {
  console.log("=".repeat(78));
  console.log("PART 1 AUDIT -- read-only, nothing written");
  console.log("=".repeat(78));

  console.log("\n--- a. Engine near-duplicates (same displacement_cc+power_kw+torque_nm+fuel_type+emission_standard+timing_type, unlinked, displacement != NULL) ---");
  if (!a.length) console.log("  none found");
  for (const f1 of a) {
    console.log(`  ${f1.a} vs ${f1.b}  (${f1.displacement_cc}cc, ${f1.power_kw}kW, ${f1.fuel_type})`);
    console.log(`    ${f1.a} used by: ${f1.modelsA.join(", ") || "(no live config)"}`);
    console.log(`    ${f1.b} used by: ${f1.modelsB.join(", ") || "(no live config)"}`);
  }

  console.log("\n--- b. alt_code collisions: catalog_engines ---");
  if (!bEngines.length) console.log("  none found");
  for (const f1 of bEngines) console.log(`  ${f1.issue} -- owners: ${f1.owners.join(", ")}`);

  console.log("\n--- b. alt_code collisions: transmission_units ---");
  if (!bUnits.length) console.log("  none found");
  for (const f1 of bUnits) console.log(`  ${f1.issue} -- owners: ${f1.owners.join(", ")}`);

  console.log("\n--- c. Gearbox near-duplicates (same maker + family + speeds) ---");
  if (!c.length) console.log("  none found");
  for (const f1 of c) console.log(`  [${f1.key}] ${f1.codes.join(", ")}`);

  console.log("\n--- d. Drivetrain near-duplicates (same type + maker) ---");
  if (!d.length) console.log("  none found");
  for (const f1 of d) console.log(`  [${f1.key}] ${f1.codes.join(", ")}`);

  console.log("\n--- e. Brand normalization collisions ---");
  if (!e.brandFindings.length) console.log("  none found");
  for (const f1 of e.brandFindings) console.log(`  normalized '${f1.normalized}': ${f1.spellings.join(" / ")}`);

  console.log("\n--- e. Model normalization collisions (within same brand) ---");
  if (!e.modelFindings.length) console.log("  none found");
  for (const f1 of e.modelFindings) {
    console.log(`  ${f1.brand} -- normalized '${f1.normalized}': ${f1.spellings.join(" / ")}`);
  }

  console.log("\n--- f. Vocabulary snapshot ---");
  for (const r of f) {
    console.log(`  ${r.table}.${r.column}:`);
    for (const [val, count] of r.counts) console.log(`    ${JSON.stringify(val)}: ${count}`);
    if (r.variants.length) {
      console.log(`    POSSIBLE SPELLING/FORMAT VARIANTS:`);
      for (const group of r.variants) console.log(`      ${group.map(v => JSON.stringify(v)).join(" <-> ")}`);
    }
  }
  console.log("");
}

// --- --check-new mode --------------------------------------------------------------------

async function checkNew(args) {
  const kind = args[0]; // "transmissions" | "drivetrains"
  const distinctIdx = args.indexOf("--distinct");
  const distinctReason = distinctIdx >= 0 ? args[distinctIdx + 1] : null;
  const fields = distinctIdx >= 0 ? args.slice(1, distinctIdx) : args.slice(1);

  if (kind === "transmissions") {
    const [maker, family, speedsRaw] = fields;
    if (!maker) {
      console.log("OK -- no maker given, near-duplicate check skipped (requires a non-null maker, same scoping as the gearbox safety net).");
      return;
    }
    const speeds = speedsRaw ? Number(speedsRaw) : null;
    const units = await fetchAll("transmission_units", "code, maker, family, speeds");
    const matches = units.filter(
      u => (u.maker || null) === (maker || null) && u.family === family && (u.speeds || null) === speeds
    );
    if (matches.length && !distinctReason) {
      console.log(`STOP -- ${matches.length} live transmission_units row(s) already share (maker='${maker}', family='${family}', speeds=${speeds}):`);
      for (const m of matches) console.log(`  ${m.code}`);
      console.log(`Pass --distinct "<reason>" if this is genuinely a different unit.`);
      process.exit(1);
    } else if (matches.length) {
      console.log(`OK (marked DISTINCT: ${distinctReason}) -- matches existing: ${matches.map(m => m.code).join(", ")}`);
    } else {
      console.log("OK -- no live near-duplicate found.");
    }
  } else if (kind === "drivetrains") {
    const [maker, type] = fields;
    if (!maker) {
      console.log("OK -- no maker given, near-duplicate check skipped (requires a non-null maker, same scoping as the gearbox safety net).");
      return;
    }
    const systems = await fetchAll("drivetrain_systems", "code, type, maker");
    const matches = systems.filter(s => s.type === type && (s.maker || null) === (maker || null));
    if (matches.length && !distinctReason) {
      console.log(`STOP -- ${matches.length} live drivetrain_systems row(s) already share (type='${type}', maker='${maker}'):`);
      for (const m of matches) console.log(`  ${m.code}`);
      console.log(`Name the closest existing system and the reason this differs, or pass --distinct "<reason>".`);
      process.exit(1);
    } else if (matches.length) {
      console.log(`OK (marked DISTINCT: ${distinctReason}) -- matches existing: ${matches.map(m => m.code).join(", ")}`);
    } else {
      console.log("OK -- no live near-duplicate found.");
    }
  } else {
    console.error(`Unknown --check-new kind '${kind}' -- expected 'transmissions' or 'drivetrains'.`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--check-new") {
    await checkNew(args.slice(1));
    return;
  }

  const a = await auditEngines();
  const bEngines = await auditAltCodeCollisions("catalog_engines");
  const bUnits = await auditAltCodeCollisions("transmission_units");
  const c = await auditGearboxes();
  const d = await auditDrivetrains();
  const e = await auditBrandsModels();
  const f = await auditVocabulary();

  printReport(a, bEngines, bUnits, c, d, e, f);
}

main();
