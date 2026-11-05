import { createClient } from "@supabase/supabase-js";

import type {
  EnginePowertrainEv,
  CatalogBodyDimensions,
  CatalogConfig,
  CatalogFault,
  CatalogMediaItem,
  CatalogTrim,
  EngineMaintenance,
  UnitService,
  PhaseBundle,
} from "./types";
// Page-agnostic reference-table shape -- /db-test's CarDetail.tsx already imports this same
// type from here rather than duplicating it; this follows that precedent instead of adding a
// third copy.
import type { SafetyFeature } from "@/app/prehlad/types";
import { EMPTY_UNIT_SERVICE } from "./engineMaintenance";
import type { ConfigurationLevelTagSlug, ModelLevelTagSlug } from "./tags";
import { isConfigurationLevel, isModelLevel, isTagSlug } from "./tags";

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

// The safety_features reference vocabulary (20 rows: 3 basic + 9 gsr2_mandated + 8
// beyond_baseline) -- same static, car-independent table GET /api/safety-features serves to
// /prehlad and /db-test, fetched here instead since /catalog's page.tsx is a Server Component
// that already does its own server-side fetch (getGenerationBundles) rather than a client
// useEffect fetch. Used only to look up a trim feature's safety_feature_slug -> what_it_does
// for TrimCards.tsx's title attribute -- /catalog has no NCAP tab to link through to.
export async function getSafetyFeatures(): Promise<SafetyFeature[]> {
  const supabase = client();
  const { data, error } = await supabase.from("safety_features").select("*").order("category").order("universal_name");
  if (error) throw error;
  return (data || []) as SafetyFeature[];
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

  return fetchBundleForPhase(supabase, phaseRow);
}

// Resolves every phase of ONE generation (same model_id + generation_code -- e.g. both
// Pre-facelift and Facelift of Audi A4 B9), ordered by year_from, each as a FULL PhaseBundle.
// Powers the phase switcher (vehicle page redesign step 1): loading every sibling phase's
// complete data in one server round trip means switching phases client-side is instant, no
// refetch. Mirrors getPhaseBundle's slug-matching (no slug column anywhere in the schema).
export async function getGenerationBundles(
  brandSlug: string,
  modelSlug: string,
  generationSlug: string
): Promise<PhaseBundle[] | null> {
  const supabase = client();

  const phasesRes = await supabase.from("catalog_phases").select(`
      id, generation_code, phase_label, year_from, year_to, display_name, platform_code,
      safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
      ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
      price_range_max_eur, typical_mileage_range, resale_value_rating,
      catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
    `);
  if (phasesRes.error) throw phasesRes.error;

  // Step 1: find ONE phase row that matches the full brand/model/generation slug, to learn
  // its model_id + generation_code -- the key every sibling phase shares.
  const anchor = (phasesRes.data || []).find((p: any) => {
    const model = p.catalog_models;
    const brand = model?.catalog_brands;
    return (
      slugify(brand?.name) === brandSlug &&
      slugify(model?.name) === modelSlug &&
      slugify(p.generation_code) === generationSlug
    );
  }) as any;
  if (!anchor) return null;

  // Step 2: every phase row sharing that (model_id, generation_code) -- the full sibling set,
  // ordered oldest first so the switcher reads left-to-right chronologically.
  const siblings = (phasesRes.data || [])
    .filter((p: any) => p.catalog_models.id === anchor.catalog_models.id && p.generation_code === anchor.generation_code)
    .sort((a: any, b: any) => (a.year_from ?? 0) - (b.year_from ?? 0));

  return Promise.all(siblings.map((row: any) => fetchBundleForPhase(supabase, row)));
}

