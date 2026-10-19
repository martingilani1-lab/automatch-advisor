import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getGenerationBundlesByPhaseId } from "@/app/catalog/lib/db";
import type { PhaseBundle } from "@/app/catalog/lib/types";
import { groupByGearbox, groupConfigurations } from "@/app/catalog/lib/groupConfigurations";
import { resolveBodyTile } from "@/app/db-test/lib/filters";
import type {
  DetailData,
  DetailDrivetrainGroup,
  DetailEngine,
  DetailGearboxGroup,
  DetailPhase,
  DetailResponse,
  DimensionsByBody,
} from "@/app/db-test/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Same map as ORIGIN_FLAGS in app/api/cars/route.ts -- small pure lookup, intentionally
// duplicated rather than shared (matches that file's own convention for this exact map).
const ORIGIN_FLAGS: Record<string, string> = {
  german: "\u{1F1E9}\u{1F1EA}", japanese: "\u{1F1EF}\u{1F1F5}", korean: "\u{1F1F0}\u{1F1F7}",
  french: "\u{1F1EB}\u{1F1F7}", czech: "\u{1F1E8}\u{1F1FF}", italian: "\u{1F1EE}\u{1F1F9}",
  swedish: "\u{1F1F8}\u{1F1EA}", british: "\u{1F1EC}\u{1F1E7}", american: "\u{1F1FA}\u{1F1F8}",
  chinese: "\u{1F1E8}\u{1F1F3}", romanian: "\u{1F1F7}\u{1F1F4}", spanish: "\u{1F1EA}\u{1F1F8}",
};

// Same scale/words as scripts/fill/engine-import-resolve.mjs's RELIABILITY_MAP, reversed --
// transmission_units/catalog_engines/drivetrain_systems.reliability_rating is a smallint 1-5,
// display and import agree on what "4" means. Moved up here (was declared further down, right
// by the detail-POST code that originated this map) so buildCarFromCatalog's own reliability
// computation below can use the same word scale rather than inventing a second one.
const RELIABILITY_LABELS: Record<number, string> = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Below Average", 1: "Poor" };

function yearsLabel(yearFrom: number | null, yearTo: number | null): string {
  if (!yearFrom) return "";
  return yearTo ? `${yearFrom} - ${yearTo}` : `${yearFrom} - Present`;
}

// ════════════════════════════════════════════════════════════
// GET — one card per catalog_phases row, built from a bulk fetch of every
// phase/body-dimension/config/trim row, the same bulk-then-group-in-JS shape
// as app/api/cars/route.ts (vehicles+engines+transmissions there).
// ════════════════════════════════════════════════════════════

// catalog_media is phase-wide (no single body "owns" the car-list thumbnail) -- prefer the
// row explicitly flagged is_main, else the first 'front' angle, else whatever exists. Mirrors
// the same preference order the vehicle-page header uses for its own main image.
function pickMainImageUrl(media: any[]): string | null {
  if (media.length === 0) return null;
  const main = media.find((m) => m.is_main);
  if (main) return main.image_url;
  const front = media.find((m) => m.view_angle === "front");
  if (front) return front.image_url;
  return media[0].image_url;
}

