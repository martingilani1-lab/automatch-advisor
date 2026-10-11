// Step 2 generator: reads .engine-import-resolved.json (written by engine-import-resolve.mjs)
// and writes the engine-content migration to supabase/migrations/. Writes a file only --
// never executes anything against the DB, per the write-migration/author-data-sql discipline.
//
// Engine content: fills reliability_rating/pros/cons/battery_kwh on catalog_engines ONLY for
// engines with a decided winner (a single match, or a conflicting-variant group where exactly
// one variant's generation matched a catalog phase using that engine) -- COALESCE, so an
// already-non-NULL column is never overwritten. common_faults import into
// catalog_component_faults is UNCONDITIONAL on every engine with at least one matched old
// row, decided or not -- faults don't need a pros/cons winner, per Martin's own separate rule
// for that column.
//
// Consumption pre-fill is deliberately NOT generated here (and never will be from this
// source): consumption comes only from Martin's own scripts/fill/consumption.csv at the
// catalog_vehicle_configurations level, never from the old engines table's per-vehicle
// fuel_consumption_avg -- a prior version of this script generated a
// _prefill_consumption_from_old_engines.sql migration from the old-engines data; Martin asked
// for it deleted and this logic removed so it can't be regenerated the same way by mistake.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(readFileSync(path.join(__dirname, ".engine-import-resolved.json"), "utf8"));