// Same generation-sibling resolution as getGenerationBundles above, but starting from a known
// phase id instead of slugs (app/api/db-test/route.ts's GET, which identifies a phase by
// catalog_phases.id the same way /api/detail identifies a legacy vehicle by vehicles.id).
export async function getGenerationBundlesByPhaseId(phaseId: string): Promise<PhaseBundle[] | null> {
  const supabase = client();

  const anchorRes = await supabase
    .from("catalog_phases")
    .select("id, generation_code, model_id")
    .eq("id", phaseId)
    .maybeSingle();
  if (anchorRes.error) throw anchorRes.error;
  if (!anchorRes.data) return null;

  // A NULL generation_code (e.g. Cupra Terramar, seeded with no generation code) can't be
  // matched with .eq() -- PostgREST's eq.null isn't IS NULL. Treat it as having no siblings
  // (same as the single-phase case) rather than mis-querying.
  let siblingsQuery = supabase
    .from("catalog_phases")
    .select(`
      id, generation_code, phase_label, year_from, year_to, display_name, platform_code,
      safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
      ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
      price_range_max_eur, typical_mileage_range, resale_value_rating,
      catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
    `)
    .eq("model_id", anchorRes.data.model_id);
  siblingsQuery = anchorRes.data.generation_code == null
    ? siblingsQuery.is("generation_code", null)
    : siblingsQuery.eq("generation_code", anchorRes.data.generation_code);
  const siblingsRes = await siblingsQuery;
  if (siblingsRes.error) throw siblingsRes.error;

  const siblings = (siblingsRes.data || []).sort((a: any, b: any) => (a.year_from ?? 0) - (b.year_from ?? 0));
  if (siblings.length === 0) return null;

  return Promise.all(siblings.map((row: any) => fetchBundleForPhase(supabase, row as any)));
}

// Id-based lookup (app/api/db-test/route.ts POST, which identifies a phase by
// catalog_phases.id the same way /api/detail identifies a legacy vehicle by
// vehicles.id) -- same phase-row shape as getPhaseBundle above, just resolved
// by primary key instead of slugifying the display columns.
export async function getPhaseBundleById(phaseId: string): Promise<PhaseBundle | null> {
  const supabase = client();

  const phaseRes = await supabase
    .from("catalog_phases")
    .select(
      `
      id, generation_code, phase_label, year_from, year_to, display_name, platform_code,
      safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
      ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
      price_range_max_eur, typical_mileage_range, resale_value_rating,
      catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
      `
    )
    .eq("id", phaseId)
    .maybeSingle();
  if (phaseRes.error) throw phaseRes.error;
  if (!phaseRes.data) return null;

  return fetchBundleForPhase(supabase, phaseRes.data as any);
}