function buildCarFromCatalog(phase: any, bodyDims: any[], configs: any[], trims: any[], media: any[]) {
  const model = phase.catalog_models;
  const brand = model.catalog_brands;

  const modelLabel = [
    model.name,
    phase.generation_code ? `(${phase.generation_code})` : null,
    phase.phase_label || null,
  ].filter(Boolean).join(" ");

  const years = yearsLabel(phase.year_from, phase.year_to);

  const primaryBody = bodyDims[0]?.catalog_body_types?.name || "";
  // Every distinct body type this phase is offered in (not just the first/primary one) --
  // CarRow.tsx's car-list widget shows all of them now, `body`/primaryBody above stays as the
  // single value other call sites (the vehicle-page hero, pickMainImageUrl's body matching)
  // already depend on.
  const bodyNames = [...new Set(bodyDims.map((d) => d.catalog_body_types?.name).filter(Boolean))];
  const categories = [...new Set(
    bodyDims
      .map((d) => resolveBodyTile(d.catalog_body_types?.name || ""))
      .filter((t): t is string => t !== null)
  )];
  if (bodyDims.some((d) => resolveBodyTile(d.catalog_body_types?.name || "") === null)) {
    console.warn(`[/api/db-test] unmapped catalog_body_types name for phase ${phase.id}`);
  }

  const fuelTypes = [...new Set(configs.map((c) => (c.catalog_engines?.fuel_type || "").toLowerCase()).filter(Boolean))];
  const hasAWD = configs.some((c) => c.drivetrain_systems != null);
  const hasFWD = configs.some((c) => c.drivetrain_systems == null);
  const drivetrains = [...(hasAWD ? ["AWD"] : []), ...(hasFWD ? ["FWD"] : [])];
  // Named AWD system per config (quattro, Haldex gen, xDrive...) -- CarRow.tsx tags these by
  // name when present, distinct from the plain AWD/FWD flags above. generation is preferred
  // over code, same fallback order as configDisplay.ts's drivetrainLabel.
  const drivetrainSystemNames = [...new Set(
    configs.map((c) => c.drivetrain_systems?.generation ?? c.drivetrain_systems?.code).filter(Boolean)
  )];

  // fuel_consumption_combined is confirmed 0%-filled across all 1550 catalog_vehicle_
  // configurations rows (see app/catalog/lib/configDisplay.ts's own comment) -- a dead column
  // from an earlier, unfinished pass. fuel_consumption_l100km is the one that's actually
  // filled; energy_consumption_kwh100km covers the PHEV/electric rows, same priority order
  // configDisplay.ts's consumptionLabel already uses. avgConsumption/consumptionByFuel below
  // read the dead column before this fix -- silently always null, never caught because
  // CarRow.tsx never displayed either one.
  function configConsumptionValue(c: any): number | null {
    const ft = (c.catalog_engines?.fuel_type || "").toLowerCase();
    if (ft === "electric") {
      return c.energy_consumption_kwh100km != null ? Number(c.energy_consumption_kwh100km) : null;
    }
    if (c.fuel_consumption_l100km != null) return Number(c.fuel_consumption_l100km);
    if (c.energy_consumption_kwh100km != null) return Number(c.energy_consumption_kwh100km);
    return null;
  }

  const consumptions = configs.map(configConsumptionValue).filter((n): n is number => n != null && n > 0);
  const avgConsumption = consumptions.length ? Math.round((consumptions.reduce((a, b) => a + b, 0) / consumptions.length) * 10) / 10 : null;
  // Min/max across every config, not split by fuel type (unlike consumptionByFuel below) --
  // CarRow.tsx's car-list widget shows one overall range per model, e.g. "4.5 - 10.5 l/100 km".
  const minConsumption = consumptions.length ? Math.min(...consumptions) : null;
  const maxConsumption = consumptions.length ? Math.max(...consumptions) : null;

  const consumptionByFuel = (() => {
    const m: Record<string, { sum: number; n: number }> = {};
    configs.forEach((c) => {
      const ft = (c.catalog_engines?.fuel_type || "").toLowerCase();
      const val = configConsumptionValue(c);
      if (!ft || !val) return;
      if (!m[ft]) m[ft] = { sum: 0, n: 0 };
      m[ft].sum += val; m[ft].n += 1;
    });
    const out: Record<string, number> = {};
    Object.keys(m).forEach((k) => { out[k] = Math.round((m[k].sum / m[k].n) * 10) / 10; });
    return Object.keys(out).length ? out : null;
  })();

  // Best engine reliability tier among this phase's configs -- same "optimistic for multi-
  // engine models" convention as the legacy schema's bestRel (CLAUDE.md's own Known Issues
  // entry), chosen for consistency with how the rest of the app already summarizes a multi-
  // engine model's reliability into one word, not a new methodology. "—" (never a guessed
  // tier) when no config's engine has a reliability_rating at all.
  const bestEngineReliabilityRating = configs.reduce((best: number | null, c) => {
    const r = c.catalog_engines?.reliability_rating;
    return r != null && (best == null || r > best) ? r : best;
  }, null);
  const overallReliability = bestEngineReliabilityRating != null ? RELIABILITY_LABELS[bestEngineReliabilityRating] ?? "—" : "—";

  const powerByFuel = (() => {
    const m: Record<string, number> = {};
    configs.forEach((c) => {
      const ft = (c.catalog_engines?.fuel_type || "").toLowerCase();
      const val = Number(c.catalog_engines?.power_kw);
      if (!ft || !val) return;
      if (!m[ft] || val > m[ft]) m[ft] = val;
    });
    return Object.keys(m).length ? m : null;
  })();

  const engineIds = new Set(configs.map((c) => c.catalog_engines?.id).filter(Boolean));
  const unitIds = new Set(configs.map((c) => c.transmission_units?.id).filter(Boolean));

  const fuelTankLiters = Math.max(0, ...bodyDims.map((d) => Number(d.fuel_tank_capacity_liters) || 0)) || null;

  return {
    id: phase.id,
    make: brand.name,
    model: modelLabel,
    phaseLabel: phase.phase_label || null,
    mainImageUrl: pickMainImageUrl(media),
    gen: years,
    years,
    yearTo: phase.year_to ?? undefined,
    engineCount: engineIds.size,
    transmissionCount: unitIds.size,
    body: primaryBody,
    bodyNames,
    segment: model.segment || "",
    fuel: fuelTypes.length > 0 ? fuelTypes : [],
    seats: bodyDims[0]?.seats_count ?? undefined,
    boot: bodyDims[0]?.boot_capacity_liters ?? null,
    bootMax: bodyDims[0]?.boot_max_liters ?? null,
    origin: model.origin_country || "",
    originFlag: ORIGIN_FLAGS[model.origin_country || ""] || "\u{1F30D}",
    towingCapacity: phase.towing_capacity_kg ?? null,
    groundClearance: bodyDims[0]?.ground_clearance_mm ?? null,
    length: bodyDims[0]?.length_mm ?? null,
    width: bodyDims[0]?.width_mm ?? null,
    height: bodyDims[0]?.height_mm ?? null,
    weight: bodyDims[0]?.curb_weight_kg ?? null,
    hasAWD,
    drivetrains,
    drivetrainSystemNames,
    avgConsumption,
    minConsumption,
    maxConsumption,
    fuelTankLiters,
    resaleValue: phase.resale_value_rating ?? null,
    bodyVariants: null,
    buyingTip: "",
    // One entry per config, undeduped -- matches app/api/cars/route.ts's own
    // `vTrans.map(...)` (one entry per transmissions ROW, not deduped); the
    // db-test gearbox classifier (classifyGearboxTypes) dedupes when reading it.
    transmissions: configs.map((c) => c.transmission_units?.family || "").filter(Boolean),
    consumptionByFuel,
    powerByFuel,
    pricing: {
      skPriceMin: phase.price_range_min_eur,
      skPriceMax: phase.price_range_max_eur,
      euPriceMin: phase.price_range_min_eur,
      euPriceMax: phase.price_range_max_eur,
      mileageAtMidBudget: phase.typical_mileage_range || "",
    },
    reliability: { overall: overallReliability, repairCost: "—" },
    safety: {
      stars: phase.safety_rating,
      adultOccupant: phase.ncap_adult_pct,
      childOccupant: phase.ncap_child_pct,
      pedestrian: phase.ncap_pedestrian_pct,
      safetyAssist: phase.ncap_safety_assist_pct,
      ncapYear: phase.ncap_year,
    },
    equipment: trims.map((t: any) => ({
      trim: t.name,
      features: (t.features || []).map((f: any) => f.feature),
    })),
    pros: [],
    cons: [],
    maxPowerKw: configs.length > 0 ? Math.max(...configs.map((c) => c.catalog_engines?.power_kw || 0)) : null,
    minPowerKw: configs.length > 0
      ? Math.min(...configs.filter((c) => (c.catalog_engines?.power_kw || 0) > 0).map((c) => c.catalog_engines.power_kw))
      : null,
    categories,
  };
}

