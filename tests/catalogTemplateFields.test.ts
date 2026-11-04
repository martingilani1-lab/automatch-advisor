// The import pipeline's dilemma-field list (scripts/catalog-template-fields.mjs, 2026-11-04) is
// shared by intake-to-template / validate-template / generate-seed. These tests pin the two
// things that would silently break an import: the blank template CSVs drifting away from that
// list, and the per-cell format rules (booleans, numbers, frozen vocabularies).
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  CONFIG_FACT_FIELDS, DIM_EXTRA_FIELDS, ENGINE_FLAG_FIELDS, PHASE_EXTRA_FIELDS, PHASE_TEMPLATE_ONLY_FIELDS,
  checkFieldValue, drivenAxleOf,
} from "@/scripts/catalog-template-fields.mjs";

const TEMPLATE = path.join(__dirname, "..", "scripts", "new-car-template");
const VOCAB = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "scripts", "catalog-vocabularies.json"), "utf8"));

function header(file: string): string[] {
  const line = fs.readFileSync(path.join(TEMPLATE, file), "utf8").split("\n").find((l) => l.trim() && !l.startsWith("#"));
  return (line ?? "").trim().split(",");
}

describe("blank template CSVs carry every shared field", () => {
  it("engines.csv ends with the DPF / GPF / AdBlue flags", () => {
    expect(header("engines.csv").slice(-ENGINE_FLAG_FIELDS.length)).toEqual(ENGINE_FLAG_FIELDS);
  });
  it("phases.csv ends with chassis_type + the template-only test cycle", () => {
    const extra = [...PHASE_EXTRA_FIELDS, ...PHASE_TEMPLATE_ONLY_FIELDS];
    expect(header("phases.csv").slice(-extra.length)).toEqual(extra);
  });
  it("dimensions.csv ends with the towing / off-road / family fields", () => {
    expect(header("dimensions.csv").slice(-DIM_EXTRA_FIELDS.length)).toEqual(DIM_EXTRA_FIELDS);
  });
  it("config_facts.csv is the 4 identity columns + every config fact", () => {
    expect(header("config_facts.csv")).toEqual(["phase_label", "body_gearbox_drivetrain", "engine_code", "power_kw", ...CONFIG_FACT_FIELDS]);
  });
});

describe("checkFieldValue", () => {
  it("accepts empty as unknown, never as an error", () => {
    expect(checkFieldValue("has_dpf", "", VOCAB)).toBeNull();
    expect(checkFieldValue("towing_braked_kg", "", VOCAB)).toBeNull();
  });
  it("booleans must be exactly true / false", () => {
    expect(checkFieldValue("has_dpf", "true", VOCAB)).toBeNull();
    expect(checkFieldValue("has_adblue", "yes", VOCAB)).toMatch(/true or false/);
  });
  it("numbers must parse for their type", () => {
    expect(checkFieldValue("fuel_consumption_l100km", "5.7", VOCAB)).toBeNull();
    expect(checkFieldValue("towing_braked_kg", "1500.5", VOCAB)).toMatch(/integer/);
  });
  it("vocabulary fields follow catalog-vocabularies.json", () => {
    expect(checkFieldValue("consumption_cycle", "WLTP", VOCAB)).toBeNull();
    expect(checkFieldValue("consumption_cycle", "EPA", VOCAB)).toMatch(/frozen vocabulary/);
    expect(checkFieldValue("chassis_type", "ladder_frame", VOCAB)).toBeNull();
    expect(checkFieldValue("secondary_fuel_type", "diesel", VOCAB)).toMatch(/frozen vocabulary/);
  });
});

describe("drivenAxleOf", () => {
  it("maps the grid's drivetrain column to driven_axle", () => {
    expect(drivenAxleOf("FWD")).toBe("front");
    expect(drivenAxleOf("RWD")).toBe("rear");
    expect(drivenAxleOf("haldex_gen4")).toBe("all");
  });
});
