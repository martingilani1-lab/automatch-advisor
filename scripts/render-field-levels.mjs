#!/usr/bin/env node
// Renders scripts/catalog-field-levels.json into docs/intake/FIELD-LEVELS.md.
//
// Why a generated file: the JSON is what scripts will read (validate-template.mjs, next step), the
// Markdown is what people and research tools read. Hand-maintaining both would let them drift --
// the same reason catalog-vocabularies.json exists as one shared list. Edit the JSON, re-run this.
//
// Usage: node scripts/render-field-levels.mjs            (writes the file)
//        node scripts/render-field-levels.mjs --check    (exit 1 if the file is out of date)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "scripts/catalog-field-levels.json");
const out = join(root, "docs/intake/FIELD-LEVELS.md");

const data = JSON.parse(readFileSync(src, "utf8"));
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const passLabel = { 1: "1 identity", 2: "2 technical", 3: "3 safety + equipment", 4: "4 reliability + service", 5: "5 market", derived: "derived", later: "later" };

const lines = [
  "<!-- GENERATED from scripts/catalog-field-levels.json by scripts/render-field-levels.mjs -- do not edit by hand. -->",
  "",
  "# Field levels for a catalog import",
  "",
  `Version ${data.version}. Which fields an intake must fill before a seed is generated. The research`,
  "passes are described in [RESEARCH-PROCESS.md](RESEARCH-PROCESS.md).",
  "",
  "| level | meaning |",
  "|---|---|",
  "| **required** | No seed while empty. Not findable → Martin supplies it (source `M`) or approves an exception with a reason (intake section M). Never a reason to guess. |",
  "| **conditional** | Required only when the condition holds; otherwise the intake writes `N/A`. |",
  "| optional | Filled when a source has it; `NULL` is fine. |",
  "",
];

for (const a of data.areas) {
  lines.push(`## ${a.area}`, "", `Table: \`${a.table}\`${a.shared ? " — shared reference data: a change applies to every car using the row, and is its own reviewed migration." : ""}`, "");
  lines.push("| field(s) | level | when | pass | note |", "|---|---|---|---|---|");
  for (const f of a.fields) {
    const level = f.level === "optional" ? "optional" : `**${f.level}**`;
    lines.push(`| ${cell(f.fields.map((x) => (/\s/.test(x) ? x : `\`${x}\``)).join(", "))} | ${level} | ${cell(f.when)} | ${cell(passLabel[f.pass] ?? f.pass)} | ${cell(f.note)} |`);
  }
  lines.push("");
}

const text = lines.join("\n");
if (process.argv.includes("--check")) {
  const current = existsSync(out) ? readFileSync(out, "utf8") : "";
  if (current !== text) {
    console.error("docs/intake/FIELD-LEVELS.md is out of date -- run node scripts/render-field-levels.mjs");
    process.exit(1);
  }
  console.log("FIELD-LEVELS.md is up to date.");
} else {
  writeFileSync(out, text);
  console.log(`wrote ${out}`);
}
