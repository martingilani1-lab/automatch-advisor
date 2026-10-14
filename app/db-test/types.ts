// Shape returned by POST /api/db-test — parallels app/prehlad/types.ts's DetailData, adapted
// to the catalog_ schema. Safety-feature reference vocabulary (SafetyFeature/DetailSafetyFeature
// in the Prehľad version) has no catalog_ equivalent at all (no vehicle_safety_features-style
// table), so it's dropped here rather than carried over empty — see CarDetail.tsx's Safety tab.

import type { CatalogConfig, CatalogMediaItem } from "@/app/catalog/lib/types";

// A fault carries its own severity (catalog_component_faults.severity: 'critical' | 'moderate'
// | 'minor' | null) through to display, so the engine/gearbox fault lists can sort by it and
// show a severity badge rather than a flat list of strings.
export interface DetailFaultItem {
  fault: string;
  severity: string | null;
}

// A gearbox is a real, standalone unit -- its own top-level array (see DetailData.g below),
// not nested inside DetailEngine, since the same gearbox can be paired with several different
// engines. `engineNames` is which engine(s) this phase actually pairs it with.
export interface DetailGearboxGroup {
  // transmission_units.id -- the vehicle page redesign's deep-linking (a Configurations row
  // -> this widget) and scroll target need the real id, not just the display code.
  id: string;
  code: string;
  family: string;
  speeds: number | null;
  // Word-mapped from transmission_units.reliability_rating (1-5) -- "—" if that's NULL, never
  // a guessed tier (CLAUDE.md "NULL over invention"). pros/cons come from the same row.
  reliability: string;
  reliability_note: string | null;
  maintenance_note: string | null;
  pros: string[];
  cons: string[];
  // Per-(phase, unit) authored note from catalog_phase_unit_notes, shown as "In this car" --
  // null until that table exists live and/or has a row for this phase+unit.
  phase_note: string | null;
  faults: DetailFaultItem[];
  // Body types and drivetrain labels this gearbox is offered with, and the engine(s) it's
  // actually paired with on this phase, shown as small chips rather than separate blocks.
  bodyNames: string[];
  drivetrainLabels: string[];
  engineNames: string[];
}

export interface DetailEngine {
  // catalog_engines.id -- same deep-linking need as DetailGearboxGroup.id above.
  id: string;
  engine: string;
  fuel_type: string;
  power_kw: number;
  displacement_cc: number | null;
  torque_nm: number | null;
  cylinders: string | null;
  // true if this engine is electric or any of its configurations carry EV data (battery/
  // range) -- covers PHEVs, whose fuel_type is the combustion fuel, not "electric".
  is_ev: boolean;
  // Word-mapped from catalog_engines.reliability_rating (1-5) -- "—" if that's NULL, never a
  // guessed tier (CLAUDE.md "NULL over invention"). pros/cons come from the same row.
  reliability: string;
  faults: DetailFaultItem[];
  pros: string[];
  cons: string[];
  // Body types this engine is offered in, across every gearbox it pairs with.
  bodyNames: string[];
}

export interface DetailDrivetrainSystem {
  // drivetrain_systems.id -- same deep-linking need as DetailGearboxGroup.id above.
  id: string;
  code: string;
  type: string;
  generation: string | null;
  maker: string | null;
  description: string | null;
  // Word-mapped from drivetrain_systems.reliability_rating (1-5) -- "—" if that's NULL,
  // never a guessed tier (CLAUDE.md "NULL over invention"). pros/cons come from the same row.
  reliability: string;
  reliability_note: string | null;
  maintenance_note: string | null;
  pros: string[];
  cons: string[];
}

// Drivetrain systems are real, standalone components independent of any one engine/gearbox
// pairing (the same Haldex unit can sit behind several different gearboxes), so they stay a
// top-level group rather than nested under DetailEngine/DetailGearboxGroup -- `variants` is
// the distinct gearbox codes this drivetrain system is actually paired with on this car.
export interface DetailDrivetrainGroup {
  system: DetailDrivetrainSystem;
  variants: string[];
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
  g: DetailGearboxGroup[];
  dt: DetailDrivetrainGroup[];
  c: DetailFault[];
  pros: string[];
  cons: string[];
  q: DetailEquipment[];
  b: string;
  specs: DetailSpecs;
  dims: DimensionsByBody[];
  // The same raw per-configuration rows app/catalog's PhaseBundle.configs carries -- passed
  // through unchanged (not re-derived) so CarDetail's Configurations tab can reuse
  // app/catalog/components/ConfigurationsTable.tsx exactly as /catalog does.
  configs: CatalogConfig[];
  // Same -- PhaseBundle.media passed through unchanged so CarDetail's hero photo can reuse
  // app/catalog/lib/media.ts's pickMainMedia() exactly as /catalog's CatalogHeader does.
  media: CatalogMediaItem[];
}

// One phase's full DetailData, tagged with the phase metadata the switcher needs -- POST
// /api/db-test now returns every phase of the requested phase's generation in one response
// (vehicle page redesign step 1), not just the one requested, so switching is instant.
export interface DetailPhase {
  phaseId: string;
  phaseLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  detail: DetailData;
}

export interface DetailResponse {
  phases: DetailPhase[];
}
