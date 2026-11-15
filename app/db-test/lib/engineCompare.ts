// Pure helpers behind the Engines tab's side-by-side comparison (EngineCompare.tsx): the
// "use case" verdict tag, the top "expensive traps" faults, and the Smart Choice pick.
// Everything here is DERIVED from data already on DetailEngine -- nothing is authored per
// engine, so the rules are spelled out below and covered by tests/engineCompare.test.ts.
import type { DetailEngine, DetailFaultItem, EngineFigure } from "../types";
import type { CatalogConfig } from "@/app/catalog/lib/types";

export const MAX_COMPARE = 3;
export const MIN_COMPARE = 2;

// ---- Powertrain class --------------------------------------------------------------------
// Which comparison fields apply (Martin's field table, 2026-11-15):
//   EV      fuel_type 'electric', no hybrid_type
//   PLUGIN  hybrid_type 'EREV' (range extender) or 'PHEV'
//   HYBRID  hybrid_type 'HEV' or 'MHEV'
//   ICE     everything else (petrol / diesel / LPG / CNG)
export type PowertrainClass = "EV" | "PLUGIN" | "HYBRID" | "ICE";

export function powertrainClass(e: Pick<DetailEngine, "fuel_type" | "hybrid_type">): PowertrainClass {
  if (e.hybrid_type === "EREV" || e.hybrid_type === "PHEV") return "PLUGIN";
  if (e.hybrid_type === "HEV" || e.hybrid_type === "MHEV") return "HYBRID";
  if ((e.fuel_type || "").toLowerCase() === "electric") return "EV";
  return "ICE";
}

// The comparison's rows, by class. A row that can't apply is left out entirely -- never shown
// as "Unknown" / "No data" (a pure EV has no timing belt; that's not missing data).
export type CompareField =
  | "powerTorque"
  | "battery"
  | "evRange"
  | "charging"
  | "thermal"
  | "electricConsumption"
  | "fuelConsumption"
  | "combustionEngine"
  | "timing"
  | "yearlyMaintenance"
  | "reliability"
  | "traps";

const FIELDS_BY_CLASS: Record<PowertrainClass, CompareField[]> = {
  EV: ["powerTorque", "battery", "evRange", "charging", "thermal", "electricConsumption", "yearlyMaintenance", "reliability", "traps"],
  PLUGIN: ["powerTorque", "battery", "evRange", "charging", "thermal", "electricConsumption", "fuelConsumption", "combustionEngine", "timing", "yearlyMaintenance", "reliability", "traps"],
  HYBRID: ["powerTorque", "fuelConsumption", "combustionEngine", "timing", "yearlyMaintenance", "reliability", "traps"],
  ICE: ["powerTorque", "fuelConsumption", "combustionEngine", "timing", "yearlyMaintenance", "reliability", "traps"],
};

export function fieldsFor(cls: PowertrainClass): CompareField[] {
  return FIELDS_BY_CLASS[cls];
}

// The comparison shows a row when ANY compared engine has it, in the canonical order above;
// a cell whose own engine doesn't have the field shows "Not applicable" (different from "No
// data", which means the field applies but nothing is recorded).
const FIELD_ORDER: CompareField[] = FIELDS_BY_CLASS.PLUGIN;
export function rowsFor(engines: Pick<DetailEngine, "fuel_type" | "hybrid_type">[]): CompareField[] {
  const present = new Set(engines.flatMap((e) => fieldsFor(powertrainClass(e))));
  return FIELD_ORDER.filter((f) => present.has(f));
}

