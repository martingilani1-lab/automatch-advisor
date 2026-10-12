// Writes the guarded, review-only migration setting severity on the 16 transmission faults
// that were still NULL after the round-2 cleanup (comparisons deleted, 2 texts updated --
// see 20261012202224). Every UPDATE is NULL-only guarded, so it can't clobber a severity
// someone already set by hand. Postcondition: 0 transmission faults with NULL severity,
// 24 rows total (matching the round-2 postcondition exactly, since no further
// deletes/inserts happen here).
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

const SEVERITIES = [
  { id: "3892ca64-5110-479c-85ae-af68ec97cc72", unit: "VW DQ200", text: "Input shaft bearing noise in neutral", severity: "minor" },
  { id: "edbbd02d-3820-40d1-b6d6-21ec51b8a048", unit: "VW DQ200", text: "Dry clutch plates — juddering on launch", severity: "moderate" },
  { id: "d371cbfa-a808-44a2-8867-c89109d27d88", unit: "VW DQ250", text: "Valve body — rough shifting if oil neglected", severity: "moderate" },
  { id: "a0541cbd-65a2-43a8-92bb-b15d979644b1", unit: "VW DQ250", text: "Oil cooler — check for leaks at higher mileage", severity: "minor" },
  { id: "95f32b66-1cf7-4869-aa49-67e8213aeadc", unit: "VW DQ381", text: "Software updates occasionally needed for shift quality", severity: "minor" },
  { id: "5c437dae-e245-419f-bfa6-424e8fd87cf9", unit: "VW DQ500", text: "Oil cooler leak at high mileage", severity: "minor" },
  { id: "7826e847-0ede-4a1e-b3c4-63d42f565f73", unit: "VW DQ500", text: "Mechatronics failure at very high mileage, repair ~1,200–2,000 EUR", textBeforeRound2: "Mechatronic at very high mileage", severity: "moderate" },
  { id: "184458cf-9503-43dc-b8e5-1f53a4306aca", unit: "VW DQ500", text: "Judder at very high mileage", severity: "minor" },
  { id: "a3875ba6-4352-4968-9d7e-3eb8935e36c8", unit: "VW MQ200", text: "Cable shift slight play over time", severity: "minor" },
  { id: "8085cfe7-6851-47a7-b70f-dc1594755583", unit: "VW MQ200", text: "Stiff shifting when cold in winter", severity: "minor" },
  { id: "cb7b9c90-dab9-46ab-b7dd-b77b3f49c728", unit: "VW MQ250", text: "Cable shift mechanism can develop play", severity: "minor" },
  { id: "937f9922-8c72-4e00-bbfa-18de61649b38", unit: "VW MQ250", text: "DMF wear with diesels around 180,000 – 250,000 km", severity: "moderate" },
  { id: "8e1981be-365c-4982-96e8-a53dc8350f18", unit: "VW MQ250", text: "Synchros notchy on 1st/2nd after 200,000+ km", severity: "minor" },
  { id: "a50773f9-cebd-4be1-9c19-0d81670ee61d", unit: "VW MQ350", text: "Clutch slave cylinder fluid leak on older units", severity: "minor" },
  { id: "bb715a1a-539f-4822-9c04-a45255a3f4f4", unit: "VW MQ350", text: "Synchros gradual wear after 200k+ km", severity: "minor" },
  { id: "72781921-d54e-4816-931b-bd776c4ea231", unit: "VW MQ350", text: "DMF wear with diesel at 150 – 200k km", severity: "moderate" },
];

