import type { CatalogConfig } from "./types";

// What a configuration stores its energy in -- a fuel tank, a traction battery, or both -- and
// how far it goes on a full tank / full charge (Martin, 2026-11-15). The Dimensions tab used to
// show "Fuel tank" for every car, which reads as missing data on an EV; the label and value now
// follow the powertrain:
//   petrol / diesel / LPG / CNG, HEV, MHEV  -> fuel tank only (an HEV/MHEV battery is a buffer,
//                                              not a range source, so it is not listed)
//   pure EV                                -> battery only
//   PHEV, range extender (EREV)            -> fuel tank AND battery
//
// RANGE is only ever a manufacturer figure or a plain division of two manufacturer figures --
// never a real-world estimate:
//   electric range = catalog_vehicle_configurations.ev_range_km (its own cycle, NEDC or WLTP).
//   fuel range     = tank (L) / combined consumption (l/100 km) x 100, labelled "calculated".
//                    Only for powertrains whose combined figure IS the fuel actually burned on a
//                    long drive. A PHEV's or range extender's official l/100 km is a weighted
//                    figure that assumes the battery does most of the work (the i3 REx's 0.6 l),
//                    so dividing the tank by it would claim 1 500 km on 9 L -- that is never
//                    computed; the range extender is named instead.
//   bi-fuel LPG / CNG: the tank column is the petrol tank, the LPG tank isn't stored, so the
//                    petrol range is computed from the secondary (petrol) figure and the LPG
//                    tank is mentioned, not invented.

export interface EnergyStorage {
  fuel: boolean;
  battery: boolean;
}

const COMBUSTION_FUELS = new Set(["petrol", "diesel", "lpg", "cng"]);

export function energyStorageOf(c: Pick<CatalogConfig, "engine">): EnergyStorage {
  const { fuelType, hybridType } = c.engine;
  const pluginOrRex = hybridType === "PHEV" || hybridType === "EREV";
  return {
    fuel: COMBUSTION_FUELS.has(fuelType) || hybridType === "EREV",
    battery: fuelType === "electric" || pluginOrRex,
  };
}

// The configuration's own tank wins; otherwise the body's tank -- but only for a powertrain that
// has a tank at all (a pure EV body value is meaningless even if one were ever filled in).
export function tankLitersOf(c: CatalogConfig, bodyTankLiters: number | null): number | null {
  if (!energyStorageOf(c).fuel) return null;
  return c.fuelTankCapacityLiters ?? bodyTankLiters;
}

export interface RangeInfo {
  // e.g. "170 km electric · NEDC" -- null when the powertrain has no battery or no figure.
  electric: string | null;
  // e.g. "≈ 880 km per tank (calculated, 50 L ÷ 5.7 l/100 km)" or "+ range extender, 9 L petrol".
  fuel: string | null;
}

const roundTo10 = (km: number) => Math.round(km / 10) * 10;

export function rangeInfoOf(c: CatalogConfig, bodyTankLiters: number | null): RangeInfo {
  const storage = energyStorageOf(c);
  const tank = tankLitersOf(c, bodyTankLiters);
  const cycle = c.consumptionCycle ? ` · ${c.consumptionCycle}` : "";

  const electric =
    storage.battery && c.evRangeKm != null
      ? `${c.evRangeKm} km ${c.engine.fuelType === "electric" && c.engine.hybridType == null ? "per charge" : "electric"}${cycle}`
      : null;

  let fuel: string | null = null;
  if (c.engine.hybridType === "EREV") {
    fuel = tank != null ? `+ range extender, ${tank} L petrol` : "+ range extender";
  } else if (c.engine.hybridType === "PHEV") {
    fuel = `then ${c.engine.fuelType} engine${tank != null ? `, ${tank} L tank` : ""}`;
  } else if (storage.fuel && tank != null) {
    const isBiFuel = c.secondaryFuelType === "petrol" && (c.engine.fuelType === "lpg" || c.engine.fuelType === "cng");
    const litres = isBiFuel ? c.secondaryConsumptionL100km : c.fuelConsumptionL100km;
    if (litres != null && litres > 0) {
      const km = roundTo10((tank / litres) * 100);
      fuel = isBiFuel
        ? `≈ ${km} km on petrol (calculated, ${tank} L ÷ ${litres} l/100 km) + ${c.engine.fuelType.toUpperCase()} tank`
        : `≈ ${km} km per tank (calculated, ${tank} L ÷ ${litres} l/100 km${cycle})`;
    }
  }
  return { electric, fuel };
}
