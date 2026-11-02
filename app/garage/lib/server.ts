// Server-side helpers shared by the /api/garage* route handlers. The Supabase client itself is
// still created inline in each route (project convention) and passed in here.

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CatalogMaintenanceInput, Deadline, ServiceInterval } from "./reminders";
import { intervalsFromCatalog } from "./reminders";
import type { DeadlineKind, ServiceKind } from "./vocab";

// Verifies the caller's Supabase access token (Authorization: Bearer ...) and returns the user,
// or null. Every garage read/write is then scoped to this user's id -- the request body never
// decides whose data it touches.
export async function requireUser(req: Request, supabase: SupabaseClient): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

// One select for a garage car with its catalog maintenance data, shared by GET /api/garage and
// the daily reminder job so both compute reminders from the same facts.
export const GARAGE_VEHICLE_SELECT = `
  id, user_id, brand, model, engine_text, nickname, license_plate, year_made, mileage_km,
  mileage_updated_on, yearly_km, phase_id, engine_id, unit_id, drivetrain_id, created_at,
  catalog_phases(generation_code, phase_label, year_from, year_to),
  catalog_engines(code, display_name, power_kw, timing_type, timing_replacement_km, timing_replacement_years,
    timing_service_cost_eur_min, timing_service_cost_eur_max, oil_change_interval_km, oil_change_interval_months,
    oil_service_cost_eur_min, oil_service_cost_eur_max, spark_plug_interval_km, spark_plug_cost_eur_min,
    spark_plug_cost_eur_max, air_filter_interval_km, fuel_filter_interval_km),
  transmission_units(code, family, speeds, service_interval_km, service_interval_years, service_cost_eur_min, service_cost_eur_max),
  drivetrain_systems(code, type, generation, service_interval_km, service_interval_years, service_cost_eur_min, service_cost_eur_max),
  garage_service_records(id, kind, done_on, mileage_km, cost_eur, note),
  garage_deadlines(id, kind, due_on, label, note)
`;

export interface GarageRecord {
  id: string;
  kind: ServiceKind;
  doneOn: string;
  mileageKm: number | null;
  costEur: number | null;
  note: string | null;
}

export interface GarageDeadline extends Deadline {
  note: string | null;
}

export interface GarageVehicle {
  id: string;
  brand: string;
  model: string;
  engineText: string | null;
  nickname: string | null;
  licensePlate: string | null;
  yearMade: number | null;
  mileageKm: number | null;
  mileageUpdatedOn: string | null;
  yearlyKm: number | null;
  phaseId: string | null;
  engineId: string | null;
  unitId: string | null;
  drivetrainId: string | null;
  // "(5E) Facelift · 2.0 TDI 110 kW · VW DQ381 7-speed" -- null for free-text cars.
  catalogLabel: string | null;
  intervals: ServiceInterval[];
  records: GarageRecord[];
  deadlines: GarageDeadline[];
}

export interface GarageData {
  email: string | null;
  vehicles: GarageVehicle[];
  settings: { emailEnabled: boolean; daysBefore: number };
}

const one = (x: any) => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const n = (v: unknown) => (v == null ? null : Number(v));

export function vehicleFromRow(r: any): GarageVehicle {
  const p = one(r.catalog_phases);
  const e = one(r.catalog_engines);
  const g = one(r.transmission_units);
  const d = one(r.drivetrain_systems);
  const maintenance: CatalogMaintenanceInput = {
    engine: e
      ? {
          oilKm: n(e.oil_change_interval_km), oilMonths: n(e.oil_change_interval_months),
          oilCostMin: n(e.oil_service_cost_eur_min), oilCostMax: n(e.oil_service_cost_eur_max),
          sparkPlugKm: n(e.spark_plug_interval_km), plugCostMin: n(e.spark_plug_cost_eur_min), plugCostMax: n(e.spark_plug_cost_eur_max),
          airFilterKm: n(e.air_filter_interval_km), fuelFilterKm: n(e.fuel_filter_interval_km),
          timingType: e.timing_type ?? null, timingKm: n(e.timing_replacement_km), timingYears: n(e.timing_replacement_years),
          timingCostMin: n(e.timing_service_cost_eur_min), timingCostMax: n(e.timing_service_cost_eur_max),
        }
      : null,
    gearbox: g ? { everyKm: n(g.service_interval_km), everyYears: n(g.service_interval_years), costMin: n(g.service_cost_eur_min), costMax: n(g.service_cost_eur_max) } : null,
    drivetrain: d ? { everyKm: n(d.service_interval_km), everyYears: n(d.service_interval_years), costMin: n(d.service_cost_eur_min), costMax: n(d.service_cost_eur_max) } : null,
  };
  const engineName = e ? (e.display_name ?? e.code) : null;
  const catalogLabel = p || e
    ? [
        p ? [p.generation_code ? `(${p.generation_code})` : null, p.phase_label].filter(Boolean).join(" ") : null,
        e ? (/kw/i.test(engineName) ? engineName : `${engineName} ${e.power_kw} kW`) : null,
        g ? `${g.code}${g.speeds ? ` ${g.speeds}-speed` : ""}` : null,
        d ? (d.generation ? `${d.type === "haldex" ? "Haldex " : ""}${d.generation}` : d.code) : null,
      ].filter(Boolean).join(" · ")
    : null;
  return {
    id: r.id,
    brand: r.brand,
    model: r.model,
    engineText: r.engine_text,
    nickname: r.nickname,
    licensePlate: r.license_plate,
    yearMade: n(r.year_made),
    mileageKm: n(r.mileage_km),
    mileageUpdatedOn: r.mileage_updated_on,
    yearlyKm: n(r.yearly_km),
    phaseId: r.phase_id,
    engineId: r.engine_id,
    unitId: r.unit_id,
    drivetrainId: r.drivetrain_id,
    catalogLabel,
    intervals: intervalsFromCatalog(maintenance),
    records: ((r.garage_service_records ?? []) as any[])
      .map((x) => ({ id: x.id, kind: x.kind as ServiceKind, doneOn: x.done_on, mileageKm: n(x.mileage_km), costEur: n(x.cost_eur), note: x.note }))
      .sort((a, b) => (a.doneOn < b.doneOn ? 1 : -1)),
    deadlines: ((r.garage_deadlines ?? []) as any[])
      .map((x) => ({ id: x.id, kind: x.kind as DeadlineKind, dueOn: x.due_on, label: x.label, note: x.note }))
      .sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1)),
  };
}

// ---- input validation ---------------------------------------------------------------------
export const str = (v: unknown, max = 120): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
export function int(v: unknown, min: number, max: number): number | null {
  const x = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? Math.round(x) : null;
}
export const dateStr = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : null;
export const uuid = (v: unknown): string | null =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
