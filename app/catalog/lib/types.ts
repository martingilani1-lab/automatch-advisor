// camelCase shapes returned by lib/db.ts. Raw snake_case Supabase rows never cross this
// boundary into a component prop type (same remap-discipline as buildCar() in
// app/api/cars/route.ts for the legacy schema).

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
}

export interface CatalogGearbox {
  id: string;
  code: string;
  family: string;
  maker: string | null;
  speeds: number | null;
  reliabilityNote: string | null;
  maintenanceNote: string | null;
}

export interface CatalogDrivetrain {
  id: string;
  code: string;
  type: string;
  maker: string | null;
  reliabilityNote: string | null;
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
}

export interface CatalogTrim {
  id: string;
  name: string;
  tier: string | null;
  features: CatalogTrimFeature[];
}

export interface CatalogFault {
  id: string;
  componentType: "engine" | "transmission";
  engineId: string | null;
  unitId: string | null;
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
