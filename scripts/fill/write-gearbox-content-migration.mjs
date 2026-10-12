// Writes the guarded migration filling reliability_rating/pros/cons on the 7 transmission
// units imported from the old (legacy, flat) transmissions table -- DQ200, DQ381, DQ250,
// MQ200, DQ500, MQ250, MQ350 -- plus the deduped new fault rows for all 7 (exact-text,
// case-insensitive, same convention as the engine-fault import; no semantic merging of
// faults the way pros/cons get merged). Content is hand-curated (see conversation), not a
// mechanical pass-through: pros/cons kept only where the same meaning recurred across >= 2
// of a unit's contributing old-vehicle rows, car-specific items (towing, body, 4x4,
// consumption) dropped regardless of recurrence, capped at 5 each, nothing invented.
// Numeric/hardware claims (family, speeds) re-verified live against transmission_units
// immediately before writing.
//
// Corrections applied per Martin's review:
//   - MQ350: dropped con "Only paired with the entry-level diesel engine" (wrong -- also a
//     configuration fact, not a gearbox property).
//   - MQ200: dropped con "No overdrive gear"; pro "Virtually indestructible -- extremely
//     robust" reworded to "Very robust, few failures".
//   - DQ200 fault "Input shaft bearing noise [in neutral]": kept -- appears verbatim (or near-
//     verbatim) across 4 separate old DQ200 rows (Fabia III, Octavia III, Golf VII, Polo V),
//     clearly tied to DQ200 itself, not borrowed from another unit.
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
function sqlArray(list) {
  if (!list || list.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${list.map((s) => `'${esc(s)}'`).join(", ")}]::text[]`;
}

const UNITS = [
  {
    code: "DQ200", rating: 2,
    pros: ["Quick, responsive shifts", "Good fuel economy", "Convenient in stop-and-go traffic"],
    cons: ["Mechatronics failure is the main reliability risk", "Dry-clutch judder in slow-moving traffic", "Repair cost can be disproportionate to the car's value"],
    faults: [
      "Mechatronics failure", "Mechatronics failure — same VW DQ200 issue", "Mechatronics failure — 800 – 1,500 EUR",
      "Dry clutch judder on launch", "Input shaft bearing noise in neutral", "Dry clutch judder in slow traffic",
      "Dry clutch judder in traffic", "Dry clutch judder", "Clutch shudder at low speed", "Software updates needed",
      "Mechatronics unit failure — 800 – 1,500 EUR", "Dry clutch plates — juddering on launch",
      "Input shaft bearing — noise in neutral", "Improved mechatronics over Gen 1 but not eliminated",
      "Dry clutch judder in slow traffic still possible", "Input shaft bearing noise",
    ],
  },
  {
    code: "DQ381", rating: 4,
    pros: ["Wet-clutch design — far more reliable than the dry-clutch DQ200", "Quick, smooth shifts", "Handles high torque well"],
    cons: ["More expensive to repair than a manual gearbox", "Occasional software updates needed for shift quality"],
    faults: [
      "Wet clutch — much more reliable than DQ200", "Software updates occasionally needed", "Wet clutch — reliable",
      "Wet clutch — much more reliable than old DQ200", "Software updates needed occasionally",
      "Newer design — fewer faults than DQ200", "Wet clutch — significantly more reliable than DQ200",
      "Software updates occasionally needed for shift quality",
    ],
  },
  {
    code: "DQ250", rating: 4,
    pros: ["Wet-clutch design — more reliable than the dry-clutch DQ200", "Quick, smooth shifts", "Handles high torque well"],
    cons: ["Mechatronics repair is costly when it fails", "Full service history should be verified on used examples"],
    faults: [
      "Mechatronics more robust than DQ200", "Mechatronics — more robust than DQ200", "Oil cooler — check for leaks",
      "Oil cooler leak possible", "Mechatronics — more robust than DQ200 but can fail", "Valve body wear if oil neglected",
      "Mechatronics — robust but not trouble-free", "Oil cooler check for leaks",
      "Mechatronics can fail but more reliable than DQ200", "Valve body — rough shifting if oil neglected",
      "Mechatronics more robust than DQ200 but not trouble-free", "Oil cooler — check for leaks at higher mileage",
      "Oil cooler leaks possible", "Mechatronic at very high mileage",
    ],
  },
  {
    code: "MQ200", rating: 5,
    pros: ["Very robust, few failures", "Light, easy clutch action", "Cheap to maintain — inexpensive clutch replacement", "Precise shift action"],
    cons: ["Only 5 speeds — higher revs on the motorway"],
    faults: [
      "Cable shift slight play over time", "Clutch cable stretching with age", "Cable clutch stretching",
      "Stiff shifting when cold in winter", "Cable shift slight play with age", "Stiff when cold in winter",
      "Stiff when cold", "Clutch cable stretching",
    ],
  },
  {
    code: "DQ500", rating: 4,
    pros: ["Most robust DSG variant, built for high torque", "Quick, smooth shifts", "Wet-clutch design, no DQ200 issues"],
    cons: ["Most expensive DSG to repair if mechatronics fails"],
    faults: [
      "Mechatronics more durable but expensive — 1,200 – 2,000 EUR", "Oil cooler leak at high mileage",
      "Mechatronics durable but expensive — 1,200 – 2,000 EUR", "Mechatronic at very high mileage",
      "Judder at very high mileage",
    ],
  },
  {
    code: "MQ250", rating: 4,
    pros: ["Proven, reliable manual gearbox", "Lower running cost than a DSG", "Direct, engaging shift feel"],
    cons: ["DMF (dual-mass flywheel) is a wear item on diesel engines", "Less convenient than an automatic in heavy traffic"],
    faults: [
      "DMF wear with diesel engines", "Cable shift mechanism can develop play", "DMF wear with diesels around 180,000 – 250,000 km",
      "Synchros notchy on 1st/2nd after 200,000+ km", "DMF wear with diesels", "Synchros gradual wear after 200k km",
      "Cable shift play over time", "DMF wear with diesel", "Slight cable play over time",
    ],
  },
  {
    code: "MQ350", rating: 4,
    pros: ["Proven, reliable manual gearbox", "Lower running cost than a DSG", "Direct driving control"],
    cons: ["DMF (dual-mass flywheel) is a wear item on diesel engines"],
    faults: [
      "DMF wear with diesel engines", "Clutch slave cylinder fluid leak on older units", "DMF wear with diesels",
      "Synchros gradual wear after 200k+ km", "DMF wear with diesel at 150 – 200k km", "Synchros gradual wear",
      "DMF wear with diesel", "Synchros wear after 200k km",
    ],
  },
];

async function main() {
  const { data: liveUnits, error } = await supabase
    .from("transmission_units")
    .select("id, code, family, speeds, maker, reliability_rating, pros, cons")
    .in("code", UNITS.map((u) => `VW ${u.code}`));
  if (error) throw error;

  const resolved = UNITS.map((u) => {
    const live = liveUnits.find((l) => l.code === `VW ${u.code}`);
    if (!live) throw new Error(`VW ${u.code} not found live -- aborting.`);
    if (live.reliability_rating != null || live.pros != null || live.cons != null) {
      throw new Error(`VW ${u.code} already has reliability_rating/pros/cons set live -- aborting rather than silently skipping.`);
    }
    return { ...u, id: live.id, family: live.family, speeds: live.speeds };
  });

  // Dedupe each unit's new faults against what's already live, case-insensitive.
  const { data: existingFaults, error: fErr } = await supabase
    .from("catalog_component_faults")
    .select("unit_id, fault")
    .eq("component_type", "transmission")
    .in("unit_id", resolved.map((u) => u.id));
  if (fErr) throw fErr;

  for (const u of resolved) {
    const existingKeys = new Set(existingFaults.filter((f) => f.unit_id === u.id).map((f) => f.fault.toLowerCase().trim()));
    const seen = new Set(existingKeys);
    u.newFaults = [];
    for (const f of u.faults) {
      const key = f.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      u.newFaults.push(f);
    }
  }

  const ts = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  })();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_fill_gearbox_content_from_old_transmissions.sql`);
  const allIds = resolved.map((u) => `'${u.id}'`).join(", ");

  const L = [];
  L.push(`-- Fills reliability_rating/pros/cons on the 7 transmission units imported from the old`);
  L.push(`-- (legacy, flat) transmissions table -- DQ200, DQ381, DQ250, MQ200, DQ500, MQ250, MQ350 --`);
  L.push(`-- plus their deduped new fault rows (exact-text, case-insensitive, same convention as the`);
  L.push(`-- engine-fault import). Generated by scripts/fill/write-gearbox-content-migration.mjs from`);
  L.push(`-- hand-curated, Martin-approved content (see conversation) -- not a mechanical pass-through.`);
  L.push(`-- Each pros/cons item recurred (same meaning) across >= 2 of the unit's contributing old-`);
  L.push(`-- vehicle rows; car-specific categories (towing, body, 4x4, consumption) dropped regardless`);
  L.push(`-- of recurrence; capped at 5 each. family/speeds re-verified live immediately before writing.`);
  L.push(`--`);
  L.push(`-- COALESCE on content (never overwrites); each fault INSERT is itself guarded (WHERE NOT`);
  L.push(`-- EXISTS, case-insensitive) against a duplicate already on that unit. Review-only: NOT run`);
  L.push(`-- by this session. Run once, in a fresh SQL editor tab.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  L.push(`-- Precondition: all 7 units currently NULL on reliability_rating/pros/cons.`);
  L.push(`DO $$`);
  L.push(`DECLARE non_null_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO non_null_n FROM transmission_units`);
  L.push(`  WHERE id IN (${allIds}) AND (reliability_rating IS NOT NULL OR pros IS NOT NULL OR cons IS NOT NULL);`);
  L.push(`  IF non_null_n <> 0 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected 0 of the 7 targeted units to already have content set, found % -- aborting.', non_null_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  for (const u of resolved) {
    L.push(`-- ${u.code} (live: family=${u.family}, speeds=${u.speeds})`);
    L.push(`UPDATE transmission_units SET`);
    L.push(`  reliability_rating = COALESCE(reliability_rating, ${u.rating}),`);
    L.push(`  pros = COALESCE(pros, ${sqlArray(u.pros)}),`);
    L.push(`  cons = COALESCE(cons, ${sqlArray(u.cons)})`);
    L.push(`WHERE id = '${u.id}';`);
    L.push(``);
  }
  L.push(`-- Postcondition: all 7 units now have reliability_rating/pros/cons set.`);
  L.push(`DO $$`);
  L.push(`DECLARE filled_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO filled_n FROM transmission_units`);
  L.push(`  WHERE id IN (${allIds}) AND reliability_rating IS NOT NULL AND pros IS NOT NULL AND cons IS NOT NULL;`);
  L.push(`  IF filled_n <> 7 THEN`);
  L.push(`    RAISE EXCEPTION 'Expected all 7 units filled, found %.', filled_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  const totalFaults = resolved.reduce((s, u) => s + u.newFaults.length, 0);
  L.push(`-- ${totalFaults} new transmission faults across all 7 units, each guarded individually.`);
  for (const u of resolved) {
    for (const f of u.newFaults) {
      L.push(`INSERT INTO catalog_component_faults (component_type, unit_id, fault, severity)`);
      L.push(`SELECT 'transmission', '${u.id}', '${esc(f)}', NULL`);
      L.push(`WHERE NOT EXISTS (`);
      L.push(`  SELECT 1 FROM catalog_component_faults WHERE unit_id = '${u.id}' AND lower(fault) = lower('${esc(f)}')`);
      L.push(`); -- ${u.code}`);
    }
  }
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath}`);
  for (const u of resolved) console.log(`  ${u.code}: rating ${u.rating}, ${u.pros.length} pros, ${u.cons.length} cons, ${u.newFaults.length} new faults`);
}

main().catch((err) => { console.error(err); process.exit(1); });
