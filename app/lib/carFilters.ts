// Shared between app/api/cars/route.ts (server, still validates ?fuel=/
// ?transmission=/?drivetrain= for direct API/curl use) and the Prehľad
// (Path B) browse UI (client, facet filtering over the one bulk /api/cars
// fetch). One set of matching rules for both — a fix in one place can't
// drift from the other.

import { carPriceMin, carPriceMax, type CarData } from "./carFields";

export interface FilterOption {
  slug: string;
  label: string;
  badge?: string;
  consequence: string;
}

export const FUEL_OPTIONS: FilterOption[] = [
  { slug: "petrol", label: "Petrol", consequence: "Simple and proven, usually cheaper to buy. Loves being revved in the city." },
  { slug: "diesel", label: "Diesel", badge: "highway efficient", consequence: "Torque monster, sips fuel on the highway. Makes sense if you rack up the kilometers." },
  { slug: "hybrid", label: "Hybrid", consequence: "Electric in the city, petrol on the highway — best of both worlds." },
  { slug: "electric", label: "Electric", badge: "zero emissions", consequence: "Silent, instant torque, zero emissions. Needs somewhere to charge." },
  { slug: "phev", label: "Plug-in hybrid (PHEV)", consequence: "Runs electric if you plug in daily — a heavy, thirsty petrol car if you don't." },
];

export const DRIVETRAIN_OPTIONS: FilterOption[] = [
  { slug: "AWD", label: "AWD", badge: "best grip", consequence: "Power to all four wheels — confident in snow and mud. Costs more at the pump." },
  { slug: "FWD", label: "FWD", consequence: "Power to the front wheels. Cheaper, lighter, predictable in normal conditions." },
  { slug: "RWD", label: "RWD", badge: "balanced", consequence: "Power to the rear wheels — the classic driver's-car balance. Twitchier in snow." },
];

// Best-effort classification of free-text transmissions.specific_type strings —
// no transmission_units reference table exists yet. Order matters: each car's
// string is tested against these in order and bucketed into the first match,
// with "torque_converter" as the catch-all for conventional stepped automatics
// that don't otherwise identify themselves (Aisin 6AT, 9G-TRONIC, Jatco 7AT...).
export interface TransmissionType extends FilterOption {
  test: RegExp;
}

export const TRANSMISSION_TYPES: TransmissionType[] = [
  { slug: "cvt", label: "CVT", consequence: "Smooth and efficient around town. Some feel a rubber-band sensation under hard acceleration.", test: /\bcvt\b|multitronic|lineartronic/i },
  { slug: "dct", label: "Dual-clutch (DSG/DCT)", badge: "fast shifts", consequence: "Fast, sporty gear changes. Dry-clutch versions struggle in stop-and-go traffic.", test: /dsg|dct|dq\d{3}|dual.?clutch|powershift|s-tronic|pdk|\bedc\b/i },
  { slug: "manual", label: "Manual", badge: "cheapest to fix", consequence: "Full control, cheapest to repair — clutch wear is on you, not the dealer.", test: /\bmanual\b/i },
  { slug: "amt", label: "Automated manual (AMT)", consequence: "Cheap to buy and run. Shifts are noticeably jerkier than a real automatic.", test: /\bamt\b|easytronic|dualogic/i },
  { slug: "single_speed", label: "Single-speed (EV)", badge: "no gears", consequence: "Nothing to shift or wear out — just instant, seamless acceleration.", test: /single.?speed/i },
  { slug: "torque_converter", label: "Torque converter", badge: "most durable", consequence: "Smooth, tolerates traffic and towing. Needs its oil changed.", test: /./ },
];

export function classifyTransmissionTypes(c: CarData): string[] {
  const strings = (c.transmissions || []).filter(Boolean);
  const slugs = new Set<string>();
  for (const s of strings) {
    const hit = TRANSMISSION_TYPES.find((t) => t.slug !== "torque_converter" && t.test.test(s));
    slugs.add(hit ? hit.slug : "torque_converter");
  }
  return [...slugs];
}

export function matchesFuelOption(fuelEntry: string, optionSlug: string): boolean {
  if (optionSlug === "hybrid") return fuelEntry === "hybrid" || fuelEntry === "phev";
  return fuelEntry === optionSlug;
}

