// The Costs tab's configuration options, sorted the same way as the Configurations tab (fuel
// group, then smallest engine first) -- shared by the per-car calculator (TcoCalculator.tsx)
// and the cross-model cost comparison (CostCompare.tsx) so both list identical options under
// identical keys. Lives here rather than in tco.ts because it needs the db-test-only label/sort
// helpers from ConfigRows.tsx; tco.ts stays free of component imports.
import type { CatalogConfig } from "@/app/catalog/lib/types";
import { tcoOptions, type TcoOption } from "./tco";
import { FUEL_SORT_ORDER, dbTestEngineLabel } from "../ConfigRows";

// One option per real (engine, gearbox, drivetrain) combination -- body type doesn't change
// running costs. Must match the grouping key tcoOptions() uses.
export function tcoKeyOf(c: CatalogConfig): string {
  return `${c.engine.id}|${c.gearbox.id}|${c.drivetrain?.id ?? "2wd"}`;
}

export function buildTcoOptions(configs: CatalogConfig[], priceMin: number, priceMax: number): TcoOption[] {
  const byKey = new Map(configs.map((c) => [tcoKeyOf(c), c]));
  const rank = (k: string) => {
    const e = byKey.get(k)!.engine;
    return [FUEL_SORT_ORDER[e.fuelType.toLowerCase()] ?? 99, e.displacementCc ?? Infinity, e.powerKw] as const;
  };
  return tcoOptions(configs, priceMin, priceMax, dbTestEngineLabel).sort((a, b) => {
    const [fa, da, pa] = rank(a.key);
    const [fb, db, pb] = rank(b.key);
    return fa - fb || da - db || pa - pb || a.label.localeCompare(b.label);
  });
}
