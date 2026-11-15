// Rules behind the Engines tab comparison (app/db-test/lib/engineCompare.ts): verdict tag,
// fault ordering, and when Smart Choice may (and may not) highlight a column.
import { describe, it, expect } from "vitest";
import {
  engineVerdict, pickSmartChoice, reliabilityTone, topFaults, consumptionLabel,
  compareEngineTitle, engineFigures, faultAppliesToYears, fieldsFor, figureLabel, figuresComparable,
  midYearly, powertrainClass, rowsFor,
} from "@/app/db-test/lib/engineCompare";
import type { DetailEngine, EngineFigure } from "@/app/db-test/types";
import type { CatalogConfig } from "@/app/catalog/lib/types";
import { EMPTY_ENGINE_MAINTENANCE } from "@/app/catalog/lib/engineMaintenance";

function eng(over: Partial<DetailEngine> & { id: string }): DetailEngine {
  return {
    engine: over.id, fuel_type: "petrol", power_kw: 81, displacement_cc: 999, torque_nm: 200, cylinders: "L3",
    is_ev: false, reliability: "Good", reliability_rating: 4, timing_type: "belt", hybrid_type: null,
    timing_replacement_km: 120000, maintenance: EMPTY_ENGINE_MAINTENANCE,
    has_dpf: null, has_gpf: null, has_adblue: null, injection_type: null,
    ev: { batteryCapacityNetKwh: null, maxAcChargingKw: null, maxDcChargingKw: null, batteryThermalManagement: null, heatPump: null },
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

describe("pickSmartChoice with yearly maintenance", () => {
  const withYearly = (id: string, min: number, max: number) =>
    eng({ id, maintenance: { ...EMPTY_ENGINE_MAINTENANCE, yearlyMaintenanceEurMin: min, yearlyMaintenanceEurMax: max } });
  it("a €150/year cheaper engine wins between otherwise equal engines, with the reason", () => {
    const pick = pickSmartChoice([withYearly("dear", 300, 400), withYearly("cheap", 150, 250)]);
    expect(pick?.engineId).toBe("cheap");
    expect(pick?.reasons).toContain("Lowest yearly maintenance");
  });
  it("ignores yearly cost when any compared engine lacks it", () => {
    expect(pickSmartChoice([withYearly("a", 150, 250), eng({ id: "b" })])).toBeNull();
  });
  it("never outweighs a reliability tier on its own", () => {
    const reliableButDear = { ...withYearly("r", 350, 450), reliability_rating: 5 };
    const cheapButWorse = { ...withYearly("c", 150, 250), reliability_rating: 4 };
    expect(pickSmartChoice([reliableButDear, cheapButWorse])?.engineId).toBe("r");
  });
});

// ---- Powertrain-aware comparison (Martin, 2026-11-15) -------------------------------------
// BMW i3 (I01) Facelift: "i3 94 Ah" (EV) vs "i3 (94 Ah) with Range Extender" (EREV).

const fig = (v: number, unit: EngineFigure["unit"], cycle: string | null, weighted = false): EngineFigure =>
  ({ min: v, max: v, unit, cycle, weighted });

const i3Ev = eng({
  id: "ev", fuel_type: "electric", hybrid_type: null, power_kw: 125, displacement_cc: null, timing_type: null,
  display_name: "i3 94 Ah, 125kW",
  electric_consumption: fig(13.1, "kWh/100 km", "NEDC"), fuel_consumption: null, ev_range: fig(290, "km", "NEDC"),
});
const i3Rex = eng({
  id: "rex", fuel_type: "electric", hybrid_type: "EREV", power_kw: 125, displacement_cc: 647, timing_type: "chain",
  display_name: "i3 (94 Ah) with Range Extender, 125kW (Euro 6d-TEMP, 04/2018-09/2018)", emission_standard: "Euro6d-TEMP",
  maintenance: { ...EMPTY_ENGINE_MAINTENANCE, yearlyMaintenanceEurMin: 30, yearlyMaintenanceEurMax: 65 },
  electric_consumption: fig(11.5, "kWh/100 km", "NEDC", true), fuel_consumption: fig(0.6, "l/100 km", "NEDC", true),
  ev_range: fig(235, "km", "NEDC"),
});

describe("field selection per powertrain", () => {
  it("classifies EV / plug-in / hybrid / combustion", () => {
    expect(powertrainClass(i3Ev)).toBe("EV");
    expect(powertrainClass(i3Rex)).toBe("PLUGIN");
    expect(powertrainClass(eng({ id: "p", hybrid_type: "PHEV" }))).toBe("PLUGIN");
    expect(powertrainClass(eng({ id: "h", hybrid_type: "MHEV" }))).toBe("HYBRID");
    expect(powertrainClass(eng({ id: "i" }))).toBe("ICE");
  });
  it("a pure EV has no fuel, combustion-engine or timing rows", () => {
    const f = fieldsFor("EV");
    expect(f).toEqual(expect.arrayContaining(["battery", "evRange", "charging", "thermal", "electricConsumption", "yearlyMaintenance"]));
    expect(f).not.toContain("fuelConsumption");
    expect(f).not.toContain("combustionEngine");
    expect(f).not.toContain("timing");
  });
  it("a plug-in / range extender has both the electric and the combustion side", () => {
    expect(fieldsFor("PLUGIN")).toEqual(expect.arrayContaining(["battery", "evRange", "electricConsumption", "fuelConsumption", "combustionEngine", "timing"]));
  });
  it("hybrid and combustion engines have no battery / charging / electric rows", () => {
    for (const cls of ["HYBRID", "ICE"] as const) {
      const f = fieldsFor(cls);
      for (const ev of ["battery", "evRange", "charging", "thermal", "electricConsumption"] as const) expect(f).not.toContain(ev);
      expect(f).toEqual(expect.arrayContaining(["fuelConsumption", "combustionEngine", "timing"]));
    }
  });
  it("comparison rows are the union of the compared engines' fields", () => {
    expect(rowsFor([i3Ev, i3Rex])).toContain("timing");
    expect(rowsFor([i3Ev, i3Ev])).not.toContain("timing");
    expect(rowsFor([eng({ id: "a" }), eng({ id: "b" })])).not.toContain("battery");
  });
});

describe("figures with their cycle and method", () => {
  const cfg = (o: Record<string, unknown>) =>
    ({ energyConsumptionKwh100km: null, fuelConsumptionL100km: null, secondaryConsumptionL100km: null, evRangeKm: null, consumptionCycle: null, ...o }) as unknown as CatalogConfig;
  it("splits a range extender into weighted kWh + weighted petrol, and an unweighted range", () => {
    const f = engineFigures([cfg({ engine: { fuelType: "electric", hybridType: "EREV" }, energyConsumptionKwh100km: 11.5, secondaryConsumptionL100km: 0.6, evRangeKm: 235, consumptionCycle: "NEDC" })]);
    expect(f.electric).toEqual(fig(11.5, "kWh/100 km", "NEDC", true));
    expect(f.fuel).toEqual(fig(0.6, "l/100 km", "NEDC", true));
    expect(f.range).toEqual(fig(235, "km", "NEDC"));
  });
  it("a pure EV has no fuel figure; a petrol car has no electric figure or range", () => {
    expect(engineFigures([cfg({ engine: { fuelType: "electric", hybridType: null }, energyConsumptionKwh100km: 13.1, consumptionCycle: "NEDC" })]).fuel).toBeNull();
    const petrol = engineFigures([cfg({ engine: { fuelType: "petrol", hybridType: null }, fuelConsumptionL100km: 5.5, consumptionCycle: "WLTP" })]);
    expect(petrol.electric).toBeNull();
    expect(petrol.range).toBeNull();
    expect(petrol.fuel).toEqual(fig(5.5, "l/100 km", "WLTP"));
  });
  it("marks an engine whose configurations disagree on the cycle as mixed", () => {
    const f = engineFigures([
      cfg({ engine: { fuelType: "petrol", hybridType: null }, fuelConsumptionL100km: 5.5, consumptionCycle: "NEDC" }),
      cfg({ engine: { fuelType: "petrol", hybridType: null }, fuelConsumptionL100km: 6.4, consumptionCycle: "WLTP" }),
    ]);
    expect(f.fuel?.cycle).toBe("mixed");
  });
  it("labels every value with its cycle", () => {
    expect(figureLabel(fig(11.5, "kWh/100 km", "NEDC"))).toBe("11.5 kWh/100 km · NEDC");
    expect(figureLabel(fig(235, "km", "WLTP"))).toBe("235 km · WLTP");
  });
});

describe("like-for-like consumption", () => {
  it("a weighted plug-in figure is not comparable with a pure EV figure", () => {
    const r = figuresComparable([i3Ev.electric_consumption, i3Rex.electric_consumption]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Weighted/);
  });
  it("NEDC vs WLTP is not comparable", () => {
    expect(figuresComparable([fig(5, "l/100 km", "NEDC"), fig(6, "l/100 km", "WLTP")]).reason).toMatch(/cycles/);
  });
  it("same unit, cycle and method is comparable", () => {
    expect(figuresComparable([fig(5, "l/100 km", "WLTP"), fig(6, "l/100 km", "WLTP")]).ok).toBe(true);
  });
  it("Smart Choice never rewards the REx's lower weighted kWh against the EV", () => {
    const pick = pickSmartChoice([{ ...i3Ev, reliability_rating: 3 }, { ...i3Rex, reliability_rating: 3, maintenance: EMPTY_ENGINE_MAINTENANCE }]);
    expect(pick?.reasons ?? []).not.toContain("Lowest consumption");
  });
  it("rewards lower consumption when cycles match", () => {
    const pick = pickSmartChoice([
      eng({ id: "a", fuel_consumption: fig(4, "l/100 km", "WLTP") }),
      eng({ id: "b", fuel_consumption: fig(8, "l/100 km", "WLTP") }),
    ]);
    expect(pick?.engineId).toBe("a");
    expect(pick?.reasons).toContain("Lowest consumption");
  });
});

describe("yearly maintenance of a pure EV", () => {
  it("counts as no engine servicing (0), not unknown", () => {
    expect(midYearly(i3Ev)).toBe(0);
    expect(midYearly(eng({ id: "petrol-unknown" }))).toBeNull();
  });
  it("keeps the yearly comparison alive with an EV in it", () => {
    // Before: the EV's missing figure knocked the yearly term out and this was a coin-flip.
    const petrol = eng({ id: "petrol", reliability_rating: 3, maintenance: { ...EMPTY_ENGINE_MAINTENANCE, yearlyMaintenanceEurMin: 250, yearlyMaintenanceEurMax: 350 } });
    const pick = pickSmartChoice([{ ...i3Ev, reliability_rating: 3 }, petrol]);
    expect(pick?.engineId).toBe("ev");
    expect(pick?.reasons).toContain("Lowest yearly maintenance");
  });
});

describe("faults by production years", () => {
  it("drops a fault that ended before the phase began", () => {
    // i3 "Electric-motor mount wear", up to 2015, on the 2017-2022 Facelift.
    expect(faultAppliesToYears({ affectedYearFrom: null, affectedYearTo: 2015 }, 2017, 2022)).toBe(false);
    expect(faultAppliesToYears({ affectedYearFrom: null, affectedYearTo: 2015 }, 2013, 2017)).toBe(true);
  });
  it("drops a fault that starts after the phase ended, keeps open-ended ones", () => {
    expect(faultAppliesToYears({ affectedYearFrom: 2019, affectedYearTo: null }, 2013, 2017)).toBe(false);
    expect(faultAppliesToYears({ affectedYearFrom: null, affectedYearTo: null }, 2017, 2022)).toBe(true);
    expect(faultAppliesToYears({}, 2017, 2022)).toBe(true);
  });
});

describe("compareEngineTitle", () => {
  it("drops the internal code and the comma power, keeps the emission window short", () => {
    expect(compareEngineTitle({ ...i3Rex, code: "i3-94Ah-REx-Euro6dT" })).toBe("i3 94 Ah · Range Extender · Euro 6d-TEMP (04-09/2018)");
    expect(compareEngineTitle({ ...i3Ev, code: "i3-94Ah" })).toBe("i3 94 Ah");
    expect(compareEngineTitle({ display_name: "i3s (94 Ah) with Range Extender, 135kW (Euro 6c, 11/2017-03/2018)", power_kw: 135, hybrid_type: "EREV" }))
      .toBe("i3s 94 Ah · Range Extender · Euro 6c (11/2017-03/2018)");
  });
  it("keeps power that is part of the name, falls back to code + kW without a name", () => {
    expect(compareEngineTitle({ display_name: "1.0 TSI 85kW", power_kw: 85, hybrid_type: null })).toBe("1.0 TSI 85kW");
    expect(compareEngineTitle({ display_name: null, code: "CHZB", power_kw: 70, hybrid_type: null })).toBe("CHZB 70 kW");
  });
});