const REPO_ROOT = path.join(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

function ts(offsetSeconds) {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function sqlArray(list) {
  if (!list || list.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${list.map((s) => `'${esc(s)}'`).join(", ")}]::text[]`;
}

const matched = rows.filter((r) => r.matchedEngineId);
const byEngine = new Map();
for (const r of matched) {
  const list = byEngine.get(r.matchedEngineId) ?? [];
  list.push(r);
  byEngine.set(r.matchedEngineId, list);
}

// ---- Migration A: engine content (reliability/pros/cons/battery) + faults ----

const contentUpdates = []; // { engineId, label, reliabilityMapped, pros, cons, batteryKwh }
const faultInserts = []; // { engineId, label, fault }
let enginesWithDecidedContent = 0;
let enginesWithFaultsOnly = 0;

for (const [engineId, group] of byEngine) {
  const label = group[0].matchedEngineLabel;
  const winner = group.find((r) => r.keep === "y");

  // Faults: union across EVERY row in the group, case-insensitive dedupe, first-seen casing
  // kept -- unconditional, per Martin's rule, regardless of whether a pros/cons winner exists.
  const seen = new Set();
  const faults = [];
  for (const r of group) {
    for (const f of r.commonFaults || []) {
      const key = f.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      faults.push(f);
    }
  }
  for (const f of faults) faultInserts.push({ engineId, label, fault: f });

  if (winner) {
    const batteryKwh = group.find((r) => r.oldBatteryKwh != null)?.oldBatteryKwh ?? null;
    contentUpdates.push({
      engineId, label,
      reliabilityMapped: winner.reliabilityMapped === "" ? null : winner.reliabilityMapped,
      pros: winner.pros, cons: winner.cons, batteryKwh,
    });
    enginesWithDecidedContent++;
  } else {
    enginesWithFaultsOnly++;
  }
}

const migAPath = path.join(MIGRATIONS_DIR, `${ts(0)}_import_engine_content_from_old_engines.sql`);
const migALines = [];
migALines.push(`-- Imports reliability_rating/pros/cons/battery_kwh and common_faults from the old`);
migALines.push(`-- (legacy, flat) engines table into catalog_engines/catalog_component_faults -- Step 2 of`);
migALines.push(`-- the engine-import review (scripts/fill/engine-import-review.csv, resolved per Martin's`);
migALines.push(`-- decisions, scripts/fill/engine-import-resolve.mjs). Generated, not hand-written --`);
migALines.push(`-- regenerate via scripts/fill/generate-engine-import-migrations.mjs if the review CSV changes.`);
migALines.push(`--`);
migALines.push(`-- Read-only on \`engines\`/\`vehicles\` (the source); only catalog_engines/`);
migALines.push(`-- catalog_component_faults are written, and only where genuinely new:`);
migALines.push(`--   - reliability_rating/pros/cons/battery_kwh: COALESCE, so an already-non-NULL column`);
migALines.push(`--     is never overwritten. ${enginesWithDecidedContent} catalog_engines rows have a decided`);
migALines.push(`--     winner (a clean single match, or the generation-matched variant in a conflicting`);
migALines.push(`--     group); ${enginesWithFaultsOnly} more get faults only, below -- their pros/cons/reliability`);
migALines.push(`--     stays NULL until a human picks a winner (scripts/fill/engine-import-review.csv's`);
migALines.push(`--     remaining "UNDECIDED" rows -- 48 at generation time).`);
migALines.push(`--   - common_faults: unioned across EVERY old row matched to that engine (case-insensitive`);
migALines.push(`--     dedupe), not just the decided winner -- faults don't need a pros/cons tie-break,`);
migALines.push(`--     per Martin's own separate rule for this column. Each INSERT is itself guarded`);
migALines.push(`--     (WHERE NOT EXISTS, case-insensitive) against a fault already recorded for that`);
migALines.push(`--     engine -- live-checked at run time, not precomputed, so it stays correct even if`);
migALines.push(`--     this file sits unreviewed for a while and something else adds a fault first.`);
migALines.push(`--`);
migALines.push(`-- Row-count guards assert this file touched exactly what it expects to, before COMMIT.`);
migALines.push(`-- Review-only: NOT run by this session. Run once, in a fresh SQL editor tab.`);
migALines.push(``);
migALines.push(`BEGIN;`);
migALines.push(``);
migALines.push(`-- Precondition: every engine this file touches must currently have reliability_rating,`);
migALines.push(`-- pros, and cons all NULL (true for all 131 catalog_engines rows as of generation time) --`);
migALines.push(`-- abort rather than silently no-op (COALESCE) over content this file didn't author if that's`);
migALines.push(`-- drifted.`);
migALines.push(`DO $$`);
migALines.push(`DECLARE`);
migALines.push(`  non_null_n integer;`);
migALines.push(`BEGIN`);
migALines.push(`  SELECT count(*) INTO non_null_n FROM catalog_engines`);
migALines.push(`  WHERE id IN (${contentUpdates.map((u) => `'${u.engineId}'`).join(", ")})`);
migALines.push(`    AND (reliability_rating IS NOT NULL OR pros IS NOT NULL OR cons IS NOT NULL);`);
migALines.push(`  IF non_null_n <> 0 THEN`);
migALines.push(`    RAISE EXCEPTION 'Expected 0 of the % targeted catalog_engines rows to already have reliability_rating/pros/cons set, found % -- live state has drifted, aborting rather than silently skipping content this file did not author.', ${contentUpdates.length}, non_null_n;`);
migALines.push(`  END IF;`);
migALines.push(`END $$;`);
migALines.push(``);
migALines.push(`-- ${contentUpdates.length} engines with a decided reliability/pros/cons winner.`);
for (const u of contentUpdates) {
  migALines.push(`-- ${u.label}`);
  migALines.push(`UPDATE catalog_engines SET`);
  migALines.push(`  reliability_rating = COALESCE(reliability_rating, ${u.reliabilityMapped == null ? "NULL" : u.reliabilityMapped}),`);
  migALines.push(`  pros = COALESCE(pros, ${sqlArray(u.pros)}),`);
  migALines.push(`  cons = COALESCE(cons, ${sqlArray(u.cons)})${u.batteryKwh != null ? "," : ""}`);
  if (u.batteryKwh != null) migALines.push(`  battery_kwh = COALESCE(battery_kwh, ${u.batteryKwh})`);
  migALines.push(`WHERE id = '${u.engineId}';`);
  migALines.push(``);
}

migALines.push(`-- Postcondition: every targeted engine now has reliability_rating/pros/cons set (they were`);
migALines.push(`-- all NULL going in, per the precondition above -- this just confirms the COALESCE fill`);
migALines.push(`-- actually landed, not that nothing else touched these rows concurrently).`);
migALines.push(`DO $$`);
migALines.push(`DECLARE`);
migALines.push(`  filled_n integer;`);
migALines.push(`BEGIN`);
migALines.push(`  SELECT count(*) INTO filled_n FROM catalog_engines`);
migALines.push(`  WHERE id IN (${contentUpdates.map((u) => `'${u.engineId}'`).join(", ")})`);
migALines.push(`    AND reliability_rating IS NOT NULL AND pros IS NOT NULL AND cons IS NOT NULL;`);
migALines.push(`  IF filled_n <> ${contentUpdates.length} THEN`);
migALines.push(`    RAISE EXCEPTION 'Expected all % targeted engines to have reliability_rating/pros/cons filled, found %.', ${contentUpdates.length}, filled_n;`);
migALines.push(`  END IF;`);
migALines.push(`END $$;`);
migALines.push(``);
migALines.push(`-- ${faultInserts.length} faults across ${enginesWithDecidedContent + enginesWithFaultsOnly} engines (decided and still-undecided alike --`);
migALines.push(`-- faults don't wait on a pros/cons winner). Each guarded individually against a`);
migALines.push(`-- case-insensitive duplicate already on that engine.`);
for (const f of faultInserts) {
  migALines.push(`INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)`);
  migALines.push(`SELECT 'engine', '${f.engineId}', '${esc(f.fault)}', NULL`);
  migALines.push(`WHERE NOT EXISTS (`);
  migALines.push(`  SELECT 1 FROM catalog_component_faults WHERE engine_id = '${f.engineId}' AND lower(fault) = lower('${esc(f.fault)}')`);
  migALines.push(`); -- ${f.label}`);
}
migALines.push(``);
migALines.push(`COMMIT;`);
writeFileSync(migAPath, migALines.join("\n") + "\n");

console.log(`Engine content migration: ${migAPath}`);
console.log(`  ${contentUpdates.length} engines get reliability/pros/cons/battery_kwh filled.`);
console.log(`  ${faultInserts.length} faults inserted across ${byEngine.size} engines total (incl. ${enginesWithFaultsOnly} faults-only, still-undecided-content engines).`);