async function main() {
  const ids = SEVERITIES.map((s) => s.id);
  const { data: live, error } = await supabase.from("catalog_component_faults").select("id, fault, severity").in("id", ids);
  if (error) throw error;
  const liveById = new Map(live.map((r) => [r.id, r]));

  const mismatches = [];
  for (const s of SEVERITIES) {
    const row = liveById.get(s.id);
    if (!row) { mismatches.push(`${s.id}: row no longer exists`); continue; }
    // This migration is meant to run AFTER round 2 (which updates this row's text), but round 2
    // hasn't necessarily been applied yet at generation time -- accept either the pre- or
    // post-round-2 text so this check doesn't false-positive on ordering alone. The UPDATE's own
    // WHERE clause below still matches only the post-round-2 text, since that's the state it's
    // meant to apply against.
    const acceptable = [s.text, s.textBeforeRound2].filter(Boolean).map((t) => t.toLowerCase());
    if (!acceptable.includes(row.fault.toLowerCase())) {
      mismatches.push(`${s.id}: expected text "${s.text}"${s.textBeforeRound2 ? ` (or pre-round-2 "${s.textBeforeRound2}")` : ""}, live is "${row.fault}"`);
    }
    if (row.severity !== null && row.severity !== s.severity) {
      mismatches.push(`${s.id}: already has a DIFFERENT severity live ("${row.severity}" vs intended "${s.severity}") -- NULL-only guard would skip this, flagging rather than silently no-op'ing`);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`${mismatches.length} mismatches against live data -- aborting:\n${mismatches.join("\n")}`);
  }
  const alreadySet = SEVERITIES.filter((s) => liveById.get(s.id)?.severity === s.severity).length;
  if (alreadySet > 0) {
    console.log(`Note: ${alreadySet} of ${SEVERITIES.length} already have this exact severity set -- writing anyway (NULL-only guard makes it a no-op for those).`);
  }

  const outPath = path.join(MIGRATIONS_DIR, `${tsNow()}_set_severity_on_remaining_transmission_faults.sql`);
  const L = [];
  L.push(`-- Sets severity on the ${SEVERITIES.length} transmission faults still NULL after the round-2 gearbox-fault`);
  L.push(`-- cleanup (20261012202224_gearbox_fault_cleanup_round2_comparisons_and_cost_text.sql). Values are`);
  L.push(`-- Martin-reviewed (critical/moderate/minor), e.g. MQ250's DMF wear is 'moderate' -- a wear item,`);
  L.push(`-- not a critical failure (the one row that WAS critical on MQ250, a near-duplicate DMF claim`);
  L.push(`-- about ARL/BAM petrol engines, was deleted in round 2 as intentional, not an oversight).`);
  L.push(`--`);
  L.push(`-- Generated by scripts/fill/write-gearbox-severity-migration.mjs. Every UPDATE is guarded on`);
  L.push(`-- id + exact text + severity IS NULL, so it can never overwrite a severity someone already`);
  L.push(`-- set by hand -- a row that's already been assigned a (possibly different) severity is left`);
  L.push(`-- untouched, not silently overridden.`);
  L.push(`--`);
  L.push(`-- Review-only: NOT run by this session. Expected postcondition after running: 0 transmission`);
  L.push(`-- faults with NULL severity, 24 rows total.`);
  L.push(`--`);
  L.push(`-- Depends on 20261012202224_gearbox_fault_cleanup_round2_comparisons_and_cost_text.sql having`);
  L.push(`-- already run: the VW DQ500 row below is matched by its POST-round-2 text ("Mechatronics`);
  L.push(`-- failure at very high mileage, repair ~1,200–2,000 EUR"), since round 2 is what produces`);
  L.push(`-- that text. Run strictly after round 2, same as the migration filename/timestamp order implies.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  for (const s of SEVERITIES) {
    L.push(`-- ${s.unit}`);
    L.push(`UPDATE catalog_component_faults`);
    L.push(`SET severity = '${s.severity}'`);
    L.push(`WHERE id = '${s.id}'::uuid AND lower(fault) = lower('${esc(s.text)}') AND severity IS NULL;`);
  }
  L.push(``);
  L.push(`-- Postcondition: 0 transmission faults with NULL severity, 24 rows total.`);
  L.push(`DO $$`);
  L.push(`DECLARE null_n integer;`);
  L.push(`DECLARE total_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO null_n FROM catalog_component_faults WHERE component_type = 'transmission' AND severity IS NULL;`);
  L.push(`  IF null_n <> 0 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected 0 transmission faults with NULL severity, found %.', null_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT count(*) INTO total_n FROM catalog_component_faults WHERE component_type = 'transmission';`);
  L.push(`  IF total_n <> 24 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected 24 transmission faults total, found %.', total_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath} (${SEVERITIES.length} severity updates)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
