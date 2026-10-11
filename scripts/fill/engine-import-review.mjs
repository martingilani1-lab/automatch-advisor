// STEP 1 of the old-engines -> catalog_engines import. Read-only on `engines`/`vehicles` --
// no DB writes at all. Matches each old engines row to a catalog_engines row (best level
// first) and writes scripts/fill/engine-import-review.csv for human review. Step 2 (a guarded
// migration) only happens after that CSV comes back with "keep" decisions -- this script
// does not touch the database.
//
// Match levels:
//   L1  exact: old engine_code (trim, upper) = catalog code OR = any alt_code, AND power_kw equal.
//   L2  via car: old vehicle's brand + the generation code parsed out of its model string
//       (e.g. "Golf VII (5G)" -> "5G") resolves to catalog_phases row(s); the catalog engine
//       actually used in one of those phases' configs, matching fuel_type (case-insensitive)
//       + power_kw, and displacement_cc too when both sides have it. Needed for family codes
//       like EA288/EA888 Gen3B/EA211 and the ~3 old rows with no engine_code at all.
//   L3-CHECK  a code match exists but power_kw differs (old data has the wrong kW -- e.g.
//       CHPA 110 vs the catalog's 103). Never auto-matched; listed for a human decision.
//   AMBIGUOUS  L2 found more than one equally-plausible catalog engine (not one of the 4
//       levels the task named explicitly, but conflating it with L3-CHECK would hide that
//       it's a different failure mode -- reported as its own thing instead).
//   UNMATCHED  nothing found (most of these are non-VW-Group vehicles -- the catalog_
//       schema currently only has VW Group brands seeded, so this is expected, not a bug).

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "engine-import-review.csv");

const RELIABILITY_MAP = { excellent: 5, good: 4, average: 3, below_average: 2, poor: 1 };
const OUTCOME_ORDER = { L1: 0, L2: 1, "L3-CHECK": 2, AMBIGUOUS: 3, UNMATCHED: 4 };

// Same hard 1000-row-per-request Supabase cap as every other bulk export in scripts/fill/ --
// a single call's own .range() can't lift it; real pagination can.
async function fetchAllRows(table, select) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function parseGenCode(model) {
  const m = model.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : null;
}

