// Pure helpers behind the Engines tab's side-by-side comparison (EngineCompare.tsx): the
// "use case" verdict tag, the top "expensive traps" faults, and the Smart Choice pick.
// Everything here is DERIVED from data already on DetailEngine -- nothing is authored per
// engine, so the rules are spelled out below and covered by tests/engineCompare.test.ts.
import type { DetailEngine, DetailFaultItem } from "../types";

export const MAX_COMPARE = 3;
export const MIN_COMPARE = 2;

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

function midConsumption(e: DetailEngine): number | null {
  return e.consumption ? (e.consumption.min + e.consumption.max) / 2 : null;
}

export interface SmartChoice {
  engineId: string;
  reasons: string[];
}

// Yearly servicing midpoint (catalog_engines yearly_maintenance_eur_min/max); null if unknown.
function midYearly(e: DetailEngine): number | null {
  const { yearlyMaintenanceEurMin: a, yearlyMaintenanceEurMax: b } = e.maintenance;
  if (a == null && b == null) return null;
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
  const units = new Set(engines.map((e) => e.consumption?.unit ?? null));
  const comparableConsumption = units.size === 1 && !units.has(null);
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
