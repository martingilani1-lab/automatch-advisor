// Shape returned by POST /api/db-test — parallels app/prehlad/types.ts's DetailData, adapted
// to the catalog_ schema. Safety-feature reference vocabulary (SafetyFeature/DetailSafetyFeature
// in the Prehľad version) has no catalog_ equivalent at all (no vehicle_safety_features-style
// table), so it's dropped here rather than carried over empty — see CarDetail.tsx's Safety tab.

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
  // No reliability-tier column exists anywhere in catalog_engines -- literally "—", never a
  // guessed tier (see CLAUDE.md "NULL over invention").
  reliability: string;
  faults: string[];
  pros: string[];
  cons: string[];
}

export interface DetailTransmissionUnit {
  code: string;
  family: string;
  reliability_note: string | null;
  maintenance_note: string | null;
}

export interface DetailDrivetrainSystem {
  code: string;
  type: string;
  generation: string | null;
  maker: string | null;
  description: string | null;
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
  drivetrainSystem: DetailDrivetrainSystem | null;
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

// phase_body_dimensions is per (phase, body_type) -- the legacy vehicles table never modeled
// this, so DetailSpecs above stays a single flattened set (same shape, for the parts of the
// UI that only ever showed one). This is the real per-body breakdown, one entry per body this
// phase actually has, rendered as its own "Dimensions" tab.
export interface DimensionsByBody {
  bodyName: string;
  length: number | null;
  width: number | null;
  height: number | null;
  groundClearance: number | null;
  curbWeight: number | null;
  bootCapacity: number | null;
  bootMax: number | null;
  grossVehicleWeight: number | null;
  payload: number | null;
  fuelTank: number | null;
  seats: number | null;
}

export interface DetailData {
  e: DetailEngine[];
  t: DetailTransmission[];
  c: DetailFault[];
  pros: string[];
  cons: string[];
  q: DetailEquipment[];
  b: string;
  specs: DetailSpecs;
  dims: DimensionsByBody[];
}