function csvField(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const [vehicles, engines, catalogEngines, catalogPhases, catalogModels, catalogBrands, configs] = await Promise.all([
    fetchAllRows("vehicles", "id, brand, model"),
    fetchAllRows("engines", "*"),
    fetchAllRows("catalog_engines", "id, code, alt_codes, power_kw, fuel_type, displacement_cc"),
    fetchAllRows("catalog_phases", "id, model_id, generation_code"),
    fetchAllRows("catalog_models", "id, brand_id, name"),
    fetchAllRows("catalog_brands", "id, name"),
    fetchAllRows("catalog_vehicle_configurations", "phase_id, engine_id"),
  ]);

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const modelById = new Map(catalogModels.map((m) => [m.id, m]));
  const brandById = new Map(catalogBrands.map((b) => [b.id, b]));
  const catalogEngineById = new Map(catalogEngines.map((e) => [e.id, e]));

  // (brand name lowercase, generation_code uppercase) -> [catalog_phases.id, ...]
  const phasesByBrandGen = new Map();
  for (const phase of catalogPhases) {
    const model = modelById.get(phase.model_id);
    const brand = model && brandById.get(model.brand_id);
    if (!brand || !phase.generation_code) continue;
    const key = `${brand.name.toLowerCase()}::${phase.generation_code.toUpperCase()}`;
    const list = phasesByBrandGen.get(key) ?? [];
    list.push(phase.id);
    phasesByBrandGen.set(key, list);
  }

  // catalog_phases.id -> Set(catalog_engines.id) actually used by that phase's configs
  const engineIdsByPhase = new Map();
  for (const c of configs) {
    const set = engineIdsByPhase.get(c.phase_id) ?? new Set();
    set.add(c.engine_id);
    engineIdsByPhase.set(c.phase_id, set);
  }

  // normalized code/alt_code -> [catalog engine, ...] (several engines can share an alt_code
  // slug collision risk is exactly what reconcile.mjs's own alias-collision check guards
  // against at seed time -- this script only reads, so a collision here just means L1 checks
  // every candidate's power_kw rather than assuming uniqueness).
  const byCode = new Map();
  for (const ce of catalogEngines) {
    const codes = [ce.code, ...(ce.alt_codes || [])].map((c) => c.toUpperCase().trim());
    for (const c of codes) {
      const list = byCode.get(c) ?? [];
      list.push(ce);
      byCode.set(c, list);
    }
  }

  const rows = [];
  for (const e of engines) {
    const vehicle = vehicleById.get(e.vehicle_id);
    const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : `(unknown vehicle ${e.vehicle_id})`;
    const oldCode = (e.engine_code || "").trim().toUpperCase();

    let outcome = "UNMATCHED";
    let matchedEngine = null;
    let candidateEngines = [];

    if (oldCode && byCode.has(oldCode)) {
      const candidates = byCode.get(oldCode);
      const powerMatch = candidates.find((ce) => ce.power_kw === e.power_kw);
      if (powerMatch) {
        outcome = "L1";
        matchedEngine = powerMatch;
      } else {
        outcome = "L3-CHECK";
        candidateEngines = candidates;
      }
    }

    if (outcome === "UNMATCHED" && vehicle) {
      const genCode = parseGenCode(vehicle.model);
      if (genCode) {
        const pieces = genCode.includes("/") ? genCode.split("/").map((s) => s.trim()) : [genCode];
        const brandLower = vehicle.brand.toLowerCase();
        const phaseIds = pieces.flatMap((piece) => phasesByBrandGen.get(`${brandLower}::${piece.toUpperCase()}`) || []);

        const candidateIds = new Set();
        for (const pid of phaseIds) {
          for (const eid of engineIdsByPhase.get(pid) || []) candidateIds.add(eid);
        }

        const oldFuel = (e.fuel_type || "").toLowerCase();
        const l2Matches = [...candidateIds]
          .map((id) => catalogEngineById.get(id))
          .filter(
            (ce) =>
              ce &&
              ce.power_kw === e.power_kw &&
              ce.fuel_type.toLowerCase() === oldFuel &&
              (e.displacement_cc == null || ce.displacement_cc == null || ce.displacement_cc === e.displacement_cc)
          );
        const uniqueL2 = [...new Map(l2Matches.map((c) => [c.id, c])).values()];

        if (uniqueL2.length === 1) {
          outcome = "L2";
          matchedEngine = uniqueL2[0];
        } else if (uniqueL2.length > 1) {
          outcome = "AMBIGUOUS";
          candidateEngines = uniqueL2;
        }
      }
    }

    const relRaw = e.reliability_rating || "";
    const relMapped = RELIABILITY_MAP[relRaw.toLowerCase()] ?? "";

    rows.push({
      outcome,
      catalogLabel: matchedEngine
        ? `${matchedEngine.code}@${matchedEngine.power_kw}`
        : candidateEngines.map((c) => `${c.code}@${c.power_kw}`).join(" | "),
      matchedEngineId: matchedEngine ? matchedEngine.id : null,
      vehicleLabel,
      oldEngineCode: e.engine_code || "",
      oldLabel: e.label || "",
      oldPowerKw: e.power_kw,
      oldReliabilityRaw: relRaw,
      reliabilityMapped: relMapped,
      pros: e.pros || [],
      cons: e.cons || [],
      commonFaults: e.common_faults || [],
    });
  }

  // Variant numbers: only when >1 old row maps to the SAME catalog engine with genuinely
  // different content (reliability/pros/cons/faults) -- identical content across several old
  // rows needs no disambiguation, so it's left blank even though more than one row contributed.
  const byMatchedEngine = new Map();
  for (const r of rows) {
    if (!r.matchedEngineId) continue;
    const list = byMatchedEngine.get(r.matchedEngineId) ?? [];
    list.push(r);
    byMatchedEngine.set(r.matchedEngineId, list);
  }
  const conflictingEngines = [];
  for (const group of byMatchedEngine.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.vehicleLabel.localeCompare(b.vehicleLabel) || a.oldLabel.localeCompare(b.oldLabel));
    const signature = (r) => JSON.stringify({
      rel: r.reliabilityMapped,
      pros: [...r.pros].sort(),
      cons: [...r.cons].sort(),
      faults: [...r.commonFaults].sort(),
    });
    const distinctSignatures = new Set(group.map(signature));
    if (distinctSignatures.size > 1) {
      group.forEach((r, i) => { r.variant = i + 1; });
      conflictingEngines.push(group[0].catalogLabel);
    }
  }

  rows.sort((a, b) =>
    OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome] ||
    a.catalogLabel.localeCompare(b.catalogLabel) ||
    a.vehicleLabel.localeCompare(b.vehicleLabel) ||
    a.oldLabel.localeCompare(b.oldLabel)
  );

  const header = [
    "catalog_engine", "match_level", "old_vehicle", "old_engine_code", "old_label",
    "old_power_kw", "old_reliability_rating", "reliability_mapped", "pros", "cons",
    "common_faults", "variant", "keep",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvField(r.catalogLabel),
      csvField(r.outcome),
      csvField(r.vehicleLabel),
      csvField(r.oldEngineCode),
      csvField(r.oldLabel),
      csvField(r.oldPowerKw),
      csvField(r.oldReliabilityRaw),
      csvField(r.reliabilityMapped),
      csvField(r.pros.join("; ")),
      csvField(r.cons.join("; ")),
      csvField(r.commonFaults.join("; ")),
      csvField(r.variant ?? ""),
      "",
    ].join(","));
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n");

  const counts = {};
  for (const r of rows) counts[r.outcome] = (counts[r.outcome] || 0) + 1;

  console.log(`\n${rows.length} old engine rows reviewed. Wrote ${OUT_PATH}\n`);
  console.log("Matched per level:");
  for (const level of ["L1", "L2"]) console.log(`  ${level}: ${counts[level] || 0}`);
  console.log(`\nUnmatched: ${counts.UNMATCHED || 0} (mostly non-VW-Group vehicles -- catalog_ currently only has VW Group brands seeded)`);
  console.log(`\nL3-CHECK rows (code matches, power_kw differs -- never auto-import): ${counts["L3-CHECK"] || 0}`);
  if (counts["L3-CHECK"]) {
    rows.filter((r) => r.outcome === "L3-CHECK").forEach((r) => console.log(`  ${r.vehicleLabel} | ${r.oldEngineCode} ${r.oldPowerKw}kW -> candidates ${r.catalogLabel}`));
  }
  console.log(`\nAMBIGUOUS rows (L2 found >1 plausible catalog engine, not one of the named levels): ${counts.AMBIGUOUS || 0}`);
  if (counts.AMBIGUOUS) {
    rows.filter((r) => r.outcome === "AMBIGUOUS").forEach((r) => console.log(`  ${r.vehicleLabel} | ${r.oldEngineCode || "(no code)"} ${r.oldPowerKw}kW -> candidates ${r.catalogLabel}`));
  }
  console.log(`\nCatalog engines with conflicting variants across old rows: ${conflictingEngines.length}`);
  conflictingEngines.forEach((c) => console.log(`  ${c}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
