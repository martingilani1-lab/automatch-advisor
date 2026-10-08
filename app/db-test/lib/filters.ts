// catalog_-schema filter logic for /db-test, parallel to app/lib/carFilters.ts (the legacy-
// schema version) rather than sharing it outright -- the two owning vocabularies genuinely
// differ (see GEARBOX_TYPES vs. that file's regex-based TRANSMISSION_TYPES below). What IS
// schema-agnostic (reads only CarData's own fields, e.g. c.categories/c.drivetrains/c.make)
// is re-exported from there unchanged instead of being duplicated.

import type { CarData } from "@/app/lib/carFields";
import {
  BODY_OPTIONS,
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  matchesFuelOption,
  matchesFuelGroup,
  matchesBodyGroup,
  matchesDrivetrainGroup,
  matchesBrandGroup,
  matchesBudget,
  facetCounts,
  type FilterOption,
} from "@/app/lib/carFilters";

export {
  BODY_OPTIONS,
  FUEL_OPTIONS,
  DRIVETRAIN_OPTIONS,
  matchesFuelOption,
  matchesFuelGroup,
  matchesBodyGroup,
  matchesDrivetrainGroup,
  matchesBrandGroup,
  matchesBudget,
  facetCounts,
};
export type { FilterOption };

// catalog_body_types.name (live values, checked against the DB) -> the same 10 tile slugs
// BODY_OPTIONS already defines. Unlike BODY_TILE_MAP (app/api/cars/route.ts), this keys off
// the catalog's own body-type names, which read as full phrases ("Sedan 4-door") rather than
// the legacy schema's single-word enum ("sedan") -- a different source vocabulary mapped to
// the same display tiles, not a copy of that map.
const CATALOG_BODY_TILE_MAP: Record<string, string> = {
  "Cabriolet 2-door": "coupe_convertible",
  "Coupe 2-door": "coupe_convertible",
  "Roadster 2-door": "coupe_convertible",
  "Estate": "combi",
  "Hatchback 3-door": "hatchback",
  "Hatchback 5-door": "hatchback",
  "Liftback": "liftback",
  "MPV 5-door": "minivan",
  "Sedan 4-door": "sedan",
  "SUV 5-door": "suv_crossover",
  "SUV Coupe 5-door": "suv_crossover",
};

export function resolveBodyTile(bodyTypeName: string): string | null {
  return CATALOG_BODY_TILE_MAP[bodyTypeName] ?? null;
}

// Gearbox -- transmission_units.family is already a clean, frozen vocabulary (confirmed
// against scripts/catalog-vocabularies.json), so unlike TRANSMISSION_TYPES in carFilters.ts
// (which regex-guesses a family off the legacy schema's free-text transmissions.specific_type)
// classification here is just reading the field directly. No "test" regex needed.
export type GearboxType = FilterOption;

export const GEARBOX_TYPES: GearboxType[] = [
  { slug: "manual", label: "Manual", consequence: "Fully mechanical, cheapest to repair." },
  { slug: "dct_dry", label: "Dual-clutch (dry)", consequence: "Fast shifts; struggles in heavy stop-and-go traffic." },
  { slug: "dct_wet", label: "Dual-clutch (wet)", consequence: "Fast shifts, more tolerant of traffic than a dry-clutch DCT." },
  { slug: "dct", label: "Dual-clutch (unspecified)", consequence: "Dual-clutch automatic; wet/dry clutch type not recorded." },
  { slug: "torque_converter", label: "Torque converter", consequence: "Smooth, tolerates traffic and towing." },
  { slug: "cvt", label: "CVT", consequence: "Stepless and efficient around town." },
  { slug: "amt", label: "Automated manual (AMT)", consequence: "Cheap to buy and run; jerkier shifts than a real automatic." },
  { slug: "single_speed", label: "Single-speed (EV)", consequence: "Nothing to shift or wear out." },
];

// car.transmissions holds each config's transmission_units.family slug directly (see the
// buildCar-equivalent in app/api/db-test/route.ts) -- classification is just deduping an
// already-correct list, not inferring one from free text.
export function classifyGearboxTypes(c: CarData): string[] {
  return [...new Set((c.transmissions || []).filter(Boolean))];
}

export function matchesGearboxGroup(c: CarData, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const types = classifyGearboxTypes(c);
  return selected.some((sel) => types.includes(sel));
}

export interface FilterState {
  fuel: string[];
  gearbox: string[];
  drivetrain: string[];
  brand: string[];
  priceMin: number | null;
  priceMax: number | null;
}

export type FilterGroup = "fuel" | "gearbox" | "drivetrain" | "brand" | "budget";

// Mirrors applyFilters in app/lib/carFilters.ts exactly, swapping only the gearbox group for
// the catalog-specific matcher above (no fuel<->gearbox compatibility patch -- that rule
// exists in the legacy version to fix a specific flattening leak in transmissions with no
// engine_id link; catalog_vehicle_configurations already links engine+gearbox+drivetrain per
// row, so the leak this patched doesn't apply the same way here).
export function applyFilters(cars: CarData[], f: FilterState, exclude?: FilterGroup): CarData[] {
  let list = cars;
  if (exclude !== "fuel") list = list.filter((c) => matchesFuelGroup(c, f.fuel));
  if (exclude !== "gearbox") list = list.filter((c) => matchesGearboxGroup(c, f.gearbox));
  if (exclude !== "drivetrain") list = list.filter((c) => matchesDrivetrainGroup(c, f.drivetrain));
  if (exclude !== "brand") list = list.filter((c) => matchesBrandGroup(c, f.brand));
  if (exclude !== "budget") list = list.filter((c) => matchesBudget(c, f.priceMin, f.priceMax));
  return list;
}
