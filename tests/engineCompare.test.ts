// Rules behind the Engines tab comparison (app/db-test/lib/engineCompare.ts): verdict tag,
// fault ordering, and when Smart Choice may (and may not) highlight a column.
import { describe, it, expect } from "vitest";
import { engineVerdict, pickSmartChoice, reliabilityTone, topFaults, consumptionLabel } from "@/app/db-test/lib/engineCompare";
import type { DetailEngine } from "@/app/db-test/types";

function eng(over: Partial<DetailEngine> & { id: string }): DetailEngine {
  return {
    engine: over.id, fuel_type: "petrol", power_kw: 81, displacement_cc: 999, torque_nm: 200, cylinders: "L3",
    is_ev: false, reliability: "Good", reliability_rating: 4, timing_type: "belt", hybrid_type: null,
    consumption: { min: 5.5, max: 5.5, unit: "l/100 km" }, faults: [], pros: [], cons: [], bodyNames: [],
    ...over,
  };
}

describe("engineVerdict", () => {
  it("classifies by fuel and power", () => {
    expect(engineVerdict(eng({ id: "a", power_kw: 51 }))).toBe("City commuter");
    expect(engineVerdict(eng({ id: "b", power_kw: 81 }))).toBe("Everyday all-rounder");
    expect(engineVerdict(eng({ id: "c", power_kw: 110 }))).toBe("Motorway cruiser");
    expect(engineVerdict(eng({ id: "d", power_kw: 180 }))).toBe("Dynamic driving");
    expect(engineVerdict(eng({ id: "e", fuel_type: "diesel", power_kw: 85 }))).toBe("High-mileage commuter");
    expect(engineVerdict(eng({ id: "f", fuel_type: "diesel", power_kw: 140 }))).toBe("Long-distance & towing");
    expect(engineVerdict(eng({ id: "g", hybrid_type: "PHEV" }))).toBe("Plug-in: short daily trips");
  });
});

describe("reliabilityTone / topFaults / consumptionLabel", () => {
  it("folds the 5-word scale onto good/average/poor and never guesses for unrated", () => {
    expect([5, 4, 3, 2, 1, null].map(reliabilityTone)).toEqual(["good", "good", "average", "poor", "poor", "unknown"]);
  });
  it("orders faults critical first and caps at 3", () => {
    const f = topFaults([
      { fault: "minor one", severity: "minor" },
      { fault: "crit one", severity: "critical" },
      { fault: "mod one", severity: "moderate" },
      { fault: "crit two", severity: "critical" },
    ]);
    expect(f.map((x) => x.fault)).toEqual(["crit one", "crit two", "mod one"]);
  });
  it("shows a range only when min and max differ", () => {
    expect(consumptionLabel({ min: 5, max: 5, unit: "l/100 km" })).toBe("5.0 l/100 km");
    expect(consumptionLabel({ min: 4.8, max: 6.1, unit: "l/100 km" })).toBe("4.8–6.1 l/100 km");
  });
});

describe("pickSmartChoice", () => {
  it("picks the clearly more reliable engine and says why", () => {
    const good = eng({ id: "good", reliability_rating: 4 });
    const poor = eng({ id: "poor", reliability_rating: 2, faults: [{ fault: "Timing chain stretch", severity: "critical" }] });
    const pick = pickSmartChoice([poor, good]);
    expect(pick?.engineId).toBe("good");
    expect(pick?.reasons).toContain("Best reliability rating");
    expect(pick?.reasons).toContain("Fewest critical faults");
  });
  it("gives no pick when the engines are too close to call", () => {
    const a = eng({ id: "a", consumption: { min: 5.4, max: 5.4, unit: "l/100 km" } });
    const b = eng({ id: "b", consumption: { min: 5.6, max: 5.6, unit: "l/100 km" } });
    expect(pickSmartChoice([a, b])).toBeNull();
  });
  it("never picks an unrated engine, and needs two rated ones", () => {
    const unrated = eng({ id: "u", reliability: "—", reliability_rating: null });
    const rated = eng({ id: "r", reliability_rating: 5 });
    expect(pickSmartChoice([unrated, rated])).toBeNull();
  });
  it("ignores consumption when units differ (l vs kWh)", () => {
    const petrol = eng({ id: "p", reliability_rating: 4, consumption: { min: 9, max: 9, unit: "l/100 km" } });
    const ev = eng({ id: "e", fuel_type: "electric", reliability_rating: 4, consumption: { min: 15, max: 15, unit: "kWh/100 km" } });
    expect(pickSmartChoice([petrol, ev])).toBeNull();
  });
});
