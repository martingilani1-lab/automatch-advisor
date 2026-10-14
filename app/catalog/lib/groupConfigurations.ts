// Groups catalog_vehicle_configurations rows (body x drivetrain x engine x gearbox) by
// engine, and separately by gearbox, so the UI can show each real engine once and each real
// gearbox once -- instead of once per body/drivetrain combination, which is what iterating
// configs directly produces. Engines and gearboxes are deliberately SEPARATE top-level
// groupings here (not one nested under the other) -- engines/gearboxes/drivetrain are each
// their own section/tab; per-configuration numeric facts (consumption, performance, EV
// figures) are out of scope here, deferred to their own dedicated page. Shared by /catalog
// and /db-test, both of which already operate on the same CatalogConfig[] shape
// (PhaseBundle.configs).
import type { CatalogConfig, CatalogDrivetrain, CatalogEngine, CatalogGearbox } from "./types";

export interface EngineGroup {
  engine: CatalogEngine;
  bodyNames: string[];
  drivetrainLabels: string[];
  configs: CatalogConfig[];
}

// `engineNames` is which engine(s) this phase actually pairs this gearbox with, shown as
// context chips -- a gearbox is a real, standalone unit independent of any one engine (the
// same gearbox can sit behind several different engines).
export interface GearboxGroup {
  gearbox: CatalogGearbox;
  bodyNames: string[];
  drivetrainLabels: string[];
  // Distinct drivetrain systems actually paired with this gearbox (deduped by id) -- usually
  // 0 or 1, but a gearbox can legitimately pair with more than one (e.g. DQ381 as both FWD
  // and Haldex AWD on the same engine, confirmed live on Octavia NX).
  drivetrainSystems: CatalogDrivetrain[];
  engineNames: string[];
  configs: CatalogConfig[];
}

function distinct<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function drivetrainLabel(c: CatalogConfig): string {
  return c.drivetrain?.code ?? "FWD";
}

export function groupConfigurations(configs: CatalogConfig[]): EngineGroup[] {
  const byEngine = new Map<string, CatalogConfig[]>();
  for (const c of configs) {
    const list = byEngine.get(c.engine.id) ?? [];
    list.push(c);
    byEngine.set(c.engine.id, list);
  }

  return [...byEngine.values()].map((engineConfigs) => ({
    engine: engineConfigs[0].engine,
    bodyNames: distinct(engineConfigs.map((c) => c.bodyName)),
    drivetrainLabels: distinct(engineConfigs.map(drivetrainLabel)),
    configs: engineConfigs,
  }));
}

export function groupByGearbox(configs: CatalogConfig[]): GearboxGroup[] {
  const byGearbox = new Map<string, CatalogConfig[]>();
  for (const c of configs) {
    const list = byGearbox.get(c.gearbox.id) ?? [];
    list.push(c);
    byGearbox.set(c.gearbox.id, list);
  }

  return [...byGearbox.values()].map((gearboxConfigs) => {
    const drivetrainSystems = new Map<string, CatalogDrivetrain>();
    for (const c of gearboxConfigs) {
      if (c.drivetrain) drivetrainSystems.set(c.drivetrain.id, c.drivetrain);
    }
    return {
      gearbox: gearboxConfigs[0].gearbox,
      bodyNames: distinct(gearboxConfigs.map((c) => c.bodyName)),
      drivetrainLabels: distinct(gearboxConfigs.map(drivetrainLabel)),
      drivetrainSystems: [...drivetrainSystems.values()],
      engineNames: distinct(gearboxConfigs.map((c) => c.engine.code)),
      configs: gearboxConfigs,
    };
  });
}
