// camelCase shapes returned by lib/db.ts. Raw snake_case Supabase rows never cross this
// boundary into a component prop type (same remap-discipline as buildCar() in
// app/api/cars/route.ts for the legacy schema).

// catalog_engines' maintenance columns (20261027140000), camelCased. EUR prices are parts +
// labour at an independent SK/CZ workshop, min-max; yearly cost assumes ~15,000 km/year of
// routine servicing (no tyres, no repairs). Every field NULL = not known -- never guessed.
// Spark plugs are NULL for diesels, fuel filter NULL for most modern petrols; chain engines
// have no timing km/years, only a typical chain-job cost.
export interface EngineMaintenance {
  oilChangeIntervalKm: number | null;
  oilChangeIntervalMonths: number | null;
  oilSpec: string | null;
  oilServiceCostEurMin: number | null;
  oilServiceCostEurMax: number | null;
  airFilterIntervalKm: number | null;
  fuelFilterIntervalKm: number | null;
  sparkPlugIntervalKm: number | null;
  sparkPlugCostEurMin: number | null;
  sparkPlugCostEurMax: number | null;
  timingReplacementYears: number | null;
  timingServiceCostEurMin: number | null;
  timingServiceCostEurMax: number | null;
  yearlyMaintenanceEurMin: number | null;
  yearlyMaintenanceEurMax: number | null;
  note: string | null;
}

export interface CatalogEngine {
  id: string;
  code: string;
  displayName: string | null;
  displacementCc: number | null;
  powerKw: number;
  fuelType: string;
  torqueNm: number | null;
  cylinders: string | null;
  emissionStandard: string | null;
  timingType: string | null;
  engineOilCapacityLiters: number | null;
  timingReplacementKm: number | null;
  hybridType: string | null;
  reliabilityRating: number | null;
  pros: string[];
  cons: string[];
  maintenance: EngineMaintenance;
}

// One scheduled fluid service of a gearbox or AWD system (transmission_units /
// drivetrain_systems service_* columns, 20261027160000). All null until those columns exist
// live and are filled -- the loader degrades to EMPTY_UNIT_SERVICE rather than failing.
export interface UnitService {
  intervalKm: number | null;
  intervalYears: number | null;
  costEurMin: number | null;
  costEurMax: number | null;
}

export interface CatalogGearbox {
  id: string;
  code: string;
  family: string;
  maker: string | null;
  speeds: number | null;
  reliabilityNote: string | null;
  maintenanceNote: string | null;
  reliabilityRating: number | null;
  pros: string[];
  cons: string[];
  // Per-(phase, unit) authored note from catalog_phase_unit_notes -- e.g. "For FWD petrol.
  // Same DQ200 risk." on this specific car, distinct from reliabilityNote's unit-wide text.
  // null until that table exists live and/or has a row for this phase+unit.
  phaseNote: string | null;
  service: UnitService;
}

export interface CatalogDrivetrain {
  id: string;
  code: string;
  type: string;
  // Plain-language generation label (e.g. "Gen 5", "Torsen permanent") -- the Configurations
  // table's Drivetrain column shows this, not the internal `code`.
  generation: string | null;
  maker: string | null;
  description: string | null;
  reliabilityNote: string | null;
  maintenanceNote: string | null;
  reliabilityRating: number | null;
  pros: string[];
  cons: string[];
  service: UnitService;
}

export interface CatalogTireSize {
  tireSize: string;
  isStandard: boolean;
}

export interface CatalogConfig {
  id: string;
  bodyTypeId: string;
  bodyName: string;
  engine: CatalogEngine;
  gearbox: CatalogGearbox;
  drivetrain: CatalogDrivetrain | null;
  acceleration0To100: number | null;
  topSpeedKmh: number | null;
  fuelConsumptionCombined: number | null;
  // The columns actually populated live (fuel_consumption_combined/battery_capacity_net_kwh/
  // ev_range_wltp_km are 0% filled across all 1550 rows, confirmed by direct query -- dead
  // columns from an earlier, unfinished pass). fuel_consumption_l100km is 100% filled;
  // energy_consumption_kwh100km covers the PHEV/electric rows. Use these two for any new
  // consumption display -- see the Configurations table.
  fuelConsumptionL100km: number | null;
  energyConsumptionKwh100km: number | null;
  co2EmissionsGKm: number | null;
  batteryCapacityNetKwh: number | null;
  evRangeWltpKm: number | null;
  maxChargingKwDc: number | null;
  tireSizes: CatalogTireSize[];
}

export interface CatalogBodyDimensions {
  bodyTypeId: string;
  bodyName: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  groundClearanceMm: number | null;
  curbWeightKg: number | null;
  bootCapacityLiters: number | null;
  bootMaxLiters: number | null;
  grossVehicleWeightKg: number | null;
  payloadKg: number | null;
  fuelTankCapacityLiters: number | null;
  seatsCount: number | null;
}

export interface CatalogTrimFeature {
  feature: string;
  isOptional: boolean;
  // Which equipment "slot" this feature fills (wheels, seats, climate, ...) -- null means a
  // standalone feature with no replacement relationship (ABS, ESP, ...). Frozen vocabulary,
  // see catalog_trim_features_feature_group_check; drives resolveTrimFeatures' upgrade
  // detection in trimsDisplay.ts.
  featureGroup: string | null;
  // FK -> safety_features.slug when this trim feature IS one of the 20 reference safety
  // systems (ABS/ESC/airbags plus the 17 GSR2/beyond-baseline assists) -- null for the ~800
  // ordinary equipment rows this doesn't apply to. Drives the Trims tab's yellow
  // shield-icon styling and the NCAP tab's per-car safety-equipment section.
  safetyFeatureSlug: string | null;
}

export interface CatalogTrim {
  id: string;
  name: string;
  tier: string | null;
  features: CatalogTrimFeature[];
}

export interface CatalogFault {
  id: string;
  // 'drivetrain' included for schema accuracy (catalog_component_faults.component_type's
  // live CHECK vocabulary) even though nothing currently fetches a drivetrain_id-keyed row --
  // see fetchBundleForPhase's own comment on why.
  componentType: "engine" | "transmission" | "drivetrain" | "vehicle";
  engineId: string | null;
  unitId: string | null;
  drivetrainId: string | null;
  phaseId: string | null;
  // Frozen vocabulary (electrical/body_rust/suspension/steering/brakes/climate/interior),
  // set only when componentType === 'vehicle' -- null for every engine/transmission row.
  category: string | null;
  fault: string;
  severity: string | null;
}

export interface CatalogMediaItem {
  id: string;
  bodyTypeId: string;
  bodyName: string;
  imageUrl: string;
  viewAngle: string | null;
  isMain: boolean;
}

export interface PhaseBundle {
  phaseId: string;
  modelId: string;
  brandName: string;
  modelName: string;
  segment: string | null;
  originCountry: string | null;
  generationCode: string | null;
  phaseLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  displayName: string | null;
  platformCode: string | null;
  safetyRating: number | null;
  ncapYear: number | null;
  ncapAdultPct: number | null;
  ncapChildPct: number | null;
  ncapPedestrianPct: number | null;
  ncapSafetyAssistPct: number | null;
  towingCapacityKg: number | null;
  avgMarketPriceEur: number | null;
  priceRangeMinEur: number | null;
  priceRangeMaxEur: number | null;
  typicalMileageRange: string | null;
  resaleValueRating: string | null;
  bodyDimensions: CatalogBodyDimensions[];
  configs: CatalogConfig[];
  trims: CatalogTrim[];
  faults: CatalogFault[];
  media: CatalogMediaItem[];
}