// ---- Per-source figures (built in the API route from the engine's configurations) -------
// EREV / PHEV figures are the WEIGHTED plug-in test result: both the kWh and the l/100 km assume
// the battery does most of the driving (BMW i3 REx: 11.5 kWh + 0.6 l, NEDC), so neither can sit
// next to a pure EV's or a petrol car's figure as if it were lower. The range figure is the
// published electric range and is not weighted.
function figureOf(values: { v: number | null; cycle: string | null }[], unit: EngineFigure["unit"], weighted: boolean): EngineFigure | null {
  const withValue = values.filter((x): x is { v: number; cycle: string | null } => x.v != null && Number(x.v) > 0);
  if (!withValue.length) return null;
  const nums = withValue.map((x) => Number(x.v));
  const cycles = new Set(withValue.map((x) => x.cycle).filter((c): c is string => !!c));
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    unit,
    cycle: cycles.size === 0 ? null : cycles.size === 1 ? [...cycles][0] : "mixed",
    weighted,
  };
}

export function engineFigures(
  configs: Pick<CatalogConfig, "engine" | "energyConsumptionKwh100km" | "fuelConsumptionL100km" | "secondaryConsumptionL100km" | "evRangeKm" | "consumptionCycle">[],
): { electric: EngineFigure | null; fuel: EngineFigure | null; range: EngineFigure | null } {
  if (!configs.length) return { electric: null, fuel: null, range: null };
  const engine = configs[0].engine;
  const cls = powertrainClass({ fuel_type: engine.fuelType, hybrid_type: engine.hybridType });
  const plugin = cls === "PLUGIN";
  const hasBattery = cls === "EV" || plugin;
  const electric = hasBattery
    ? figureOf(configs.map((c) => ({ v: c.energyConsumptionKwh100km, cycle: c.consumptionCycle })), "kWh/100 km", plugin)
    : null;
  // EREV: the petrol figure lives in secondary_* (fuel_type stays 'electric'); a PHEV's fuel_type
  // is the combustion fuel, so its figure is the fuel column (secondary as a fallback).
  const fuel = cls === "EV"
    ? null
    : figureOf(
        configs.map((c) => ({ v: plugin ? (c.fuelConsumptionL100km ?? c.secondaryConsumptionL100km) : c.fuelConsumptionL100km, cycle: c.consumptionCycle })),
        "l/100 km",
        plugin,
      );
  const range = hasBattery ? figureOf(configs.map((c) => ({ v: c.evRangeKm, cycle: c.consumptionCycle })), "km", false) : null;
  return { electric, fuel, range };
}

// "11.5 kWh/100 km · NEDC" / "4.8–6.1 l/100 km · WLTP"; null when not recorded.
export function figureLabel(f: EngineFigure | null | undefined): string | null {
  if (!f) return null;
  const fmt = (n: number) => (f.unit === "km" ? String(Math.round(n)) : n.toFixed(1));
  const value = f.min === f.max ? `${fmt(f.min)} ${f.unit}` : `${fmt(f.min)}–${fmt(f.max)} ${f.unit}`;
  const cycle = f.cycle === "mixed" ? "mixed cycles" : f.cycle;
  return cycle ? `${value} · ${cycle}` : value;
}

export const WEIGHTED_NOTE =
  "Official plug-in / range-extender test result: it assumes the battery does most of the driving, so it is lower than what the car uses on electricity alone or on petrol alone. Not comparable with a pure EV's or a petrol car's figure.";

// Same unit, same known (non-mixed) cycle and same method on every engine -- only then may two
// figures be compared or the lower one rewarded. Returns why not, for the on-screen note.
export function figuresComparable(figs: (EngineFigure | null | undefined)[]): { ok: boolean; reason: string | null } {
  if (figs.some((f) => !f)) return { ok: false, reason: null };
  const fs = figs as EngineFigure[];
  if (new Set(fs.map((f) => f.unit)).size > 1) return { ok: false, reason: "Different units" };
  const cycles = new Set(fs.map((f) => f.cycle));
  if (cycles.has(null) || cycles.has("mixed") || cycles.size > 1) {
    const named = [...cycles].map((c) => c ?? "cycle not recorded").join(" vs ");
    return { ok: false, reason: cycles.size > 1 ? `Different test cycles (${named}) -- not directly comparable` : "Test cycle not recorded -- not directly comparable" };
  }
  if (new Set(fs.map((f) => f.weighted)).size > 1) {
    return { ok: false, reason: "Weighted plug-in test vs direct figure -- not directly comparable" };
  }
  return { ok: true, reason: null };
}

