// Pure formatting/sorting helpers for one catalog_vehicle_configurations row -- shared by
// /catalog's ConfigurationsTable.tsx (Tailwind-styled) and /db-test's own native-styled
// Configurations rows (CarDetail.tsx), so both pages' very different-looking presentations
// agree on the exact same text, not two copies that could drift.
import type { CatalogConfig } from "./types";
import { gearboxHeaderLabel } from "./gearboxLabel";

// Same priority as the fill-rate check this was built from (confirmed live:
// fuel_consumption_combined/battery_capacity_net_kwh/ev_range_wltp_km (now ev_range_km) were 0% filled across
// all 1550 catalog_vehicle_configurations rows -- dead columns from an earlier, unfinished
// pass -- while fuel_consumption_l100km is 100% filled and energy_consumption_kwh100km
// covers the handful of PHEV rows): a pure EV shows its energy figure even if some stray
// l100km value exists; everything else prefers l100km, falling back to energy, then "–".
export function consumptionLabel(c: CatalogConfig): string {
  if (c.engine.fuelType === "electric") {
    return c.energyConsumptionKwh100km != null ? `${c.energyConsumptionKwh100km} kWh/100 km` : "–";
  }
  if (c.fuelConsumptionL100km != null) return `${c.fuelConsumptionL100km} l/100 km`;
  if (c.energyConsumptionKwh100km != null) return `${c.energyConsumptionKwh100km} kWh/100 km`;
  return "–";
}

// catalog_vehicle_configurations.driven_axle (20261104200000) -> the short label buyers know.
// A config with no AWD system used to be shown as "FWD" unconditionally -- wrong for a RWD BMW.
// null (axle not recorded, or the migration not run yet) is shown as "2WD": true for every
// config without an AWD system, without claiming which axle.
export function axleLabel(axle: string | null): string {
  if (axle === "front") return "FWD";
  if (axle === "rear") return "RWD";
  if (axle === "all") return "AWD";
  return "2WD";
}

// "6.4 l/100 km · NEDC" -- the cycle next to the figure, so an NEDC car and a WLTP car are
// never read as directly comparable (WLTP runs ~15-25 % higher for the same car). Bi-fuel
// cars add the second fuel: "9.2 l/100 km LPG · 7.2 petrol · NEDC".
export function consumptionDetailLabel(c: CatalogConfig): string {
  // A pure EV's useful figure is often the range, not the kWh/100 km (BMW i3 120 Ah: WLTP range
  // published, WLTP consumption not) -- so the range is shown next to the energy figure, or on its
  // own when that's all there is, instead of the row reading "–" for a car with known data.
  if (c.engine.fuelType === "electric") {
    const parts: string[] = [];
    if (c.energyConsumptionKwh100km != null) parts.push(`${c.energyConsumptionKwh100km} kWh/100 km`);
    if (c.evRangeKm != null) parts.push(`${c.evRangeKm} km range`);
    if (parts.length === 0) return "–";
    // ev_range_km follows the row's consumption_cycle exactly like the consumption figures
    // (20261109223000, Martin 2026-11-09): "190 km range · NEDC" for a 2013 i3, "285 km range ·
    // WLTP" for a 2019 one -- one cycle per row, never two mixed.
    if (c.consumptionCycle) parts.push(c.consumptionCycle);
    return parts.join(" · ");
  }
  const base = consumptionLabel(c);
  if (base === "–") return base;
  const parts = [c.secondaryFuelType ? `${base} ${c.engine.fuelType.toUpperCase()}` : base];
  if (c.secondaryFuelType && c.secondaryConsumptionL100km != null) {
    parts.push(`${c.secondaryConsumptionL100km} ${c.secondaryFuelType}`);
  }
  if (c.consumptionCycle) parts.push(c.consumptionCycle);
  return parts.join(" · ");
}

// transmission_units.code is near-universally "<Maker> <Model>" ("VW DQ381", "ZF 6HP",
// "generic:7-speed dct") -- strip the first whitespace- or colon-separated token so the
// Configurations rows show just the unit itself ("DQ381"), the maker already being implicit
// in which car this is. A code with no separator (e.g. the orphan "DQ400e") is returned
// unchanged -- nothing to strip.
function stripMakerPrefix(code: string): string {
  const colonIdx = code.indexOf(":");
  const spaceIdx = code.indexOf(" ");
  if (colonIdx !== -1 && (spaceIdx === -1 || colonIdx < spaceIdx)) return code.slice(colonIdx + 1);
  if (spaceIdx !== -1) return code.slice(spaceIdx + 1);
  return code;
}

export function engineLabel(c: CatalogConfig): string {
  const hp = Math.round(c.engine.powerKw * 1.341);
  const name = c.engine.displayName ?? c.engine.code;
  return `${name} ${c.engine.powerKw} kW (${hp} hp)`;
}

export function transmissionLabel(c: CatalogConfig): string {
  return gearboxHeaderLabel(stripMakerPrefix(c.gearbox.code), c.gearbox.speeds, c.gearbox.family);
}

// drivetrain_systems.generation is already a human-readable standalone label for nearly
// every live row ("quattro ultra", "HTRAC", "Torsen permanent", "Symmetrical AWD") -- shown
// as-is rather than synthesized into a combined "<brand> <generation>" string no live field
// actually provides (NULL over invention, CLAUDE.md rule 7). Falls back to `code` if a
// future row has no generation filled in yet; "FWD" for configs with no drivetrain system at
// all (the vast majority -- front-wheel-drive needs no reference-table row).
//
// Haldex is the one family where `generation` alone ("Gen 1", "Gen 5", ...) is just a bare
// version number -- every other system's generation string already names itself. Prefixing
// "Haldex" here (rather than reusing the row's own `maker`, which is "BorgWarner (Haldex)" on
// some rows and "Haldex Traction" on others depending on which migration added it) keeps
// every Haldex generation reading the same way everywhere this label is shown.
export function drivetrainLabel(c: CatalogConfig): string {
  if (!c.drivetrain) return axleLabel(c.drivenAxle);
  if (c.drivetrain.type === "haldex" && c.drivetrain.generation) return `Haldex ${c.drivetrain.generation}`;
  return c.drivetrain.generation ?? c.drivetrain.code;
}

const FUEL_SORT_ORDER: Record<string, number> = {
  petrol: 0, lpg: 1, diesel: 2, hybrid: 3, phev: 4, electric: 5,
};

export function sortConfigs(configs: CatalogConfig[]): CatalogConfig[] {
  return [...configs].sort((a, b) => {
    const fuelDiff = (FUEL_SORT_ORDER[a.engine.fuelType] ?? 99) - (FUEL_SORT_ORDER[b.engine.fuelType] ?? 99);
    if (fuelDiff !== 0) return fuelDiff;
    const powerDiff = a.engine.powerKw - b.engine.powerKw;
    if (powerDiff !== 0) return powerDiff;
    const bodyDiff = a.bodyName.localeCompare(b.bodyName);
    if (bodyDiff !== 0) return bodyDiff;
    return transmissionLabel(a).localeCompare(transmissionLabel(b));
  });
}
