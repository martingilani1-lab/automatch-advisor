import { describe, expect, it } from "vitest";

import { groupByGearbox, groupConfigurations } from "@/app/catalog/lib/groupConfigurations";
import type { CatalogConfig, CatalogEngine, CatalogGearbox } from "@/app/catalog/lib/types";
import { EMPTY_ENGINE_MAINTENANCE } from "@/app/catalog/lib/engineMaintenance";

function makeEngine(id: string, code: string): CatalogEngine {
  return {
    id, code, displayName: null, displacementCc: null, powerKw: 110, fuelType: "petrol",
    torqueNm: null, cylinders: null, emissionStandard: null, timingType: null,
    engineOilCapacityLiters: null, timingReplacementKm: null, hybridType: null,
    reliabilityRating: null, pros: [], cons: [], maintenance: EMPTY_ENGINE_MAINTENANCE,
  };
}

function makeGearbox(id: string, code: string): CatalogGearbox {
  return {
    id, code, family: "dct_dry", maker: null, speeds: 7, reliabilityNote: null,
    maintenanceNote: null, reliabilityRating: null, pros: [], cons: [], phaseNote: null,
  };
}

function makeConfig(opts: {
  id: string; bodyName: string; engine: CatalogEngine; gearbox: CatalogGearbox;
}): CatalogConfig {
  return {
    id: opts.id, bodyTypeId: opts.bodyName, bodyName: opts.bodyName,
    engine: opts.engine, gearbox: opts.gearbox, drivetrain: null,
    acceleration0To100: null, topSpeedKmh: null, fuelConsumptionCombined: null,
    fuelConsumptionL100km: null, energyConsumptionKwh100km: null,
    co2EmissionsGKm: null, batteryCapacityNetKwh: null, evRangeWltpKm: null,
    maxChargingKwDc: null, tireSizes: [],
  };
}

// Mirrors the live SEAT León KL Facelift configuration set (confirmed via Supabase): DADA@110
// pairs with both VW MQ281 and VW DQ200, each on Hatchback 5-door and Estate -- 4 raw
// configuration rows for one real engine. DFFA@110 is included too (also real on this car,
// sharing MQ281 with DADA) to confirm engines and gearboxes each collapse correctly on their
// own, independent of the other.
const dada = makeEngine("engine-dada", "DADA");
const dffa = makeEngine("engine-dffa", "DFFA");
const mq281 = makeGearbox("unit-mq281", "VW MQ281");
const dq200 = makeGearbox("unit-dq200", "VW DQ200");
const dq381 = makeGearbox("unit-dq381", "VW DQ381");

const configs: CatalogConfig[] = [
  makeConfig({ id: "c1", bodyName: "Hatchback 5-door", engine: dada, gearbox: mq281 }),
  makeConfig({ id: "c2", bodyName: "Estate", engine: dada, gearbox: mq281 }),
  makeConfig({ id: "c3", bodyName: "Hatchback 5-door", engine: dada, gearbox: dq200 }),
  makeConfig({ id: "c4", bodyName: "Estate", engine: dada, gearbox: dq200 }),
  makeConfig({ id: "c5", bodyName: "Hatchback 5-door", engine: dffa, gearbox: mq281 }),
  makeConfig({ id: "c6", bodyName: "Estate", engine: dffa, gearbox: mq281 }),
  makeConfig({ id: "c7", bodyName: "Hatchback 5-door", engine: dffa, gearbox: dq381 }),
  makeConfig({ id: "c8", bodyName: "Estate", engine: dffa, gearbox: dq381 }),
];

describe("groupConfigurations", () => {
  it("collapses 8 raw configs to exactly 2 engine widgets (DADA, DFFA)", () => {
    const groups = groupConfigurations(configs);
    expect(groups).toHaveLength(2);

    const dadaGroup = groups.find((g) => g.engine.code === "DADA");
    expect(dadaGroup).toBeDefined();
    // 4 raw configs (2 gearboxes x 2 bodies) for DADA...
    expect(dadaGroup!.configs).toHaveLength(4);
    // ...collapsed to 2 distinct body chips, not 4 repeated entries.
    expect(dadaGroup!.bodyNames).toHaveLength(2);
    expect(dadaGroup!.bodyNames.sort()).toEqual(["Estate", "Hatchback 5-door"]);
  });

  it("returns an empty list for an empty configuration set", () => {
    expect(groupConfigurations([])).toEqual([]);
    expect(groupByGearbox([])).toEqual([]);
  });
});

describe("groupByGearbox", () => {
  it("collapses 8 raw configs to exactly 3 distinct gearbox widgets (MQ281, DQ200, DQ381)", () => {
    const groups = groupByGearbox(configs);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.gearbox.code).sort()).toEqual(["VW DQ200", "VW DQ381", "VW MQ281"]);
  });

  it("MQ281 is shared across both DADA and DFFA, and reports both as engineNames", () => {
    const groups = groupByGearbox(configs);
    const mq281Group = groups.find((g) => g.gearbox.code === "VW MQ281");
    expect(mq281Group).toBeDefined();
    // 4 raw configs (2 engines x 2 bodies) for MQ281, not split across engines.
    expect(mq281Group!.configs).toHaveLength(4);
    expect(mq281Group!.engineNames.sort()).toEqual(["DADA", "DFFA"]);
    expect(mq281Group!.bodyNames.sort()).toEqual(["Estate", "Hatchback 5-door"]);
  });

  it("DQ200 and DQ381 are each engine-exclusive, reporting only their one engine", () => {
    const groups = groupByGearbox(configs);
    const dq200Group = groups.find((g) => g.gearbox.code === "VW DQ200");
    const dq381Group = groups.find((g) => g.gearbox.code === "VW DQ381");
    expect(dq200Group!.engineNames).toEqual(["DADA"]);
    expect(dq381Group!.engineNames).toEqual(["DFFA"]);
  });
});
