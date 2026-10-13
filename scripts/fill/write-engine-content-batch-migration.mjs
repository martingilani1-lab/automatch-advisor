// Writes the one guarded, review-only migration covering engine-content batches 1 & 2
// (scripts/fill/engine-content-batch1.txt, engine-content-batch2.txt -- 59 + 71 = 130
// engines). Per Martin's review:
//   - rating/pros/cons REPLACE current values unconditionally on all 130 engines.
//   - faults REPLACE each engine's full fault list (DELETE current, INSERT new with severity).
//   - ARY@132 additionally gets timing_type set to 'belt' (was NULL) -- confirmed by Martin as
//     a belt-driven 1.8T 20V engine.
//   - AGN@92/APG@92's "Cam-to-cam chain tensioner rattle" fault is NOT a timing_type
//     contradiction -- these are belt-driven engines with a separate short chain linking the
//     intake/exhaust camshafts, confirmed by Martin. No flag needed, no change to timing_type.
//
// Writes a file only -- never executes anything against the DB.

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
    const [codeKw, ratingStr, prosStr, consStr, faultsStr] = line.split("|").map((s) => s.trim());
    const m = codeKw.match(/^(\S+)\s+(\d+)\s*kW$/);
    if (!m) throw new Error(`${filename} line ${idx + 1}: can't parse code/kW from "${codeKw}"`);
    const code = m[1];
    const kw = Number(m[2]);
    const rating = Number(ratingStr);
    const pros = prosStr.split(",").map((s) => s.trim()).filter(Boolean);
    const cons = consStr.split(",").map((s) => s.trim()).filter(Boolean);
    const faults = [];
    for (const chunk of faultsStr.split(/\]\s*,\s*/)) {
      const fm = chunk.match(/^(.*?)\s*\[([a-z]+)\]?$/s);
      if (!fm) throw new Error(`${filename} line ${idx + 1}: can't parse fault chunk "${chunk}"`);
      faults.push({ text: fm[1].trim(), severity: fm[2].trim() });
    }
    return { code, kw, rating, pros, cons, faults };
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

