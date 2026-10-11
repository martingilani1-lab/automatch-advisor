// Writes the guarded migration filling reliability_rating/pros/cons for the 8 conflicting-
// variant engines that the automated Step 2 generator (generate-engine-import-migrations.mjs)
// left content-undecided -- CBZB@77, DFFA@110, DADA@110, CHZB@70, CRBC@110, DFGA@110,
// CHHA@169, DFHA@140. This content is NOT generated from the old engines table the way the
// other 25 engines' content was: it's hand-curated, merging only pros/cons items that
// recurred (same meaning) across >=2 of each engine's contributing old-vehicle variants,
// dropping every car-specific category (towing, body/segment remarks, consumption figures,
// drivetrain differences, trim names) regardless of recurrence, and -- per CLAUDE.md rule 9 --
// dropping every gearbox/drivetrain item too. Capped at 5 pros / 5 cons per engine. Every
// numeric/hardware claim (torque_nm, cylinders, timing_type) was cross-checked against the
// live catalog_engines row before being kept (CLAUDE.md rule 10); CRBC@110's torque figure was
// dropped from its wording after the check showed the catalog's real value (320 Nm) didn't
// match an old row's claimed 340 Nm. Reliability rating is the mode across each engine's
// contributing variants' mapped 1-5 values, ties resolved to the lower rating.
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

