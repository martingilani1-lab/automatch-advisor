// Writes a guarded cleanup migration for the 10 live catalog_component_faults rows
// (component_type = 'engine') that violate CLAUDE.md rule 9 (engine content never contains
// gearbox/drivetrain facts) -- imported by 20261011205548 before that rule existed. Found by
// the same keyword cross-check now baked into generate-engine-import-migrations.mjs's
// stripGearboxDrivetrainItems(). Writes a file only -- a DELETE of existing data is
// destructive, human-run only (CLAUDE.md rule 5); never executed here.

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

const GEARBOX_DRIVETRAIN_RE = /\b(DQ\d{2,3}|MQ\d{2,3}|DSG|S-tronic|S tronic|Tiptronic|manual|automatic transmission|\bCVT\b|quattro|4MOTION|4x4|\bAWD\b|\bFWD\b|\bRWD\b|Haldex|mechatronic|differential|gearbox|clutch)\b/i;

function esc(s) {
  return String(s).replace(/'/g, "''");
}

async function main() {
  const { data, error } = await supabase
    .from("catalog_component_faults")
    .select("id, fault, catalog_engines(code, power_kw)")
    .eq("component_type", "engine");
  if (error) throw error;

  const violations = data.filter((r) => GEARBOX_DRIVETRAIN_RE.test(r.fault));
  if (violations.length === 0) {
    console.log("No live violations found -- nothing to clean up.");
    return;
  }

  const ts = (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  })();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_remove_gearbox_drivetrain_engine_faults.sql`);

  const lines = [];
  lines.push(`-- Removes ${violations.length} catalog_component_faults rows (component_type = 'engine')`);
  lines.push(`-- that violate CLAUDE.md rule 9 (engine content never contains gearbox/drivetrain`);
  lines.push(`-- facts) -- imported by 20261011205548_import_engine_content_from_old_engines.sql`);
  lines.push(`-- before that rule existed, from old-engine common_faults text that mentioned a`);
  lines.push(`-- gearbox code or drivetrain system. Found by the keyword check now baked into`);
  lines.push(`-- generate-engine-import-migrations.mjs's stripGearboxDrivetrainItems() -- this is`);
  lines.push(`-- the one-time cleanup for what that check would have stopped had it existed`);
  lines.push(`-- already; nothing here is expected to recur.`);
  lines.push(`--`);
  lines.push(`-- DESTRUCTIVE (DELETE of existing data) -- review-only, human-run, in a fresh SQL`);
  lines.push(`-- editor tab. Row ids are matched exactly (not just text), so this can't delete`);
  lines.push(`-- anything beyond the ${violations.length} rows identified live when this file was written.`);
  lines.push(``);
  lines.push(`BEGIN;`);
  lines.push(``);
  lines.push(`-- Precondition: exactly these ${violations.length} ids exist, each still matching the fault text`);
  lines.push(`-- recorded below -- abort if live state drifted since this file was generated.`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  mismatched_n integer;`);
  lines.push(`BEGIN`);
  lines.push(`  SELECT count(*) INTO mismatched_n FROM (VALUES`);
  lines.push(
    violations
      .map((v) => `    ('${v.id}'::uuid, '${esc(v.fault)}'::text)`)
      .join(",\n")
  );
  lines.push(`  ) AS expected(id, fault)`);
  lines.push(`  LEFT JOIN catalog_component_faults ccf ON ccf.id = expected.id AND ccf.fault = expected.fault`);
  lines.push(`  WHERE ccf.id IS NULL;`);
  lines.push(`  IF mismatched_n <> 0 THEN`);
  lines.push(`    RAISE EXCEPTION '% of the % targeted rows no longer match by id+fault text -- live state has drifted, aborting rather than deleting the wrong rows.', mismatched_n, ${violations.length};`);
  lines.push(`  END IF;`);
  lines.push(`END $$;`);
  lines.push(``);
  for (const v of violations) {
    lines.push(`-- ${v.catalog_engines.code}@${v.catalog_engines.power_kw}: "${v.fault}"`);
    lines.push(`DELETE FROM catalog_component_faults WHERE id = '${v.id}';`);
  }
  lines.push(``);
  lines.push(`-- Postcondition: none of the ${violations.length} ids remain.`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  remaining_n integer;`);
  lines.push(`BEGIN`);
  lines.push(`  SELECT count(*) INTO remaining_n FROM catalog_component_faults`);
  lines.push(`  WHERE id IN (${violations.map((v) => `'${v.id}'`).join(", ")});`);
  lines.push(`  IF remaining_n <> 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'Expected all ${violations.length} targeted rows deleted, % remain.', remaining_n;`);
  lines.push(`  END IF;`);
  lines.push(`END $$;`);
  lines.push(``);
  lines.push(`COMMIT;`);

  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Wrote ${outPath}`);
  console.log(`${violations.length} violating rows:`);
  for (const v of violations) console.log(`  [${v.catalog_engines.code}@${v.catalog_engines.power_kw}] "${v.fault}"`);
}

main().catch((err) => { console.error(err); process.exit(1); });