// FUEL <-> TRANSMISSION compatibility rule (audit: 2026-07-31 score-audit
// session, "transmission/fuel facet leak"). c.transmissions is every gearbox
// on the vehicle, flattened with no link to which engine each one belongs to
// (see the flat vTrans.map() in app/api/cars/route.ts) — a multi-powertrain
// model (e.g. Hyundai Kona, Peugeot 208/2008 II) can match fuel=electric AND
// transmission=manual/dct/torque_converter even though those gearboxes only
// ever paired with the petrol/diesel variant. Audited all 334 cars: the leak
// is structural (electric variant + ICE variant on the same model row) and
// is NOT confined to manual — it affects every non-single_speed family
// equally. Deliberately NOT fixed via transmissions.engine_id (a single FK
// can't model the real many-to-many engine<->gearbox relationship, and this
// rule doesn't need it) — fixed instead as a directional compatibility rule:
//   - single_speed is EV-only tech (0 exceptions found across all 334 cars,
//     including all 51 pure-electric models) — selecting it restricts the
//     fuel side to electric only.
//   - electric, selected ALONE (no other fuel), restricts the transmission
//     side to single_speed only — a car's electric variant's gearbox is
//     always single_speed in this data.
// hybrid/phev/petrol/diesel are deliberately left unconstrained — the audit
// found zero real manual-mild-hybrids in the data (every manual+hybrid/PHEV
// car is a multi-powertrain model whose manual belongs to its petrol side,
// which is exactly the legitimate case this must NOT hide) and there's no
// hidden case that requires touching them.
function isElectricOnlyFuelSelection(selectedFuels: string[]): boolean {
  return selectedFuels.length === 1 && selectedFuels[0] === "electric";
}
function isSingleSpeedSelected(selectedTransmissions: string[]): boolean {
  return selectedTransmissions.includes("single_speed");
}

export function matchesFuelGroup(c: CarData, selected: string[], selectedTransmissions: string[] = []): boolean {
  if (selected.length === 0) return true;
  const fuels = isSingleSpeedSelected(selectedTransmissions)
    ? (c.fuel || []).filter((f) => f === "electric")
    : (c.fuel || []);
  return fuels.some((entry) => selected.some((sel) => matchesFuelOption(entry, sel)));
}

export function matchesTransmissionGroup(c: CarData, selected: string[], selectedFuels: string[] = []): boolean {
  if (selected.length === 0) return true;
  const types = classifyTransmissionTypes(c);
  const compatibleTypes = isElectricOnlyFuelSelection(selectedFuels)
    ? types.filter((t) => t === "single_speed")
    : types;
  return selected.some((sel) => compatibleTypes.includes(sel));
}

export function matchesDrivetrainGroup(c: CarData, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return (c.drivetrains || []).some((d) => selected.includes(d));
}

export function matchesBrandGroup(c: CarData, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const make = (c.make || "").toLowerCase();
  return selected.some((s) => s.toLowerCase() === make);
}

export function matchesBudget(c: CarData, priceMin: number | null, priceMax: number | null): boolean {
  if (priceMin != null && carPriceMax(c) < priceMin) return false;
  if (priceMax != null && carPriceMin(c) > priceMax) return false;
  return true;
}

export interface FilterState {
  fuel: string[];
  transmission: string[];
  drivetrain: string[];
  brand: string[];
  priceMin: number | null;
  priceMax: number | null;
}

export type FilterGroup = "fuel" | "transmission" | "drivetrain" | "brand" | "budget";

// Applies every group's filter except `exclude` — used to compute facet
// counts: the count for an option in group X must be computed against the
// current filter set with group X's own selections excluded, or the numbers
// look wrong to anyone who checks them.
export function applyFilters(cars: CarData[], f: FilterState, exclude?: FilterGroup): CarData[] {
  let list = cars;
  if (exclude !== "fuel") list = list.filter((c) => matchesFuelGroup(c, f.fuel, f.transmission));
  if (exclude !== "transmission") list = list.filter((c) => matchesTransmissionGroup(c, f.transmission, f.fuel));
  if (exclude !== "drivetrain") list = list.filter((c) => matchesDrivetrainGroup(c, f.drivetrain));
  if (exclude !== "brand") list = list.filter((c) => matchesBrandGroup(c, f.brand));
  if (exclude !== "budget") list = list.filter((c) => matchesBudget(c, f.priceMin, f.priceMax));
  return list;
}

export function facetCounts(
  base: CarData[],
  options: { slug: string }[],
  matches: (c: CarData, selected: string[]) => boolean
): Record<string, number> {
  return Object.fromEntries(options.map((o) => [o.slug, base.filter((c) => matches(c, [o.slug])).length]));
}