async function fetchBundleForPhase(supabase: ReturnType<typeof client>, phaseRow: any): Promise<PhaseBundle> {
  const phaseId = phaseRow.id;
  const model = phaseRow.catalog_models;
  const brand = model.catalog_brands;

  // Everything scoped to this phase, in parallel -- same Promise.all shape as
  // app/api/cars/route.ts.
  const [bodyDimsRes, configsRes, trimsRes, mediaRes, phaseUnitNotesRes] = await Promise.all([
    supabase
      .from("phase_body_dimensions")
      .select("*, catalog_body_types(id, name)")
      .eq("phase_id", phaseId),
    supabase
      .from("catalog_vehicle_configurations")
      .select(
        `
        id, body_type_id, acceleration_0_100, top_speed_kmh, fuel_consumption_combined,
        fuel_consumption_l100km, energy_consumption_kwh100km,
        co2_emissions_g_km, ev_range_wltp_km,
        catalog_body_types(id, name),
        catalog_engines(id, code, display_name, displacement_cc, power_kw, fuel_type, torque_nm, cylinders, emission_standard, timing_type, engine_oil_capacity_liters, timing_replacement_km, hybrid_type, reliability_rating, pros, cons, oil_change_interval_km, oil_change_interval_months, oil_spec, oil_service_cost_eur_min, oil_service_cost_eur_max, air_filter_interval_km, fuel_filter_interval_km, spark_plug_interval_km, spark_plug_cost_eur_min, spark_plug_cost_eur_max, timing_replacement_years, timing_service_cost_eur_min, timing_service_cost_eur_max, yearly_maintenance_eur_min, yearly_maintenance_eur_max, maintenance_note),
        transmission_units(id, code, family, maker, speeds, reliability_note, maintenance_note, reliability_rating, pros, cons),
        drivetrain_systems(id, code, type, generation, maker, description, reliability_note, maintenance_note, reliability_rating, pros, cons)
        `
      )
      .eq("phase_id", phaseId),
    supabase.from("catalog_trims").select("id, name, tier").eq("phase_id", phaseId),
    supabase
      .from("catalog_media")
      .select("id, body_type_id, image_url, view_angle, is_main, catalog_body_types(id, name)")
      .eq("phase_id", phaseId),
    // catalog_phase_unit_notes may not exist live yet (its migration is review-only, not run)
    // -- same "missing table degrades to no rows" convention as vehicle_safety_features in
    // app/api/detail/route.ts: no .error check, just `.data || []` below.
    supabase.from("catalog_phase_unit_notes").select("unit_id, note").eq("phase_id", phaseId),
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
  // for the whole phase rather than per-config, PLUS this phase's own vehicle-level faults
  // (component_type = 'vehicle', keyed by phase_id, category set -- see
  // 20261009101500_extend_catalog_component_faults_to_4_levels.sql). component_type is no
  // longer just engine/transmission (drivetrain_id and phase_id/vehicle were added later) --
  // this .or() still only fetches engine/unit/vehicle rows, never drivetrain_id ones, since
  // nothing in this bundle currently consumes drivetrain-level faults.
  const engineIds = [...new Set(configRows.map((c: any) => c.catalog_engines?.id).filter(Boolean))];
  const unitIds = [...new Set(configRows.map((c: any) => c.transmission_units?.id).filter(Boolean))];
  const drivetrainIds = [...new Set(configRows.map((c: any) => c.drivetrain_systems?.id).filter(Boolean))];

  // Gearbox / AWD service interval + cost (20261027160000), fetched separately from the main
  // config select ON PURPOSE: those columns may not exist live yet, and naming them in the
  // embedded select would 500 the whole page. Same "missing -> no rows" degrade as
  // catalog_phase_unit_notes above: no .error check, just `.data || []`.
  const SERVICE_COLS = "id, service_interval_km, service_interval_years, service_cost_eur_min, service_cost_eur_max";
  const [unitServiceRes, drivetrainServiceRes] = await Promise.all([
    unitIds.length ? supabase.from("transmission_units").select(SERVICE_COLS).in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
    drivetrainIds.length ? supabase.from("drivetrain_systems").select(SERVICE_COLS).in("id", drivetrainIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  // Two-tier tags (20261102230000) -- separate tolerant queries for the same reason as the
  // service columns: the tables may not exist yet, and a missing table just means "no tags".
  const [phaseTagsRes, configTagsRes] = await Promise.all([
    supabase.from("catalog_phase_tags").select("tag_slug").eq("phase_id", phaseId),
    configIds.length ? supabase.from("catalog_configuration_tags").select("configuration_id, tag_slug").in("configuration_id", configIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const phaseTags = ((phaseTagsRes.data || []) as any[]).map((r) => r.tag_slug as string).filter(isTagSlug).filter(isModelLevel);
  const tagsByConfig = new Map<string, ConfigurationLevelTagSlug[]>();
  for (const r of (configTagsRes.data || []) as any[]) {
    if (!isTagSlug(r.tag_slug) || !isConfigurationLevel(r.tag_slug)) continue;
    tagsByConfig.set(r.configuration_id, [...(tagsByConfig.get(r.configuration_id) ?? []), r.tag_slug]);
  }

  // Dilemma-driven columns (20261104200000-202000) -- fetched with select("*") ON PURPOSE, the
  // same tolerant pattern as SERVICE_COLS above: until those migrations run live the columns
  // simply aren't in the row (-> null below), whereas naming them in the main select would 500
  // the whole page. No .error check, just `.data || []`.
  const [configExtraRes, engineExtraRes, drivetrainExtraRes, phaseExtraRes] = await Promise.all([
    configIds.length ? supabase.from("catalog_vehicle_configurations").select("*").in("id", configIds) : Promise.resolve({ data: [] as any[] }),
    engineIds.length ? supabase.from("catalog_engines").select("*").in("id", engineIds) : Promise.resolve({ data: [] as any[] }),
    drivetrainIds.length ? supabase.from("drivetrain_systems").select("*").in("id", drivetrainIds) : Promise.resolve({ data: [] as any[] }),
    supabase.from("catalog_phases").select("*").eq("id", phaseId).maybeSingle(),
  ]);
  const extras: RowExtras = {
    config: new Map(((configExtraRes.data || []) as any[]).map((r) => [r.id, r])),
    engine: new Map(((engineExtraRes.data || []) as any[]).map((r) => [r.id, r])),
    drivetrain: new Map(((drivetrainExtraRes.data || []) as any[]).map((r) => [r.id, r])),
    phase: (phaseExtraRes.data as any) ?? {},
  };

  const serviceById = new Map<string, UnitService>();
  for (const r of [...(unitServiceRes.data || []), ...(drivetrainServiceRes.data || [])] as any[]) {
    serviceById.set(r.id, unitService(r));
  }

  const orParts: string[] = [`phase_id.eq.${phaseId}`];
  if (engineIds.length) orParts.push(`engine_id.in.(${engineIds.join(",")})`);
  if (unitIds.length) orParts.push(`unit_id.in.(${unitIds.join(",")})`);
  const faultsRes = await supabase
    .from("catalog_component_faults")
    .select("*")
    .or(orParts.join(","));
  if (faultsRes.error) throw faultsRes.error;
  const faultRows = faultsRes.data || [];

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
    mediaRes.data || [],
    phaseUnitNotesRes.data || [],
    serviceById,
    phaseTags,
    tagsByConfig,
    extras
  );
}

// Full raw rows (select("*")) of the configurations / engines / drivetrain systems / phase,
// keyed by id -- the source of every column the main embedded select does not name.
interface RowExtras {
  config: Map<string, any>;
  engine: Map<string, any>;
  drivetrain: Map<string, any>;
  phase: any;
}

// undefined (column not live yet) and null (not filled) both read as null.
function numOrNull(v: unknown): number | null {
  return v == null ? null : Number(v);
}
function boolOrNull(v: unknown): boolean | null {
  return v == null ? null : Boolean(v);
}
function strOrNull(v: unknown): string | null {
  return v == null ? null : String(v);
}

// EV / hybrid powertrain block of one raw catalog_engines row (20261105150000). battery_kwh is the
// column's name before that migration renames it -- read either, so the page works on both sides.
function engineEv(row: any): EnginePowertrainEv {
  return {
    batteryCapacityNetKwh: numOrNull(row?.battery_capacity_net_kwh ?? row?.battery_kwh),
    maxAcChargingKw: numOrNull(row?.max_ac_charging_kw),
    maxDcChargingKw: numOrNull(row?.max_dc_charging_kw),
    batteryThermalManagement: strOrNull(row?.battery_thermal_management),
    heatPump: strOrNull(row?.heat_pump),
  };
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
  mediaRows: any[],
  phaseUnitNoteRows: any[],
  serviceById: Map<string, UnitService>,
  phaseTags: ModelLevelTagSlug[],
  tagsByConfig: Map<string, ConfigurationLevelTagSlug[]>,
  extras: RowExtras
): PhaseBundle {
  const noteByUnit = new Map<string, string>(phaseUnitNoteRows.map((n) => [n.unit_id, n.note]));
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
    noseWeightKg: numOrNull(d.nose_weight_kg),
    roofLoadKg: numOrNull(d.roof_load_kg),
    approachAngleDeg: numOrNull(d.approach_angle_deg),
    departureAngleDeg: numOrNull(d.departure_angle_deg),
    breakoverAngleDeg: numOrNull(d.breakover_angle_deg),
    wadingDepthMm: numOrNull(d.wading_depth_mm),
    isofixCount: numOrNull(d.isofix_count),
    isofixFrontPassenger: boolOrNull(d.isofix_front_passenger),
    seatsOptionalMax: numOrNull(d.seats_optional_max),
    bootCapacity7SeatsLiters: numOrNull(d.boot_capacity_7_seats_liters),
    bootSillHeightMm: numOrNull(d.boot_sill_height_mm),
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
      reliabilityRating: c.catalog_engines.reliability_rating,
      pros: c.catalog_engines.pros ?? [],
      cons: c.catalog_engines.cons ?? [],
      maintenance: engineMaintenance(c.catalog_engines),
      hasDpf: boolOrNull(extras.engine.get(c.catalog_engines.id)?.has_dpf),
      hasGpf: boolOrNull(extras.engine.get(c.catalog_engines.id)?.has_gpf),
      // has_adblue was has_scr until 20261104210000 -- read either, so the page works on both sides of that rename.
      hasAdblue: boolOrNull(extras.engine.get(c.catalog_engines.id)?.has_adblue ?? extras.engine.get(c.catalog_engines.id)?.has_scr),
      injectionType: strOrNull(extras.engine.get(c.catalog_engines.id)?.injection_type),
      timingBeltInOil: boolOrNull(extras.engine.get(c.catalog_engines.id)?.timing_belt_in_oil),
      ev: engineEv(extras.engine.get(c.catalog_engines.id)),
    },
    gearbox: {
      id: c.transmission_units.id,
      code: c.transmission_units.code,
      family: c.transmission_units.family,
      maker: c.transmission_units.maker,
      speeds: c.transmission_units.speeds,
      reliabilityNote: c.transmission_units.reliability_note,
      reliabilityRating: c.transmission_units.reliability_rating,
      pros: c.transmission_units.pros ?? [],
      cons: c.transmission_units.cons ?? [],
      phaseNote: noteByUnit.get(c.transmission_units.id) ?? null,
      maintenanceNote: c.transmission_units.maintenance_note,
      service: serviceById.get(c.transmission_units.id) ?? EMPTY_UNIT_SERVICE,
    },
    drivetrain: c.drivetrain_systems
      ? {
          id: c.drivetrain_systems.id,
          code: c.drivetrain_systems.code,
          type: c.drivetrain_systems.type,
          generation: c.drivetrain_systems.generation,
          maker: c.drivetrain_systems.maker,
          description: c.drivetrain_systems.description,
          reliabilityNote: c.drivetrain_systems.reliability_note,
          maintenanceNote: c.drivetrain_systems.maintenance_note,
          reliabilityRating: c.drivetrain_systems.reliability_rating,
          pros: c.drivetrain_systems.pros ?? [],
          cons: c.drivetrain_systems.cons ?? [],
          service: serviceById.get(c.drivetrain_systems.id) ?? EMPTY_UNIT_SERVICE,
          hasLowRange: boolOrNull(extras.drivetrain.get(c.drivetrain_systems.id)?.has_low_range),
          centerDiffLock: boolOrNull(extras.drivetrain.get(c.drivetrain_systems.id)?.center_diff_lock),
          rearDiffLock: boolOrNull(extras.drivetrain.get(c.drivetrain_systems.id)?.rear_diff_lock),
          frontDiffLock: boolOrNull(extras.drivetrain.get(c.drivetrain_systems.id)?.front_diff_lock),
        }
      : null,
    acceleration0To100: c.acceleration_0_100,
    topSpeedKmh: c.top_speed_kmh,
    fuelConsumptionCombined: c.fuel_consumption_combined,
    fuelConsumptionL100km: c.fuel_consumption_l100km,
    energyConsumptionKwh100km: c.energy_consumption_kwh100km,
    co2EmissionsGKm: c.co2_emissions_g_km,
    evRangeWltpKm: c.ev_range_wltp_km,
    drivenAxle: strOrNull(extras.config.get(c.id)?.driven_axle),
    secondaryFuelType: strOrNull(extras.config.get(c.id)?.secondary_fuel_type),
    secondaryConsumptionL100km: numOrNull(extras.config.get(c.id)?.secondary_consumption_l100km),
    consumptionCycle: strOrNull(extras.config.get(c.id)?.consumption_cycle),
    fuelConsumptionUrbanL100km: numOrNull(extras.config.get(c.id)?.fuel_consumption_urban_l100km),
    fuelConsumptionExtraUrbanL100km: numOrNull(extras.config.get(c.id)?.fuel_consumption_extra_urban_l100km),
    towingBrakedKg: numOrNull(extras.config.get(c.id)?.towing_braked_kg),
    towingUnbrakedKg: numOrNull(extras.config.get(c.id)?.towing_unbraked_kg),
    curbWeightKg: numOrNull(extras.config.get(c.id)?.curb_weight_kg),
    tireSizes: tireSizesByConfig.get(c.id) ?? [],
    tags: tagsByConfig.get(c.id) ?? [],
  }));

  const featuresByTrim = new Map<string, { feature: string; isOptional: boolean; featureGroup: string | null; safetyFeatureSlug: string | null }[]>();
  for (const f of trimFeatureRows) {
    const list = featuresByTrim.get(f.trim_id) ?? [];
    list.push({ feature: f.feature, isOptional: f.is_optional, featureGroup: f.feature_group ?? null, safetyFeatureSlug: f.safety_feature_slug ?? null });
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
    drivetrainId: f.drivetrain_id,
    phaseId: f.phase_id,
    category: f.category,
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
    phaseId: phaseRow.id,
    modelId: model.id,
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
    chassisType: strOrNull(extras.phase.chassis_type),
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
    tags: phaseTags,
  };
}

// catalog_engines maintenance columns -> EngineMaintenance. numeric/integer columns can arrive
// as strings from PostgREST for numeric types, so every number goes through num().
function engineMaintenance(e: any): EngineMaintenance {
  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  return {
    oilChangeIntervalKm: num(e.oil_change_interval_km),
    oilChangeIntervalMonths: num(e.oil_change_interval_months),
    oilSpec: e.oil_spec ?? null,
    oilServiceCostEurMin: num(e.oil_service_cost_eur_min),
    oilServiceCostEurMax: num(e.oil_service_cost_eur_max),
    airFilterIntervalKm: num(e.air_filter_interval_km),
    fuelFilterIntervalKm: num(e.fuel_filter_interval_km),
    sparkPlugIntervalKm: num(e.spark_plug_interval_km),
    sparkPlugCostEurMin: num(e.spark_plug_cost_eur_min),
    sparkPlugCostEurMax: num(e.spark_plug_cost_eur_max),
    timingReplacementYears: num(e.timing_replacement_years),
    timingServiceCostEurMin: num(e.timing_service_cost_eur_min),
    timingServiceCostEurMax: num(e.timing_service_cost_eur_max),
    yearlyMaintenanceEurMin: num(e.yearly_maintenance_eur_min),
    yearlyMaintenanceEurMax: num(e.yearly_maintenance_eur_max),
    note: e.maintenance_note ?? null,
  };
}

// Raw transmission_units / drivetrain_systems service_* row -> UnitService (Number() since
// smallint/integer can arrive as strings through some PostgREST paths, same as engineMaintenance).
function unitService(r: any): UnitService {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    intervalKm: n(r.service_interval_km),
    intervalYears: n(r.service_interval_years),
    costEurMin: n(r.service_cost_eur_min),
    costEurMax: n(r.service_cost_eur_max),
  };
}