// ---- Faults by production years ---------------------------------------------------------
// A fault applies to this phase only if its build-year window overlaps the phase's years
// (both inclusive, null = open end). The i3 "Electric-motor mount wear" (up to 2015) must not
// show on the 2017+ Facelift.
export function faultAppliesToYears(
  f: Pick<DetailFaultItem, "affectedYearFrom" | "affectedYearTo">,
  phaseFrom: number | null,
  phaseTo: number | null,
): boolean {
  const from = f.affectedYearFrom ?? null;
  const to = f.affectedYearTo ?? null;
  if (to != null && phaseFrom != null && to < phaseFrom) return false;
  if (from != null && phaseTo != null && from > phaseTo) return false;
  return true;
}

// ---- Title --------------------------------------------------------------------------------
// One code-free style for every engine on the comparison card (Martin, 2026-11-15), e.g.
//   "i3 (94 Ah) with Range Extender, 125kW (Euro 6d-TEMP, 04/2018-09/2018)"
//     -> "i3 94 Ah · Range Extender · Euro 6d-TEMP (04-09/2018)"
//   "i3 94 Ah, 125kW" -> "i3 94 Ah"
//   "1.0 TSI 85kW"    -> "1.0 TSI 85kW" (power that is part of the name stays)
// Display-only: catalog_engines.display_name itself is never changed. Falls back to
// "<code> <kW> kW" only when there is no display name at all.
export function compareEngineTitle(
  e: Pick<DetailEngine, "power_kw" | "hybrid_type"> & { display_name?: string | null; code?: string | null },
): string {
  const raw = e.display_name?.trim();
  if (!raw) return `${e.code ?? "Engine"} ${e.power_kw} kW`;
  let name = raw;
  let emission: string | null = null;
  const em = name.match(/\(\s*(Euro\s*[0-9][^,)]*?)\s*(?:,\s*([^)]*))?\)/i);
  if (em) {
    emission = em[1].trim() + (em[2] ? ` (${shortenDateRange(em[2].trim())})` : "");
    name = name.replace(em[0], "");
  }
  const rex = /\s+with\s+range\s+extender/i.test(name) || e.hybrid_type === "EREV";
  name = name.replace(/\s+with\s+range\s+extender/i, "");
  name = name.replace(/,\s*\d+\s*kW\b/i, "");
  name = name.replace(/\((\d+(?:\.\d+)?\s*Ah)\)/i, "$1");
  name = name.replace(/\s{2,}/g, " ").trim();
  return [name, rex ? "Range Extender" : null, emission].filter(Boolean).join(" · ");
}

// "04/2018-09/2018" -> "04-09/2018"; different years stay "11/2017-03/2018".
function shortenDateRange(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{4})$/);
  if (!m) return s;
  return m[2] === m[4] ? `${m[1]}-${m[3]}/${m[2]}` : `${m[1]}/${m[2]}-${m[3]}/${m[4]}`;
}

// ---- Verdict tag ------------------------------------------------------------------------
// A short "ideal use case" label from fuel type + power alone. Thresholds are deliberately
// coarse (they describe the engine's character, not a promise): roughly, ≤60 kW petrols are
// the 1.0/1.2 three-cylinders that feel at home in town, ≤85 kW the everyday 1.0-1.5 TSI
// range, ≤125 kW the 1.4-2.0 TSI that cruise effortlessly, and above that the hot/performance
// units. Diesels split at 110 kW (the 2.0 TDI 110/140/176 kW units with towing headroom vs the
// 1.6/2.0 TDI commuters). Electrified engines get their own wording since the power figure says
// little about how they're best used.
export function engineVerdict(e: Pick<DetailEngine, "fuel_type" | "power_kw" | "hybrid_type" | "is_ev">): string {
  const fuel = (e.fuel_type || "").toLowerCase();
  if (e.hybrid_type === "EREV") return "Electric, petrol back-up for long trips";
  if (fuel === "electric") return "Electric commuting";
  if (e.hybrid_type === "PHEV") return "Plug-in: short daily trips";
  if (fuel === "diesel") return e.power_kw >= 110 ? "Long-distance & towing" : "High-mileage commuter";
  if (fuel === "lpg" || fuel === "cng") return "Low running costs";
  if (e.power_kw <= 60) return "City commuter";
  if (e.power_kw <= 85) return "Everyday all-rounder";
  if (e.power_kw <= 125) return "Motorway cruiser";
  return "Dynamic driving";
}

