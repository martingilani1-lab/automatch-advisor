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

export interface DetailData {
  e: DetailEngine[];
  t: DetailTransmission[];
  c: DetailFault[];
  pros: string[];
  cons: string[];
  q: DetailEquipment[];
  b: string;
  specs: DetailSpecs;
}
