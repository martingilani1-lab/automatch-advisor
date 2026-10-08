import { createClient } from "@supabase/supabase-js";

import type {
  CatalogBodyDimensions,
  CatalogConfig,
  CatalogFault,
  CatalogMediaItem,
  CatalogTrim,
  PhaseBundle,
} from "./types";

// No `slug` column exists anywhere in the catalog_ schema (checked every migration) --
// catalog_brands.name / catalog_models.name / catalog_phases.generation_code /
// catalog_phases.phase_label are the live display strings ("Audi"/"A4"/"B9"/"Facelift").
// Slugify them in JS and match against the URL segments instead of pushing per-column
// ilike() into Postgres, which would need to reverse-hyphenate each column's own spacing.
export function slugify(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Same inline-client-per-call pattern as every route handler (app/api/cars/route.ts etc.) --
// there is no shared lib/supabase.ts client module in this codebase, by design.
function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getPhaseBundle(
  brandSlug: string,
  modelSlug: string,
  generationSlug: string,
  phaseSlug: string
): Promise<PhaseBundle | null> {
  const supabase = client();

  // Step 1: resolve the phase by slugifying the live display columns in JS (see slugify()
  // above -- no slug column exists to filter on server-side).
  const phasesRes = await supabase.from("catalog_phases").select(`
      id, generation_code, phase_label, year_from, year_to, display_name, platform_code,
      safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
      ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
      price_range_max_eur, typical_mileage_range, resale_value_rating,
      catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
    `);
  if (phasesRes.error) throw phasesRes.error;

  const phaseRow = (phasesRes.data || []).find((p: any) => {
    const model = p.catalog_models;
    const brand = model?.catalog_brands;
    return (
      slugify(brand?.name) === brandSlug &&
      slugify(model?.name) === modelSlug &&
      slugify(p.generation_code) === generationSlug &&
      slugify(p.phase_label) === phaseSlug
    );
  }) as any;

  if (!phaseRow) return null;

  const phaseId = phaseRow.id;
  const model = phaseRow.catalog_models;
  const brand = model.catalog_brands;

  // Step 2: everything scoped to this phase, in parallel -- same Promise.all shape as
  // app/api/cars/route.ts.
  const [bodyDimsRes, configsRes, trimsRes, mediaRes] = await Promise.all([
    supabase
      .from("phase_body_dimensions")
      .select("*, catalog_body_types(id, name)")
      .eq("phase_id", phaseId),
    supabase
      .from("catalog_vehicle_configurations")
      .select(
        `
        id, body_type_id, acceleration_0_100, top_speed_kmh, fuel_consumption_combined,
        co2_emissions_g_km, battery_capacity_net_kwh, ev_range_wltp_km, max_charging_kw_dc,
        catalog_body_types(id, name),
        catalog_engines(id, code, display_name, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km, hybrid_type),
        transmission_units(id, code, family, maker, speeds, reliability_note, maintenance_note),
        drivetrain_systems(id, code, type, maker, reliability_note)
        `
      )
      .eq("phase_id", phaseId),
    supabase.from("catalog_trims").select("id, name, tier").eq("phase_id", phaseId),
    supabase
      .from("catalog_media")
      .select("id, body_type_id, image_url, view_angle, is_main, catalog_body_types(id, name)")
      .eq("phase_id", phaseId),
  ]);
  if (bodyDimsRes.error) throw bodyDimsRes.error;
  if (configsRes.error) throw configsRes.error;
  if (trimsRes.error) throw trimsRes.error;
  if (mediaRes.error) throw mediaRes.error;

  const trimRows = trimsRes.data || [];
  const trimIds = trimRows.map((t: any) => t.id);
  const trimFeaturesRes = trimIds.length
    ? await supabase.from("catalog_trim_features").select("*").in("trim_id", trimIds)
    : { data: [] as any[], error: null };
  if (trimFeaturesRes.error) throw trimFeaturesRes.error;

  const configRows = configsRes.data || [];

  // Tire sizes hang off configuration_id (one config can list several -- base vs. optional
  // wheels), so they can only be fetched once this phase's config ids are known.
  const configIds = configRows.map((c: any) => c.id);
  const tireSizesRes = configIds.length
    ? await supabase.from("catalog_tire_sizes").select("*").in("configuration_id", configIds)
    : { data: [] as any[], error: null };
  if (tireSizesRes.error) throw tireSizesRes.error;
  const tireSizeRows = tireSizesRes.data || [];

  // Step 3: faults for every engine/gearbox this phase's configs actually use, fetched once
  // for the whole phase rather than per-config. catalog_component_faults keys a fault to
  // EITHER engine_id OR unit_id, never a vehicle -- the .or() mirrors that union.
  const engineIds = [...new Set(configRows.map((c: any) => c.catalog_engines?.id).filter(Boolean))];
  const unitIds = [...new Set(configRows.map((c: any) => c.transmission_units?.id).filter(Boolean))];

  let faultRows: any[] = [];
  if (engineIds.length || unitIds.length) {
    const orParts: string[] = [];
    if (engineIds.length) orParts.push(`engine_id.in.(${engineIds.join(",")})`);
    if (unitIds.length) orParts.push(`unit_id.in.(${unitIds.join(",")})`);
    const faultsRes = await supabase
      .from("catalog_component_faults")
      .select("*")
      .or(orParts.join(","));
    if (faultsRes.error) throw faultsRes.error;
    faultRows = faultsRes.data || [];
  }

  return transformBundle(
    phaseRow,
    brand,
    model,
    bodyDimsRes.data || [],
    configRows,
    trimRows,
    trimFeaturesRes.data || [],
    faultRows,
    tireSizeRows,
    mediaRes.data || []
  );
}

function transformBundle(
  phaseRow: any,
  brand: any,
  model: any,
  bodyDimRows: any[],
  configRows: any[],
  trimRows: any[],
  trimFeatureRows: any[],
  faultRows: any[],
  tireSizeRows: any[],
  mediaRows: any[]
): PhaseBundle {
  const bodyDimensions: CatalogBodyDimensions[] = bodyDimRows.map((d) => ({
    bodyTypeId: d.body_type_id,
    bodyName: d.catalog_body_types?.name ?? "",
    lengthMm: d.length_mm,
    widthMm: d.width_mm,
    heightMm: d.height_mm,
    groundClearanceMm: d.ground_clearance_mm,
    curbWeightKg: d.curb_weight_kg,
    bootCapacityLiters: d.boot_capacity_liters,
    bootMaxLiters: d.boot_max_liters,
    grossVehicleWeightKg: d.gross_vehicle_weight_kg,
    payloadKg: d.payload_kg,
    fuelTankCapacityLiters: d.fuel_tank_capacity_liters,
    seatsCount: d.seats_count,
  }));

  const tireSizesByConfig = new Map<string, { tireSize: string; isStandard: boolean }[]>();
  for (const t of tireSizeRows) {
    const list = tireSizesByConfig.get(t.configuration_id) ?? [];
    list.push({ tireSize: t.tire_size, isStandard: t.is_standard });
    tireSizesByConfig.set(t.configuration_id, list);
  }

  const configs: CatalogConfig[] = configRows.map((c) => ({
    id: c.id,
    bodyTypeId: c.body_type_id,
    bodyName: c.catalog_body_types?.name ?? "",
    engine: {
      id: c.catalog_engines.id,
      code: c.catalog_engines.code,
      displayName: c.catalog_engines.display_name,
      displacementCc: c.catalog_engines.displacement_cc,
      powerKw: c.catalog_engines.power_kw,
      fuelType: c.catalog_engines.fuel_type,
      torqueNm: c.catalog_engines.torque_nm,
      cylinders: c.catalog_engines.cylinders,
      emissionStandard: c.catalog_engines.emission_standard,
      timingType: c.catalog_engines.timing_type,
      engineOilCapacityLiters: c.catalog_engines.engine_oil_capacity_liters,
      timingReplacementKm: c.catalog_engines.timing_replacement_km,
      hybridType: c.catalog_engines.hybrid_type,
    },
    gearbox: {
      id: c.transmission_units.id,
      code: c.transmission_units.code,
      family: c.transmission_units.family,
      maker: c.transmission_units.maker,
      speeds: c.transmission_units.speeds,
      reliabilityNote: c.transmission_units.reliability_note,
      maintenanceNote: c.transmission_units.maintenance_note,
    },
    drivetrain: c.drivetrain_systems
      ? {
          id: c.drivetrain_systems.id,
          code: c.drivetrain_systems.code,
          type: c.drivetrain_systems.type,
          maker: c.drivetrain_systems.maker,
          reliabilityNote: c.drivetrain_systems.reliability_note,
        }
      : null,
    acceleration0To100: c.acceleration_0_100,
    topSpeedKmh: c.top_speed_kmh,
    fuelConsumptionCombined: c.fuel_consumption_combined,
    co2EmissionsGKm: c.co2_emissions_g_km,
    batteryCapacityNetKwh: c.battery_capacity_net_kwh,
    evRangeWltpKm: c.ev_range_wltp_km,
    maxChargingKwDc: c.max_charging_kw_dc,
    tireSizes: tireSizesByConfig.get(c.id) ?? [],
  }));

  const featuresByTrim = new Map<string, { feature: string; isOptional: boolean }[]>();
  for (const f of trimFeatureRows) {
    const list = featuresByTrim.get(f.trim_id) ?? [];
    list.push({ feature: f.feature, isOptional: f.is_optional });
    featuresByTrim.set(f.trim_id, list);
  }
  const trims: CatalogTrim[] = trimRows.map((t) => ({
    id: t.id,
    name: t.name,
    tier: t.tier,
    features: featuresByTrim.get(t.id) ?? [],
  }));

  const faults: CatalogFault[] = faultRows.map((f) => ({
    id: f.id,
    componentType: f.component_type,
    engineId: f.engine_id,
    unitId: f.unit_id,
    fault: f.fault,
    severity: f.severity,
  }));

  const media: CatalogMediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    bodyTypeId: m.body_type_id,
    bodyName: m.catalog_body_types?.name ?? "",
    imageUrl: m.image_url,
    viewAngle: m.view_angle,
    isMain: m.is_main,
  }));

  return {
    brandName: brand.name,
    modelName: model.name,
    segment: model.segment,
    originCountry: model.origin_country,
    generationCode: phaseRow.generation_code,
    phaseLabel: phaseRow.phase_label,
    yearFrom: phaseRow.year_from,
    yearTo: phaseRow.year_to,
    displayName: phaseRow.display_name,
    platformCode: phaseRow.platform_code,
    safetyRating: phaseRow.safety_rating,
    ncapYear: phaseRow.ncap_year,
    ncapAdultPct: phaseRow.ncap_adult_pct,
    ncapChildPct: phaseRow.ncap_child_pct,
    ncapPedestrianPct: phaseRow.ncap_pedestrian_pct,
    ncapSafetyAssistPct: phaseRow.ncap_safety_assist_pct,
    towingCapacityKg: phaseRow.towing_capacity_kg,
    avgMarketPriceEur: phaseRow.avg_market_price_eur,
    priceRangeMinEur: phaseRow.price_range_min_eur,
    priceRangeMaxEur: phaseRow.price_range_max_eur,
    typicalMileageRange: phaseRow.typical_mileage_range,
    resaleValueRating: phaseRow.resale_value_rating,
    bodyDimensions,
    configs,
    trims,
    faults,
    media,
  };
}