// ---- Reliability colour -----------------------------------------------------------------
// The comparison's strict semantic palette: Good = emerald, Average = orange, Poor = red.
// The catalog's 5-word scale folds onto those three (Excellent/Good -> good, Below Average/
// Poor -> poor). null rating -> "unknown" (neutral zinc, never a guessed colour).
export type RelTone = "good" | "average" | "poor" | "unknown";
export function reliabilityTone(rating: number | null): RelTone {
  if (rating == null) return "unknown";
  if (rating >= 4) return "good";
  if (rating === 3) return "average";
  return "poor";
}

// ---- Expensive traps --------------------------------------------------------------------
// Most expensive typical repairs first: severity is the only cost signal the data carries
// (catalog_component_faults.severity critical > moderate > minor > unrated), so order by it,
// keep the original order within a severity, and cap at `limit`.
const SEVERITY_RANK: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };
export function topFaults(faults: DetailFaultItem[], limit = 3): DetailFaultItem[] {
  return faults
    .map((f, i) => ({ f, i, r: SEVERITY_RANK[(f.severity || "").toLowerCase()] ?? 3 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.f);
}

// ---- Smart Choice -----------------------------------------------------------------------
// Score = reliability (dominant) minus fault burden minus a small running-cost penalty:
//   reliability_rating × 4           -> 4..20, one tier is worth more than a critical fault
//   − 3 per critical, 1.5 per moderate, 0.5 per minor fault
//   − 0.5 per l/100 km above the thriftiest compared engine (only when every compared engine
//     reports consumption in the same unit -- petrol/diesel l/100 km yes, l vs kWh no)
// Only engines WITH a reliability rating can win (an unrated engine isn't "statistically more
// reliable", it's unknown). No pick at all when fewer than 2 rated engines, or when the leader
// is within 1 point of the runner-up -- a highlighted column on a coin-flip would be a claim
// the data can't back.
const FAULT_PENALTY: Record<string, number> = { critical: 3, moderate: 1.5, minor: 0.5 };
export const SMART_MARGIN = 1;

// The figure Smart Choice compares: electricity for anything with a plug (EV, PHEV, EREV),
// fuel otherwise. Falls back to the legacy single `consumption` (no cycle known) for payloads
// built before electric_/fuel_consumption existed -- which then never counts as comparable.
export function primaryFigure(e: DetailEngine): EngineFigure | null {
  const cls = powertrainClass(e);
  const split = cls === "EV" || cls === "PLUGIN" ? e.electric_consumption : e.fuel_consumption;
  if (split !== undefined) return split;
  return e.consumption ? { ...e.consumption, cycle: null, weighted: false } : null;
}

function midConsumption(e: DetailEngine): number | null {
  const f = primaryFigure(e);
  return f ? (f.min + f.max) / 2 : null;
}

export interface SmartChoice {
  engineId: string;
  reasons: string[];
}

// Yearly servicing midpoint (catalog_engines yearly_maintenance_eur_min/max); null if unknown.
// A pure EV without a figure has NO engine servicing (Martin 2026-11-14: brake fluid / cabin
// filter are not modelled for any car) -> 0, the cheapest, not "unknown" -- otherwise one EV in
// the comparison would knock the whole yearly term out.
export function midYearly(e: DetailEngine): number | null {
  const { yearlyMaintenanceEurMin: a, yearlyMaintenanceEurMax: b } = e.maintenance;
  if (a == null && b == null) return powertrainClass(e) === "EV" ? 0 : null;
  const lo = (a ?? b) as number;
  const hi = (b ?? a) as number;
  return (lo + hi) / 2;
}

// Running-cost term added 2026-10-27 with the engine maintenance data: −1 point per €100 of
// yearly servicing above the cheapest compared engine (only when EVERY compared engine has a
// yearly figure -- a missing one must not look free). €100/year ≈ one moderate fault on this
// scale: real money, but never enough on its own to outweigh a reliability tier (4 points).
export function engineScore(e: DetailEngine, consumptionFloor: number | null, yearlyFloor: number | null = null): number | null {
  if (e.reliability_rating == null) return null;
  const faults = e.faults.reduce((sum, f) => sum + (FAULT_PENALTY[(f.severity || "").toLowerCase()] ?? 0), 0);
  const mid = midConsumption(e);
  const cons = consumptionFloor != null && mid != null ? (mid - consumptionFloor) * 0.5 : 0;
  const y = midYearly(e);
  const yearly = yearlyFloor != null && y != null ? (y - yearlyFloor) / 100 : 0;
  return e.reliability_rating * 4 - faults - cons - yearly;
}

export function pickSmartChoice(engines: DetailEngine[]): SmartChoice | null {
  // Lower consumption is only rewarded like for like: same unit, same known cycle, same method
  // (a weighted plug-in figure never "beats" a pure EV's or a petrol car's) -- figuresComparable.
  const comparableConsumption = figuresComparable(engines.map(primaryFigure)).ok;
  const floor = comparableConsumption ? Math.min(...engines.map((e) => midConsumption(e) as number)) : null;
  const yearlyKnown = engines.every((e) => midYearly(e) != null);
  const yearlyFloor = yearlyKnown ? Math.min(...engines.map((e) => midYearly(e) as number)) : null;

  const scored = engines
    .map((e) => ({ e, s: engineScore(e, floor, yearlyFloor) }))
    .filter((x): x is { e: DetailEngine; s: number } => x.s != null)
    .sort((a, b) => b.s - a.s);
  if (scored.length < 2 || scored[0].s - scored[1].s < SMART_MARGIN) return null;

  const win = scored[0].e;
  const others = engines.filter((e) => e.id !== win.id);
  const reasons: string[] = [];
  if (others.every((o) => o.reliability_rating == null || (win.reliability_rating as number) > o.reliability_rating)) {
    reasons.push("Best reliability rating");
  }
  const crit = (e: DetailEngine) => e.faults.filter((f) => (f.severity || "").toLowerCase() === "critical").length;
  const burden = (e: DetailEngine) => e.faults.reduce((sum, f) => sum + (FAULT_PENALTY[(f.severity || "").toLowerCase()] ?? 0), 0);
  if (others.every((o) => crit(win) < crit(o))) reasons.push("Fewest critical faults");
  else if (others.every((o) => burden(win) < burden(o))) reasons.push("Least severe known faults");
  const wm = midConsumption(win);
  if (comparableConsumption && wm != null && others.every((o) => wm < (midConsumption(o) as number))) {
    reasons.push("Lowest consumption");
  }
  const wy = midYearly(win);
  if (yearlyKnown && wy != null && others.every((o) => wy < (midYearly(o) as number))) {
    reasons.push("Lowest yearly maintenance");
  }
  if (!reasons.length) reasons.push("Best overall balance of reliability and running costs");
  return { engineId: win.id, reasons };
}

export function timingLabel(t: string | null): string | null {
  if (!t) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function consumptionLabel(c: DetailEngine["consumption"]): string | null {
  if (!c) return null;
  const fmt = (n: number) => n.toFixed(1);
  return c.min === c.max ? `${fmt(c.min)} ${c.unit}` : `${fmt(c.min)}–${fmt(c.max)} ${c.unit}`;
}