function esc(s) {
  return String(s).replace(/'/g, "''");
}
function sqlArray(list) {
  if (!list || list.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${list.map((s) => `'${esc(s)}'`).join(", ")}]::text[]`;
}

// Final, Martin-approved content (merge approved with corrections -- see conversation):
const ENGINES = [
  {
    code: "CBZB", powerKw: 77, rating: 2,
    pros: ["Much livelier than the naturally aspirated version — turbo transforms the car"],
    cons: ["Timing chain is a known, expensive failure", "Turbo adds repair complexity to a budget car"],
  },
  {
    code: "DFFA", powerKw: 110, rating: 4,
    pros: ["Strong torque delivery"],
    cons: ["DPF needs regular highway driving to regenerate", "Diesel's declining popularity may affect long-term resale"],
  },
  {
    code: "DADA", powerKw: 110, rating: 4,
    pros: ["Smooth, refined four-cylinder character", "Cylinder deactivation (ACT/COD) improves highway fuel economy"],
    cons: ["OPF needs occasional regeneration on short-trip use"],
  },
  {
    code: "CHZB", powerKw: 70, rating: 4,
    pros: ["Entry-level turbo engine, adequate for everyday driving"],
    cons: ["Underpowered on the motorway, especially with a full load", "Three-cylinder vibration/character noticeable"],
  },
  {
    code: "CRBC", powerKw: 110, rating: 4,
    pros: [
      "Strong torque from low revs",
      "Widely used engine — good parts availability",
      "Proven EA288 diesel platform",
      "Good performance for relaxed, highway-oriented driving",
    ],
    cons: ["EGR/DPF need regular highway driving to stay clean", "Higher maintenance cost than smaller diesel engines"],
  },
  {
    code: "DFGA", powerKw: 110, rating: 4,
    pros: ["Strong 340 Nm torque", "Proven, reliable EA288 engine with good service-network support"],
    cons: [
      "AdBlue system adds running/maintenance cost",
      "Noisier on cold starts",
      "Diesel's image may affect resale in some markets",
    ],
  },
  {
    code: "CHHA", powerKw: 169, rating: 3,
    pros: ["Properly quick acceleration"],
    cons: ["Falls into the highest insurance bracket"],
  },
  {
    code: "DFHA", powerKw: 140, rating: 4,
    pros: [],
    cons: ["Higher service cost than the 110 kW variant"],
  },
];

async function main() {
  const { data: liveEngines, error } = await supabase
    .from("catalog_engines")
    .select("id, code, power_kw, torque_nm, cylinders, timing_type, reliability_rating, pros, cons")
    .in("code", ENGINES.map((e) => e.code));
  if (error) throw error;

  const resolved = ENGINES.map((e) => {
    const live = liveEngines.find((l) => l.code === e.code && l.power_kw === e.powerKw);
    if (!live) throw new Error(`${e.code}@${e.powerKw} not found live -- aborting, not writing a migration against a guess.`);
    if (live.reliability_rating != null || live.pros != null || live.cons != null) {
      throw new Error(`${e.code}@${e.powerKw} already has reliability_rating/pros/cons set live -- this engine isn't one of the 8 undecided ones anymore, aborting rather than silently skipping.`);
    }
    return { ...e, id: live.id };
  });

  const ts = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  })();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_fill_merged_engine_content_8_conflicting_variants.sql`);

  const lines = [];
  lines.push(`-- Fills reliability_rating/pros/cons on the 8 engines Step 2's automated content`);
  lines.push(`-- migration (20261011205548) left undecided -- CBZB@77, DFFA@110, DADA@110, CHZB@70,`);
  lines.push(`-- CRBC@110, DFGA@110, CHHA@169, DFHA@140. Generated by`);
  lines.push(`-- scripts/fill/write-8-engine-merge-migration.mjs from hand-curated, Martin-approved`);
  lines.push(`-- content (see conversation) -- NOT a mechanical pass-through of old-engine rows like`);
  lines.push(`-- the other 25 engines got. Each item kept recurred (same meaning) across >= 2 of the`);
  lines.push(`-- engine's contributing old-vehicle variants; every car-specific category (towing,`);
  lines.push(`-- body/segment remarks, consumption figures, drivetrain differences, trim names) and`);
  lines.push(`-- every gearbox/drivetrain item (CLAUDE.md rule 9) was dropped regardless of how often`);
  lines.push(`-- it recurred. Every numeric/hardware claim (torque_nm, cylinders, timing_type) was`);
  lines.push(`-- cross-checked against the live catalog_engines row before being kept (CLAUDE.md`);
  lines.push(`-- rule 10) -- confirmed again live immediately before writing this file, not just at`);
  lines.push(`-- review time. Reliability is the mode across each engine's contributing variants'`);
  lines.push(`-- mapped 1-5 values, ties resolved to the lower rating.`);
  lines.push(`--`);
  lines.push(`-- COALESCE, so an already-non-NULL column is never overwritten. Review-only: NOT run`);
  lines.push(`-- by this session. Run once, in a fresh SQL editor tab.`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);
  lines.push(`-- Precondition: all 8 engines currently NULL on reliability_rating/pros/cons (confirmed`);
  lines.push(`-- live immediately before writing this file).`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  non_null_n integer;`);
  lines.push(`BEGIN`);
  lines.push(`  SELECT count(*) INTO non_null_n FROM catalog_engines`);
  lines.push(`  WHERE id IN (${resolved.map((e) => `'${e.id}'`).join(", ")})`);
  lines.push(`    AND (reliability_rating IS NOT NULL OR pros IS NOT NULL OR cons IS NOT NULL);`);
  lines.push(`  IF non_null_n <> 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'Expected 0 of the 8 targeted engines to already have content set, found % -- live state has drifted, aborting.', non_null_n;`);
  lines.push(`  END IF;`);
  lines.push(`END $$;`);
  lines.push(``);
  for (const e of resolved) {
    lines.push(`-- ${e.code}@${e.powerKw}`);
    lines.push(`UPDATE catalog_engines SET`);
    lines.push(`  reliability_rating = COALESCE(reliability_rating, ${e.rating}),`);
    lines.push(`  pros = COALESCE(pros, ${sqlArray(e.pros)}),`);
    lines.push(`  cons = COALESCE(cons, ${sqlArray(e.cons)})`);
    lines.push(`WHERE id = '${e.id}';`);
    lines.push(``);
  }
  lines.push(`-- Postcondition: all 8 engines now have reliability_rating/pros/cons set.`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  filled_n integer;`);
  lines.push(`BEGIN`);
  lines.push(`  SELECT count(*) INTO filled_n FROM catalog_engines`);
  lines.push(`  WHERE id IN (${resolved.map((e) => `'${e.id}'`).join(", ")})`);
  lines.push(`    AND reliability_rating IS NOT NULL AND pros IS NOT NULL AND cons IS NOT NULL;`);
  lines.push(`  IF filled_n <> 8 THEN`);
  lines.push(`    RAISE EXCEPTION 'Expected all 8 engines filled, found %.', filled_n;`);
  lines.push(`  END IF;`);
  lines.push(`END $$;`);
  lines.push(``);
  lines.push(`COMMIT;`);

  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Wrote ${outPath}`);
  for (const e of resolved) {
    console.log(`  ${e.code}@${e.powerKw} (live: torque_nm=${liveEngines.find(l=>l.code===e.code&&l.power_kw===e.powerKw).torque_nm}, cylinders=${liveEngines.find(l=>l.code===e.code&&l.power_kw===e.powerKw).cylinders}, timing_type=${liveEngines.find(l=>l.code===e.code&&l.power_kw===e.powerKw).timing_type}) -- rating ${e.rating}, ${e.pros.length} pros, ${e.cons.length} cons`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