// Supabase enforces a hard 1000-row cap PER REQUEST server-side (the project's "max rows"
// setting) -- a single call's own `.range(0, 9999)` does NOT lift this; it's still capped at
// 1000, silently, with no error. Confirmed live: catalog_vehicle_configurations alone holds
// 1550 rows today. The only fix is real pagination -- repeat the request advancing `.range()`
// by 1000 each time until a page comes back short. Same "looks fine, quietly wrong" Supabase
// page-cap failure mode as the embedded-filter bug found earlier in the MQB Evo audit, not a
// hypothetical -- applied to all 4 bulk queries below for the same reason, not just the one
// table that's over 1000 rows today.
async function fetchAllRows<T>(table: string, select: string): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data as T[]) || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function GET() {
  try {
    const [phasesData, bodyDims, configs, trimsData, mediaData] = await Promise.all([
      fetchAllRows<any>("catalog_phases", `
        id, generation_code, phase_label, year_from, year_to, platform_code,
        safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
        ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
        price_range_max_eur, typical_mileage_range, resale_value_rating,
        catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
      `),
      fetchAllRows<any>("phase_body_dimensions", "*, catalog_body_types(id, name)"),
      fetchAllRows<any>("catalog_vehicle_configurations", `
        id, phase_id, fuel_consumption_l100km, energy_consumption_kwh100km,
        catalog_engines(id, power_kw, fuel_type, reliability_rating),
        transmission_units(id, family),
        drivetrain_systems(id, code, generation, maker, type)
      `),
      fetchAllRows<any>("catalog_trims", "id, phase_id, name, catalog_trim_features(feature)"),
      fetchAllRows<any>("catalog_media", "phase_id, body_type_id, image_url, view_angle, is_main"),
    ]);

    const trims = trimsData.map((t: any) => ({
      ...t,
      features: (t.catalog_trim_features || []).map((f: any) => ({ feature: f.feature })),
    }));

    const cars = phasesData.map((phase: any) =>
      buildCarFromCatalog(
        phase,
        bodyDims.filter((d: any) => d.phase_id === phase.id),
        configs.filter((c: any) => c.phase_id === phase.id),
        trims.filter((t: any) => t.phase_id === phase.id),
        mediaData.filter((m: any) => m.phase_id === phase.id)
      )
    );

    return NextResponse.json(cars);
  } catch (err) {
    console.error("[/api/db-test GET]", err);
    return NextResponse.json([], { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════
// POST — per-phase detail, reusing the already-built app/catalog/lib/db.ts
// query layer (getPhaseBundleById) and reshaping its PhaseBundle into the
// DetailData shape app/db-test/CarDetail.tsx (copied from Prehľad) expects.
// ════════════════════════════════════════════════════════════

const SEVERITY_LABELS: Record<string, string> = { critical: "Critical", moderate: "Moderate", minor: "Minor" };

// Builds one phase's full DetailData from its PhaseBundle -- the exact same transform the
// single-phase POST used to run inline, now reused once per sibling phase (vehicle page
// redesign step 1: every phase of the generation is transformed and returned in one
// response, so switching phases client-side needs no refetch).
function buildDetailData(bundle: PhaseBundle): DetailData {
    // Engines tab: one widget per distinct engine -- groupConfigurations() does the body x
    // drivetrain x engine x gearbox collapsing so an engine doesn't render once per
    // body/drivetrain combination. Gearboxes are a separate, independent section below (g),
    // not nested here -- the same gearbox can be paired with several different engines, so
    // its own rating/pros/cons/faults/notes describe the unit, not any one engine pairing.
    const engineGroups = groupConfigurations(bundle.configs);
    const e: DetailEngine[] = engineGroups.map((group) => {
      const engine = group.engine;
      const isEv = engine.fuelType === "electric" || group.configs.some(
        (c) => c.batteryCapacityNetKwh != null || c.evRangeWltpKm != null
      );
      return {
        // Display-only convention: "<display_name> (<code>) <power_kw> kW", same as
        // Browse & Compare's own engine labels -- never falls back to the em-dash form,
        // and never changes display_name itself (display-only, per the request this
        // formatting was added under).
        engine: engine.displayName ? `${engine.displayName} (${engine.code}) ${engine.powerKw} kW` : `${engine.code} ${engine.powerKw} kW`,
        fuel_type: engine.fuelType,
        power_kw: engine.powerKw,
        displacement_cc: engine.displacementCc,
        torque_nm: engine.torqueNm,
        cylinders: engine.cylinders,
        is_ev: isEv,
        id: engine.id,
        reliability: engine.reliabilityRating != null ? RELIABILITY_LABELS[engine.reliabilityRating] ?? "—" : "—",
        faults: bundle.faults
          .filter((f) => f.engineId === engine.id)
          .map((f) => ({ fault: f.fault, severity: f.severity })),
        pros: engine.pros,
        cons: engine.cons,
        bodyNames: group.bodyNames,
      };
    });

    // Gearboxes tab: one widget per distinct gearbox, independent of which engine(s) use it.
    const gearboxGroups = groupByGearbox(bundle.configs);
    const g: DetailGearboxGroup[] = gearboxGroups.map((gg) => ({
      id: gg.gearbox.id,
      code: gg.gearbox.code,
      family: gg.gearbox.family,
      speeds: gg.gearbox.speeds,
      reliability: gg.gearbox.reliabilityRating != null ? RELIABILITY_LABELS[gg.gearbox.reliabilityRating] ?? "—" : "—",
      reliability_note: gg.gearbox.reliabilityNote,
      maintenance_note: gg.gearbox.maintenanceNote,
      pros: gg.gearbox.pros,
      cons: gg.gearbox.cons,
      phase_note: gg.gearbox.phaseNote,
      faults: bundle.faults
        .filter((f) => f.unitId === gg.gearbox.id)
        .map((f) => ({ fault: f.fault, severity: f.severity })),
      bodyNames: gg.bodyNames,
      drivetrainLabels: gg.drivetrainLabels,
      engineNames: gg.engineNames,
    }));

    // Drivetrain-system tab: a drivetrain system is a real, standalone component independent
    // of any one engine/gearbox pairing (the same Haldex unit can sit behind several
    // different gearboxes), so it stays its own top-level group rather than nested under an
    // engine/gearbox -- `variants` is the distinct gearbox codes it's actually paired with.
    const drivetrainGroupsByCode = new Map<string, DetailDrivetrainGroup>();
    for (const cfg of bundle.configs) {
      if (!cfg.drivetrain) continue;
      const existing = drivetrainGroupsByCode.get(cfg.drivetrain.code);
      if (existing) {
        if (!existing.variants.includes(cfg.gearbox.code)) existing.variants.push(cfg.gearbox.code);
      } else {
        drivetrainGroupsByCode.set(cfg.drivetrain.code, {
          system: {
            id: cfg.drivetrain.id,
            code: cfg.drivetrain.code,
            type: cfg.drivetrain.type,
            generation: cfg.drivetrain.generation,
            maker: cfg.drivetrain.maker,
            description: null,
            reliability: cfg.drivetrain.reliabilityRating != null ? RELIABILITY_LABELS[cfg.drivetrain.reliabilityRating] ?? "—" : "—",
            reliability_note: cfg.drivetrain.reliabilityNote,
            maintenance_note: null,
            pros: cfg.drivetrain.pros,
            cons: cfg.drivetrain.cons,
          },
          variants: [cfg.gearbox.code],
        });
      }
    }
    const dt: DetailDrivetrainGroup[] = [...drivetrainGroupsByCode.values()];

    // Common faults tab: the same catalog_component_faults rows shown inline above,
    // consolidated with a readable "area" label resolved back to the engine/gearbox they
    // belong to (component_faults itself has no area column).
    const engineLabelById = new Map(bundle.configs.map((c) => [c.engine.id, c.engine.displayName || c.engine.code]));
    const gearboxLabelById = new Map(bundle.configs.map((c) => [c.gearbox.id, c.gearbox.code]));
    const c = bundle.faults.map((f) => ({
      area: f.engineId ? (engineLabelById.get(f.engineId) ?? "Engine") : (gearboxLabelById.get(f.unitId!) ?? "Gearbox"),
      severity: SEVERITY_LABELS[f.severity || ""] || f.severity || "Moderate",
      detail: f.fault,
    }));

    const q = bundle.trims.map((trim) => ({
      trim: trim.name,
      features: trim.features.map((f) => f.feature).join(" · "),
    }));

    const firstBody = bundle.bodyDimensions[0];
    const specs = firstBody
      ? {
          towingCapacity: bundle.towingCapacityKg,
          groundClearance: firstBody.groundClearanceMm,
          length: firstBody.lengthMm,
          width: firstBody.widthMm,
          height: firstBody.heightMm,
          weight: firstBody.curbWeightKg,
          bootMax: firstBody.bootMaxLiters,
          resaleValue: bundle.resaleValueRating,
          bodyVariants: null,
        }
      : emptySpecs();

    const dims: DimensionsByBody[] = bundle.bodyDimensions.map((d) => ({
      bodyName: d.bodyName,
      length: d.lengthMm,
      width: d.widthMm,
      height: d.heightMm,
      groundClearance: d.groundClearanceMm,
      curbWeight: d.curbWeightKg,
      bootCapacity: d.bootCapacityLiters,
      bootMax: d.bootMaxLiters,
      grossVehicleWeight: d.grossVehicleWeightKg,
      payload: d.payloadKg,
      fuelTank: d.fuelTankCapacityLiters,
      seats: d.seatsCount,
    }));

    return {
      e, g, dt, c, pros: [], cons: [], q,
      b: "Check full service history and verify mileage.",
      specs, dims,
      // Passed through unchanged -- see DetailData.configs/.media's own comments in
      // db-test/types.ts.
      configs: bundle.configs,
      media: bundle.media,
    };
}

export async function POST(req: NextRequest) {
  try {
    const { vehicleId } = await req.json();
    // Loads every phase of the requested phase's generation (vehicle page redesign step 1's
    // phase switcher) in one fetch, so switching phases in the detail panel is pure client
    // state -- see DbTestView.tsx, which merges every returned phase into its detail cache.
    const bundles = await getGenerationBundlesByPhaseId(vehicleId);

    if (!bundles || bundles.length === 0) {
      const empty: DetailResponse = { phases: [] };
      return NextResponse.json(empty);
    }

    const result: DetailResponse = {
      phases: bundles.map((bundle): DetailPhase => ({
        phaseId: bundle.phaseId,
        phaseLabel: bundle.phaseLabel,
        yearFrom: bundle.yearFrom,
        yearTo: bundle.yearTo,
        detail: buildDetailData(bundle),
      })),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/db-test POST]", err);
    const empty: DetailResponse = { phases: [] };
    return NextResponse.json(empty, { status: 500 });
  }
}

function emptySpecs() {
  return {
    towingCapacity: null, groundClearance: null, length: null, width: null,
    height: null, weight: null, bootMax: null, resaleValue: null, bodyVariants: null,
  };
}
