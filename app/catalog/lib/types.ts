import type { ConfigurationLevelTagSlug, ModelLevelTagSlug } from "./tags";

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
  // Exhaust after-treatment flags (20261104202000): diesel particulate filter, petrol
  // particulate filter, SCR/AdBlue. null = unknown -- never derived from emission_standard
  // (the 2006-2010 BXE/BLS split is exactly where that guess would be wrong).
  hasDpf: boolean | null;
  hasGpf: boolean | null;
  hasAdblue: boolean | null;
  // 'port' | 'direct' | 'dual' | 'common_rail' | 'pump_injector' | 'distributor_pump'
  // (20261105150000) -- null until recorded.
  injectionType: string | null;
  // Electrified powertrain (EV / PHEV / HEV), 20261105150000. The engine row IS the powertrain
  // variant (motor + battery), so battery and charging live here, not per configuration.
  ev: EnginePowertrainEv;
}

export interface EnginePowertrainEv {
  batteryCapacityNetKwh: number | null;
  maxAcChargingKw: number | null;
  maxDcChargingKw: number | null;
  // 'active_liquid' | 'active_air' | 'passive'
  batteryThermalManagement: string | null;
  // 'yes' | 'no' | 'optional'
  heatPump: string | null;
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
  // Off-road hardware (20261104201000). Booleans on the SYSTEM = fitted as part of it;
  // null = unknown, false = known absent (every road AWD system live today).
  hasLowRange: boolean | null;
  centerDiffLock: boolean | null;
  rearDiffLock: boolean | null;
  frontDiffLock: boolean | null;
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
  // fuel_consumption_combined is a dead, 0%-filled column from an earlier, unfinished pass.
  // fuel_consumption_l100km is 100% filled;
  // energy_consumption_kwh100km covers the PHEV/electric rows. Use these two for any new
  // consumption display -- see the Configurations table.
  fuelConsumptionL100km: number | null;
  energyConsumptionKwh100km: number | null;
  co2EmissionsGKm: number | null;
  // Battery / charging moved to the engine (CatalogEngine.ev, 20261105150000); range stays here
  // because it changes with body and wheels.
  evRangeWltpKm: number | null;
  // Dilemma-driven columns (20261104200000-202000). All null until those migrations have run
  // live -- the loader reads them through a tolerant select("*"), never by name.
  // 'front' | 'rear' | 'all' -- which axle is driven. drivetrain === null used to be read as
  // "FWD"; it only ever meant "no AWD system", which is also true of a RWD BMW.
  drivenAxle: string | null;
  // Bi-fuel: fuelConsumptionL100km is the PRIMARY fuel (= engine.fuelType, e.g. the LPG figure
  // the cost calculator prices); this is the other fuel's figure (petrol on an LPG car).
  secondaryFuelType: string | null;
  secondaryConsumptionL100km: number | null;
  // 'NEDC' | 'WLTP' -- which test cycle fuelConsumptionL100km comes from. WLTP reads ~15-25 %
  // higher for the same car, so figures of different cycles must not be compared as equals.
  consumptionCycle: string | null;
  fuelConsumptionUrbanL100km: number | null;
  fuelConsumptionExtraUrbanL100km: number | null;
  // Per-configuration towing + weight -- catalog_phases.towing_capacity_kg / the body's
  // curbWeightKg are only the phase/body overview; these win wherever set.
  towingBrakedKg: number | null;
  towingUnbrakedKg: number | null;
  curbWeightKg: number | null;
  tireSizes: CatalogTireSize[];
  // Tier-2 tags of this exact configuration (catalog_configuration_tags) -- [] until tagged or
  // while that table doesn't exist yet. See app/catalog/lib/tags.ts.
  tags: ConfigurationLevelTagSlug[];
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
  // 20261104200500 / 201000 / 201500 -- null until those migrations run and the body is filled.
  noseWeightKg: number | null;
  roofLoadKg: number | null;
  approachAngleDeg: number | null;
  departureAngleDeg: number | null;
  breakoverAngleDeg: number | null;
  wadingDepthMm: number | null;
  isofixCount: number | null;
  isofixFrontPassenger: boolean | null;
  // Highest seat count available as an OPTION (7 on a 5+2 Kodiaq); seatsCount stays standard.
  seatsOptionalMax: number | null;
  bootCapacity7SeatsLiters: number | null;
  bootSillHeightMm: number | null;
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
  // 'monocoque' | 'ladder_frame' (20261104201000) -- null until that migration runs.
  chassisType: string | null;
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
  // Tier-1 (model-level) tags of this phase (catalog_phase_tags); [] until tagged.
  tags: ModelLevelTagSlug[];
}
