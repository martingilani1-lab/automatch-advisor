// Writes the guarded, review-only migration for Martin's second gearbox-fault cleanup pass:
// deletes comparison-statement rows that were wrongly imported as faults (see CLAUDE.md rule
// 11 -- "more reliable than X" is a comparison, not a fault), plus two text updates adding
// concrete repair-cost figures to two existing rows. Severity assignment (the third part of
// this cleanup) is a separate follow-up migration, pending the severity table.
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
function tsNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

const DELETES = [
  { id: "194a975d-f824-48a4-b9e5-12a4fa1ff366", text: "Improved mechatronics over Gen 1 but not eliminated", unit: "VW DQ200" },
  { id: "0d4dfa3b-ba92-4198-86e5-d09c948609b4", text: "Software updates needed", unit: "VW DQ200" },
  { id: "b33efdf3-979f-4fab-a4d2-bb47eacbd80c", text: "Mechatronics unit failure — 800 – 1,500 EUR", unit: "VW DQ200" },
  { id: "eb7be6f8-cdc3-407a-a29d-902f6e917b9d", text: "Newer design — fewer faults than DQ200", unit: "VW DQ381" },
  { id: "df2db28f-3c6f-49e3-bd85-0a76bbbbc2da", text: "Wet clutch — significantly more reliable than DQ200", unit: "VW DQ381" },
  { id: "f7bff11c-392d-481b-9e9f-8e725ba0951e", text: "Mechatronics more robust than DQ200 but not trouble-free", unit: "VW DQ250" },
  { id: "9e45fdf1-81be-49f8-837f-adf76748c088", text: "Mechatronics more durable but expensive — 1,200 – 2,000 EUR", unit: "VW DQ500" },
  { id: "4afbba96-8438-48ef-ac9e-39244b344f81", text: "Clutch cable stretching with age", unit: "VW MQ200" },
  { id: "67cebf3f-5119-4648-b3c8-857545a70813", text: "Dual-mass flywheel failure (vibrations, rattling at idle).", unit: "VW MQ250" },
];

const UPDATES = [
  {
    id: "7b202d46-40dc-4306-8b79-5a0df7e91412",
    unit: "VW DQ200",
    oldText: "Rapid dry-clutch wear and mechatronics failure.",
    newText: "Mechatronics failure, repair ~800–1,500 EUR",
  },
  {
    id: "7826e847-0ede-4a1e-b3c4-63d42f565f73",
    unit: "VW DQ500",
    oldText: "Mechatronic at very high mileage",
    newText: "Mechatronics failure at very high mileage, repair ~1,200–2,000 EUR",
  },
];

async function main() {
  const allIds = [...DELETES.map((d) => d.id), ...UPDATES.map((u) => u.id)];
  const { data: live, error } = await supabase.from("catalog_component_faults").select("id, fault").in("id", allIds);
  if (error) throw error;
  const liveById = new Map(live.map((r) => [r.id, r.fault]));

  const mismatches = [];
  for (const d of DELETES) {
    const liveText = liveById.get(d.id);
    if (liveText !== undefined && liveText.toLowerCase() !== d.text.toLowerCase()) {
      mismatches.push(`DELETE ${d.id}: expected "${d.text}", live is "${liveText}"`);
    }
  }
  for (const u of UPDATES) {
    const liveText = liveById.get(u.id);
    if (liveText === undefined) {
      mismatches.push(`UPDATE ${u.id}: row no longer exists -- cannot update text that's already gone`);
    } else if (liveText.toLowerCase() !== u.oldText.toLowerCase() && liveText.toLowerCase() !== u.newText.toLowerCase()) {
      mismatches.push(`UPDATE ${u.id}: expected "${u.oldText}", live is "${liveText}"`);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`${mismatches.length} mismatches against live data -- aborting:\n${mismatches.join("\n")}`);
  }
  const alreadyGoneDeletes = DELETES.filter((d) => !liveById.has(d.id)).length;
  const alreadyAppliedUpdates = UPDATES.filter((u) => liveById.get(u.id)?.toLowerCase() === u.newText.toLowerCase()).length;
  if (alreadyGoneDeletes > 0 || alreadyAppliedUpdates > 0) {
    console.log(`Note: ${alreadyGoneDeletes} delete target(s) already absent, ${alreadyAppliedUpdates} update target(s) already applied -- writing the migration anyway (idempotent).`);
  }

  const outPath = path.join(MIGRATIONS_DIR, `${tsNow()}_gearbox_fault_cleanup_round2_comparisons_and_cost_text.sql`);
  const L = [];
  L.push(`-- Second gearbox-fault cleanup pass (CLAUDE.md rule 11): deletes ${DELETES.length} rows that are`);
  L.push(`-- comparison statements ("more reliable than X", "fewer faults than Y") wrongly imported as`);
  L.push(`-- faults -- a comparison isn't a defect, and the unit's own reliability_rating/reliability_note`);
  L.push(`-- already carries that relative information. Also updates ${UPDATES.length} rows' text to fold in a`);
  L.push(`-- concrete repair-cost figure that was previously sitting on a separate, now-deleted comparison`);
  L.push(`-- row (DQ200: "Mechatronics unit failure — 800 – 1,500 EUR"; DQ500: cost figure moved onto the`);
  L.push(`-- "very high mileage" row since the standalone cost-only row is gone).`);
  L.push(`--`);
  L.push(`-- Generated by scripts/fill/write-gearbox-fault-cleanup-round2-migration.mjs. Every DELETE is`);
  L.push(`-- guarded on id + exact text; every UPDATE is guarded to only fire if the row still has its`);
  L.push(`-- original (pre-update) text, so it's a safe no-op if already applied.`);
  L.push(`--`);
  L.push(`-- Review-only: NOT run by this session. Severity assignment for the remaining NULL-severity`);
  L.push(`-- rows is a separate follow-up migration, pending the severity table.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  for (const d of DELETES) {
    L.push(`-- ${d.unit}`);
    L.push(`DELETE FROM catalog_component_faults`);
    L.push(`WHERE id = '${d.id}'::uuid AND lower(fault) = lower('${esc(d.text)}');`);
  }
  L.push(``);
  for (const u of UPDATES) {
    L.push(`-- ${u.unit}`);
    L.push(`UPDATE catalog_component_faults`);
    L.push(`SET fault = '${esc(u.newText)}'`);
    L.push(`WHERE id = '${u.id}'::uuid AND lower(fault) = lower('${esc(u.oldText)}');`);
  }
  L.push(``);
  L.push(`-- Postcondition: the 9 deleted ids are gone, and the 2 updated ids now hold their new text.`);
  L.push(`DO $$`);
  L.push(`DECLARE remaining_n integer;`);
  L.push(`DECLARE updated_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO remaining_n FROM catalog_component_faults WHERE id IN (`);
  L.push(DELETES.map((d) => `    '${d.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF remaining_n <> 0 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected 0 of these ${DELETES.length} deleted rows to remain, found %.', remaining_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT count(*) INTO updated_n FROM catalog_component_faults WHERE (id, fault) IN (`);
  L.push(UPDATES.map((u) => `    ('${u.id}'::uuid, '${esc(u.newText)}')`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF updated_n <> ${UPDATES.length} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${UPDATES.length} rows updated to their new text, found %.', updated_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath} (${DELETES.length} deletes, ${UPDATES.length} updates)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
