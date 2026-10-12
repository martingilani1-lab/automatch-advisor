// Writes the guarded migration inserting into catalog_phase_unit_notes from the old
// transmissions table's per-vehicle `notes` column, mapped to catalog phase(s) via the old
// vehicle's brand + generation code (same resolution logic as scripts/fill/engine-import-
// resolve.mjs). Requires 20261011213839_add_catalog_phase_unit_notes.sql to have been run
// first (the table doesn't exist until then).
//
// Three buckets, per Martin's review:
//   - Resolves to >=1 real catalog phase that uses the unit -> inserted (77 pairs: 36 old
//     rows had a parseable generation code and matched directly; 8 more had no generation
//     code in the old vehicles.model string at all but resolved unambiguously by brand+model
//     name alone -- old vehicles are one row per generation, so every catalog phase of that
//     model sharing the car's single generation gets the same note).
//   - A phase exists for the brand+generation but its configs don't use this unit -> skipped
//     entirely (not imported, not saved) -- 8 rows (5 with a generation code, 3 without).
//   - No catalog phase exists for that brand+generation at all yet -> not imported here, left
//     in scripts/fill/pending-gearbox-notes.csv (37 rows) for whenever that car gets seeded.
//
// Writes a file only -- never executes anything against the DB.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "supabase", "migrations");

