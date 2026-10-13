// Writes the one guarded, review-only migration for gearbox-content batch 1
// (scripts/fill/gearbox-content-batch1.txt -- 11 units). Per Martin's review:
//   - maker/reliability_rating/pros/cons: SET/REPLACE unconditionally on all 11 units.
//   - faults: REPLACE each unit's full fault list (delete existing, insert new with severity).
//   - Separately: fill maker = 'Volkswagen Group' where maker IS NULL on 6 other units
//     (VW DQ250/DQ381/DQ500/MQ200/MQ250/MQ350) -- rating/pros/cons/faults untouched there.
//
// Writes a file only -- never executes anything against the DB. Never touches the old
// `transmissions` table.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "supabase", "migrations");

function esc(s) { return String(s).replace(/'/g, "''"); }
function pgArray(items) { return `ARRAY[${items.map((s) => `'${esc(s)}'`).join(", ")}]::text[]`; }
function tsNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

function parseBatch(filename) {
  const lines = readFileSync(path.join(__dirname, filename), { encoding: "utf8" })
    .split("\n").filter((l) => l.trim().length > 0);
  return lines.map((line, idx) => {
    const [code, maker, ratingStr, prosStr, consStr, faultsStr] = line.split("|").map((s) => s.trim());
    const rating = Number(ratingStr);
    const pros = prosStr.split(",").map((s) => s.trim()).filter(Boolean);
    const cons = consStr.split(",").map((s) => s.trim()).filter(Boolean);
    const faults = [];
    for (const chunk of faultsStr.split(/\]\s*,\s*/)) {
      const fm = chunk.match(/^(.*?)\s*\[([a-z]+)\]?$/s);
      if (!fm) throw new Error(`${filename} line ${idx + 1}: can't parse fault chunk "${chunk}"`);
      faults.push({ text: fm[1].trim(), severity: fm[2].trim() });
    }
    return { code, maker, rating, pros, cons, faults };
  });
}

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

const MAKER_FILL_CODES = ["VW DQ250", "VW DQ381", "VW DQ500", "VW MQ200", "VW MQ250", "VW MQ350"];

async function main() {
  const rows = parseBatch("gearbox-content-batch1.txt");

  const units = await fetchAllRows("transmission_units", "id, code, maker");
  const unitByCode = new Map(units.map((u) => [u.code, u]));

  const matched = [];
  for (const row of rows) {
    const unit = unitByCode.get(row.code);
    if (!unit) throw new Error(`No live transmission_units row for code "${row.code}" -- aborting, nothing written.`);
    matched.push({ ...row, id: unit.id });
  }

  const makerFillUnits = [];
  for (const code of MAKER_FILL_CODES) {
    const unit = unitByCode.get(code);
    if (!unit) throw new Error(`No live transmission_units row for maker-fill code "${code}" -- aborting.`);
    if (unit.maker !== null) {
      console.log(`Note: ${code} already has maker "${unit.maker}" (not NULL) -- the NULL-only guard will skip it, no error.`);
    }
    makerFillUnits.push(unit);
  }

  const unitIds = matched.map((m) => m.id);
  const existingFaults = await supabase
    .from("catalog_component_faults")
    .select("id, unit_id")
    .in("unit_id", unitIds)
    .then((r) => { if (r.error) throw r.error; return r.data; });
  const totalExistingFaults = existingFaults.length;
  const totalNewFaults = matched.reduce((sum, m) => sum + m.faults.length, 0);

  const ts = tsNow();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_fill_gearbox_content_batch1.sql`);

  const L = [];
  L.push(`-- Fills maker/reliability_rating/pros/cons/faults for the 11 transmission_units in`);
  L.push(`-- gearbox-content-batch1.txt, per Martin's review. REPLACES maker/rating/pros/cons`);
  L.push(`-- unconditionally; REPLACES each unit's full fault list (delete existing, insert new`);
  L.push(`-- with severity) rather than merging, same "replace old faults with new" convention as`);
  L.push(`-- the engine-content batches.`);
  L.push(`--`);
  L.push(`-- Separately fills maker = 'Volkswagen Group' on 6 other units that had NULL maker`);
  L.push(`-- (VW DQ250/DQ381/DQ500/MQ200/MQ250/MQ350) -- NULL-only guarded, their`);
  L.push(`-- rating/pros/cons/faults are untouched by this migration.`);
  L.push(`--`);
  L.push(`-- Reviewed: 0 forbidden-content hits (engine/drivetrain/AWD/Haldex/clutch-pedal items),`);
  L.push(`-- 0 torque or speeds contradictions against live transmission_units/catalog_engines --`);
  L.push(`-- e.g. Audi DL382's "up to 400Nm" claim matches exactly the max torque (400 Nm, DETA@140`);
  L.push(`-- and CSWB@160 and DTPA@150) among engines actually paired with it in`);
  L.push(`-- catalog_vehicle_configurations. DQ400e's K0-clutch/high-voltage items and every unit's`);
  L.push(`-- dual-mass-flywheel/clutch-release-bearing items are intentional exemptions, not`);
  L.push(`-- engine/drivetrain content.`);
  L.push(`--`);
  L.push(`-- Generated by scripts/fill/write-gearbox-content-batch1-migration.mjs from`);
  L.push(`-- gearbox-content-batch1.txt (the source of truth -- edit that file and regenerate,`);
  L.push(`-- don't hand-patch this one). Every UPDATE/DELETE is scoped to a specific,`);
  L.push(`-- live-verified transmission_units id resolved by exact code match.`);
  L.push(`--`);
  L.push(`-- Never touches the old \`transmissions\` table. Review-only: NOT run by this session.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  L.push(`-- Precondition: all 11 target units and all 6 maker-fill units exist, and exactly`);
  L.push(`-- ${totalExistingFaults} existing faults sit on the 11 target units (drift check).`);
  L.push(`DO $$`);
  L.push(`DECLARE unit_n integer;`);
  L.push(`DECLARE fault_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO unit_n FROM transmission_units WHERE id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF unit_n <> ${matched.length} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${matched.length} target units to exist, found %.', unit_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT count(*) INTO fault_n FROM catalog_component_faults WHERE unit_id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF fault_n <> ${totalExistingFaults} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${totalExistingFaults} existing faults on target units, found % -- data has drifted since this migration was generated, aborting.', fault_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);

  for (const m of matched) {
    L.push(`-- ${m.code}`);
    L.push(`UPDATE transmission_units`);
    L.push(`SET maker = '${esc(m.maker)}', reliability_rating = ${m.rating}, pros = ${pgArray(m.pros)}, cons = ${pgArray(m.cons)}`);
    L.push(`WHERE id = '${m.id}'::uuid;`);
    L.push(``);
    L.push(`DELETE FROM catalog_component_faults WHERE unit_id = '${m.id}'::uuid;`);
    for (const f of m.faults) {
      L.push(`INSERT INTO catalog_component_faults (component_type, unit_id, fault, severity)`);
      L.push(`VALUES ('transmission', '${m.id}'::uuid, '${esc(f.text)}', '${f.severity}');`);
    }
    L.push(``);
  }

  L.push(`-- Maker-only fills (NULL-only guard, rating/pros/cons/faults untouched).`);
  for (const u of makerFillUnits) {
    L.push(`UPDATE transmission_units SET maker = 'Volkswagen Group' WHERE id = '${u.id}'::uuid AND maker IS NULL; -- ${u.code}`);
  }
  L.push(``);

  L.push(`-- Postcondition: exactly ${totalNewFaults} faults now sit on the 11 target units (the full new`);
  L.push(`-- set replacing the old ${totalExistingFaults}), and all 17 units (11 + 6) have a non-NULL maker.`);
  L.push(`DO $$`);
  L.push(`DECLARE fault_n integer;`);
  L.push(`DECLARE maker_filled_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO fault_n FROM catalog_component_faults WHERE unit_id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF fault_n <> ${totalNewFaults} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${totalNewFaults} faults on target units after replace, found %.', fault_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT count(*) INTO maker_filled_n FROM transmission_units WHERE id IN (`);
  L.push([...matched.map((m) => `    '${m.id}'::uuid`), ...makerFillUnits.map((u) => `    '${u.id}'::uuid`)].join(",\n"));
  L.push(`  ) AND maker IS NOT NULL;`);
  L.push(`  IF maker_filled_n <> ${matched.length + makerFillUnits.length} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected all ${matched.length + makerFillUnits.length} units (11 content + 6 maker-fill) to have a non-NULL maker, found %.', maker_filled_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath}`);
  console.log(`  ${matched.length} units updated (maker/rating/pros/cons REPLACE)`);
  console.log(`  faults: ${totalExistingFaults} existing -> ${totalNewFaults} new (full replace)`);
  console.log(`  ${makerFillUnits.length} units maker-filled (NULL-only)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