async function main() {
  const batch1 = parseBatch("engine-content-batch1.txt");
  const batch2 = parseBatch("engine-content-batch2.txt");
  const rows = [...batch1, ...batch2];

  const engines = await fetchAllRows("catalog_engines", "id, code, power_kw, timing_type");
  const engineByKey = new Map(engines.map((e) => [`${e.code}@${e.power_kw}`, e]));

  const matched = [];
  for (const row of rows) {
    const key = `${row.code}@${row.kw}`;
    const engine = engineByKey.get(key);
    if (!engine) throw new Error(`No live catalog_engines row for ${key} -- aborting, nothing written.`);
    matched.push({ ...row, id: engine.id, key, timingType: engine.timing_type });
  }

  const engineIds = matched.map((m) => m.id);
  const existingFaults = await supabase
    .from("catalog_component_faults")
    .select("id, engine_id")
    .in("engine_id", engineIds)
    .then((r) => { if (r.error) throw r.error; return r.data; });
  const totalExistingFaults = existingFaults.length;
  const totalNewFaults = matched.reduce((sum, m) => sum + m.faults.length, 0);

  const aryRow = matched.find((m) => m.key === "ARY@132");
  if (!aryRow) throw new Error("Expected ARY@132 in batch 2 -- not found.");

  const ts = tsNow();
  const outPath = path.join(MIGRATIONS_DIR, `${ts}_fill_engine_content_batches_1_2.sql`);

  const L = [];
  L.push(`-- Fills rating/pros/cons/faults for the 130 engines in engine-content-batch1.txt (59) and`);
  L.push(`-- engine-content-batch2.txt (71), per Martin's review. REPLACES current values`);
  L.push(`-- unconditionally on rating/pros/cons; REPLACES each engine's full fault list (delete`);
  L.push(`-- existing, insert new with severity) rather than merging, per explicit instruction`);
  L.push(`-- ("replace old faults with new").`);
  L.push(`--`);
  L.push(`-- Also sets ARY@132's timing_type to 'belt' (was NULL) -- confirmed by Martin as a`);
  L.push(`-- belt-driven 1.8T 20V engine, guarded to only fire if still NULL.`);
  L.push(`--`);
  L.push(`-- AGN@92/APG@92's "Cam-to-cam chain tensioner rattle" fault was flagged during review as`);
  L.push(`-- a possible chain-vs-belt contradiction (live timing_type='belt') but confirmed NOT a`);
  L.push(`-- contradiction: these are belt-driven engines with a separate short chain linking the`);
  L.push(`-- intake/exhaust camshafts -- both facts are true at once, so no timing_type change and`);
  L.push(`-- the fault is included as written.`);
  L.push(`--`);
  L.push(`-- Generated by scripts/fill/write-engine-content-batch-migration.mjs from the two source`);
  L.push(`-- .txt files (the source of truth for this content -- edit those and regenerate, don't`);
  L.push(`-- hand-patch this file). Every UPDATE/DELETE is scoped to a specific, live-verified`);
  L.push(`-- engine id resolved by (code, power_kw).`);
  L.push(`--`);
  L.push(`-- Review-only: NOT run by this session.`);
  L.push(``);
  L.push(`BEGIN;`);
  L.push(``);
  L.push(`-- Precondition: exactly ${matched.length} target engines exist, and exactly ${totalExistingFaults}`);
  L.push(`-- existing faults sit on them (sanity check against drift since this file was generated).`);
  L.push(`DO $$`);
  L.push(`DECLARE engine_n integer;`);
  L.push(`DECLARE fault_n integer;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO engine_n FROM catalog_engines WHERE id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF engine_n <> ${matched.length} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${matched.length} target engines to exist, found %.', engine_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT count(*) INTO fault_n FROM catalog_component_faults WHERE engine_id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF fault_n <> ${totalExistingFaults} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${totalExistingFaults} existing faults on target engines, found % -- data has drifted since this migration was generated, aborting.', fault_n;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);

  for (const m of matched) {
    L.push(`-- ${m.key}`);
    L.push(`UPDATE catalog_engines`);
    L.push(`SET reliability_rating = ${m.rating}, pros = ${pgArray(m.pros)}, cons = ${pgArray(m.cons)}`);
    L.push(`WHERE id = '${m.id}'::uuid;`);
    L.push(``);
    L.push(`DELETE FROM catalog_component_faults WHERE engine_id = '${m.id}'::uuid;`);
    for (const f of m.faults) {
      L.push(`INSERT INTO catalog_component_faults (component_type, engine_id, fault, severity)`);
      L.push(`VALUES ('engine', '${m.id}'::uuid, '${esc(f.text)}', '${f.severity}');`);
    }
    L.push(``);
  }

  L.push(`-- ARY@132: belt-driven 1.8T 20V, confirmed by Martin -- fill the NULL timing_type.`);
  L.push(`UPDATE catalog_engines SET timing_type = 'belt' WHERE id = '${aryRow.id}'::uuid AND timing_type IS NULL;`);
  L.push(``);

  L.push(`-- Postcondition: exactly ${totalNewFaults} faults now sit on the ${matched.length} target engines`);
  L.push(`-- (the full new set replacing the old ${totalExistingFaults}), and ARY@132's timing_type is 'belt'.`);
  L.push(`DO $$`);
  L.push(`DECLARE fault_n integer;`);
  L.push(`DECLARE ary_timing text;`);
  L.push(`BEGIN`);
  L.push(`  SELECT count(*) INTO fault_n FROM catalog_component_faults WHERE engine_id IN (`);
  L.push(matched.map((m) => `    '${m.id}'::uuid`).join(",\n"));
  L.push(`  );`);
  L.push(`  IF fault_n <> ${totalNewFaults} THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ${totalNewFaults} faults on target engines after replace, found %.', fault_n;`);
  L.push(`  END IF;`);
  L.push(``);
  L.push(`  SELECT timing_type INTO ary_timing FROM catalog_engines WHERE id = '${aryRow.id}'::uuid;`);
  L.push(`  IF ary_timing <> 'belt' THEN`);
  L.push(`    RAISE EXCEPTION 'Expected ARY@132 timing_type = belt, found %.', ary_timing;`);
  L.push(`  END IF;`);
  L.push(`END $$;`);
  L.push(``);
  L.push(`COMMIT;`);

  writeFileSync(outPath, L.join("\n") + "\n");
  console.log(`Wrote ${outPath}`);
  console.log(`  ${matched.length} engines updated (rating/pros/cons REPLACE)`);
  console.log(`  faults: ${totalExistingFaults} existing -> ${totalNewFaults} new (full replace)`);
  console.log(`  ARY@132 timing_type: ${aryRow.timingType ?? "NULL"} -> belt`);
}

main().catch((err) => { console.error(err); process.exit(1); });