function esc(s) { return String(s).replace(/'/g, "''"); }
function parseGenCode(model) { const m = model.match(/\(([^)]+)\)\s*$/); return m ? m[1] : null; }

async function fetchAllRows(table, select) {
  const pageSize = 1000; const rows = []; let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const UNIT_CODES = ["DQ200", "DQ381", "DQ250", "MQ200", "DQ500", "MQ250", "MQ350"].map((c) => `VW ${c}`);

async function main() {
  const { data: units, error: uErr } = await supabase.from("transmission_units").select("id, code").in("code", UNIT_CODES);
  if (uErr) throw uErr;
  const unitIds = units.map((u) => u.id);

  const [vehicles, transmissions, catalogPhases, catalogModels, catalogBrands, configs] = await Promise.all([
    fetchAllRows("vehicles", "id, brand, model"),
    supabase.from("transmissions").select("id, vehicle_id, unit_id, notes").in("unit_id", unitIds).then((r) => { if (r.error) throw r.error; return r.data; }),
    fetchAllRows("catalog_phases", "id, model_id, generation_code, phase_label"),
    fetchAllRows("catalog_models", "id, brand_id, name"),
    fetchAllRows("catalog_brands", "id, name"),
    fetchAllRows("catalog_vehicle_configurations", "phase_id, unit_id"),
  ]);

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const modelById = new Map(catalogModels.map((m) => [m.id, m]));
  const brandById = new Map(catalogBrands.map((b) => [b.id, b]));
  const phasesByBrandGen = new Map();
  const phasesByBrandModel = new Map();
  for (const phase of catalogPhases) {
    const model = modelById.get(phase.model_id);
    const brand = model && brandById.get(model.brand_id);
    if (!brand) continue;
    const bmKey = `${brand.name.toLowerCase()}::${model.name.toLowerCase()}`;
    const bmList = phasesByBrandModel.get(bmKey) ?? [];
    bmList.push(phase);
    phasesByBrandModel.set(bmKey, bmList);
    if (!phase.generation_code) continue;
    const key = `${brand.name.toLowerCase()}::${phase.generation_code.toUpperCase()}`;
    const list = phasesByBrandGen.get(key) ?? [];
    list.push(phase);
    phasesByBrandGen.set(key, list);
  }
  const unitIdsByPhase = new Map();
  for (const c of configs) {
    const set = unitIdsByPhase.get(c.phase_id) ?? new Set();
    set.add(c.unit_id);
    unitIdsByPhase.set(c.phase_id, set);
  }

  const inserts = [];
  for (const t of transmissions) {
    if (!t.notes || !t.notes.trim()) continue;
    const vehicle = vehicleById.get(t.vehicle_id);
    if (!vehicle) continue;
    const genCode = parseGenCode(vehicle.model);
    let validPhases = [];
    if (genCode) {
      const pieces = genCode.includes("/") ? genCode.split("/").map((s) => s.trim()) : [genCode];
      const brandLower = vehicle.brand.toLowerCase();
      const candidatePhases = pieces.flatMap((p) => phasesByBrandGen.get(`${brandLower}::${p.toUpperCase()}`) || []);
      validPhases = candidatePhases.filter((p) => (unitIdsByPhase.get(p.id) || new Set()).has(t.unit_id));
    } else {
      const bmKey = `${vehicle.brand.toLowerCase()}::${vehicle.model.toLowerCase()}`;
      const candidatePhases = phasesByBrandModel.get(bmKey) || [];
      validPhases = candidatePhases.filter((p) => (unitIdsByPhase.get(p.id) || new Set()).has(t.unit_id));
    }
    for (const p of validPhases) inserts.push({ phaseId: p.id, unitId: t.unit_id, note: t.notes, label: `${vehicle.brand} ${vehicle.model} -> ${p.generation_code}/${p.phase_label}` });
  }

  // Collapse to distinct (phase,unit) pairs -- abort on a real conflict (same pair, different
  // text) rather than picking one silently.
  const byKey = new Map();
  for (const ins of inserts) {
    const key = `${ins.phaseId}:${ins.unitId}`;
    const list = byKey.get(key) ?? [];
    list.push(ins);
    byKey.set(key, list);
  }
  const conflicts = [...byKey.entries()].filter(([, list]) => new Set(list.map((i) => i.note)).size > 1);
  if (conflicts.length > 0) {
    throw new Error(`${conflicts.length} (phase,unit) pairs have conflicting note text -- aborting rather than picking one.`);
  }
  const resolved = [...byKey.values()].map((list) => list[0]);

  const ts = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  })();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_fill_catalog_phase_unit_notes_from_old_transmissions.sql`);

  const L = [];
  L.push(`-- Inserts ${resolved.length} catalog_phase_unit_notes rows from the old transmissions table's`);
  L.push(`-- per-vehicle \`notes\` column, mapped to catalog phase(s) by brand + generation code (or, for`);
  L.push(`-- the handful of old vehicles with no generation code in their model string at all, by brand +`);
  L.push(`-- model name alone, applied to every phase of that model sharing the car's one generation --`);
  L.push(`-- old vehicles are one row per generation). Generated by`);
  L.push(`-- scripts/fill/write-gearbox-notes-migration.mjs. Requires`);
  L.push(`-- 20261011213839_add_catalog_phase_unit_notes.sql to already be live -- the precondition`);
  L.push(`-- below checks the table exists before doing anything else.`);
  L.push(`--`);
  L.push(`-- Insert-only, each guarded individually (ON CONFLICT DO NOTHING against the table's own`);
  L.push(`-- unique(phase_id, unit_id)). Deliberately excludes: notes for a (brand, generation) whose`);
  L.push(`-- catalog phase doesn't actually use this unit (skipped, not saved anywhere -- the note`);
  L.push(`-- would be misleading there); notes for a (brand, generation) with no catalog phase seeded`);
  L.push(`-- yet at all (saved instead to scripts/fill/pending-gearbox-notes.csv for later).`);
  L.push(`--`);
  L.push(`-- Review-only: NOT run by this session. Run once, in a fresh SQL editor tab, AFTER`);
  L.push(`-- 20261011213839 has been applied.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  L.push(`DO $$`);
  L.push(`BEGIN`);
  L.push(`  IF to_regclass('public.catalog_phase_unit_notes') IS NULL THEN`);
  L.push(`    RAISE EXCEPTION 'catalog_phase_unit_notes does not exist -- run 20261011213839 first.';`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  for (const r of resolved) {
    L.push(`-- ${r.label}`);
    L.push(`INSERT INTO catalog_phase_unit_notes (phase_id, unit_id, note)`);
    L.push(`VALUES ('${r.phaseId}', '${r.unitId}', '${esc(r.note)}')`);
    L.push(`ON CONFLICT (phase_id, unit_id) DO NOTHING;`);
  }
  L.push(``);
  L.push(`-- Postcondition: exactly ${resolved.length} rows now exist for these specific (phase, unit) pairs.`);
  L.push(`DO $$`);
  L.push(`DECLARE present_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO present_n FROM catalog_phase_unit_notes WHERE (phase_id, unit_id) IN (`);
  L.push(resolved.map((r) => `    ('${r.phaseId}'::uuid, '${r.unitId}'::uuid)`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF present_n <> ${resolved.length} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${resolved.length} rows present, found %.', present_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath} (${resolved.length} inserts)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
