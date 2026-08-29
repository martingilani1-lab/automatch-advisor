// Shape returned by POST /api/detail — richer, per-variant data than the
// blended CarData from /api/cars. Used by the Prehľad full-screen detail view.

export interface DetailEngine {
  engine: string;
  fuel_type: string;
  power_kw: number;
  displacement_cc: number | null;
  torque_nm: number | null;
  drivetrain: string;
  consumption: number | null;
  co2: number | null;
  battery_kwh: number | null;
  range_km: number | null;
  reliability: string;
  faults: string[];
  pros: string[];
  cons: string[];
}

// The transmission_units row this transmission is linked to (Path B step 3) —
// code/family/reliability_note are the authored content; maintenance_note is
// intentionally empty until a later pass. null if unlinked (defensive only —
// every transmissions row is linked as of this migration).
export interface DetailTransmissionUnit {
  code: string;
  family: string;
  reliability_note: string | null;
  maintenance_note: string | null;
}

export interface DetailTransmission {
  type: string;
  trans_type: string;
  subtype: string;
  speeds: number | null;
  maintenance_km: number | null;
  reliability: string;
  faults: string[];
  notes: string;
  pros: string[];
  cons: string[];
  unit: DetailTransmissionUnit | null;
}

export interface DetailFault {
  area: string;
  severity: string;
  detail: string;
}

export interface DetailEquipment {
  trim: string;
  features: string;
}

export interface DetailSpecs {
  towingCapacity: number | null;
  groundClearance: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  bootMax: number | null;
  resaleValue: string | null;
  bodyVariants: Record<string, unknown>[] | null;
}

// One row per beyond-baseline feature this specific car HAS — presence-only
// (vehicle_safety_features, Step 2), absence means "Not available."
export interface DetailSafetyFeature {
  slug: string;
  availability: "standard" | "optional";
}

export interface DetailData {
  e: DetailEngine[];
  t: DetailTransmission[];
  c: DetailFault[];
  pros: string[];
  cons: string[];
  q: DetailEquipment[];
  b: string;
  sf: DetailSafetyFeature[];
  specs: DetailSpecs;
}

// Shape returned by GET /api/safety-features — the safety_features reference
// table (supabase/migrations/20260824090000_...). Static vocabulary, same
// for every car (17 rows: 9 gsr2_mandated + 8 beyond_baseline), fetched once
// by PrehladView on mount rather than per-vehicle like DetailData above.
// A car's eligibility for the gsr2_mandated rows is derived client-side from
// its production years (isGsr2Era, app/lib/carFields.ts) — this table never
// stores which cars have which feature.
export interface SafetyFeature {
  id: string;
  slug: string;
  universal_name: string;
  category: "gsr2_mandated" | "beyond_baseline";
  marketing_names: string[] | null;
  what_it_does: string | null;
  how_it_works: string | null;
  sensors_used: string | null;
  how_to_disable: string | null;
  gsr2: boolean;
}
