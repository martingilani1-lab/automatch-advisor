import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getPhaseBundleById } from "@/app/catalog/lib/db";
import { resolveBodyTile } from "@/app/db-test/lib/filters";
import type {
  DetailData,
  DetailEngine,
  DetailTransmission,
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

function yearsLabel(yearFrom: number | null, yearTo: number | null): string {
  if (!yearFrom) return "";
  return yearTo ? `${yearFrom} - ${yearTo}` : `${yearFrom} - Present`;
}

// ════════════════════════════════════════════════════════════
// GET — one card per catalog_phases row, built from a bulk fetch of every
// phase/body-dimension/config/trim row, the same bulk-then-group-in-JS shape
// as app/api/cars/route.ts (vehicles+engines+transmissions there).
// ════════════════════════════════════════════════════════════

function buildCarFromCatalog(phase: any, bodyDims: any[], configs: any[], trims: any[]) {
  const model = phase.catalog_models;
  const brand = model.catalog_brands;

  const modelLabel = [
    model.name,
    phase.generation_code ? `(${phase.generation_code})` : null,
    phase.phase_label || null,
  ].filter(Boolean).join(" ");

  const years = yearsLabel(phase.year_from, phase.year_to);

  const primaryBody = bodyDims[0]?.catalog_body_types?.name || "";
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

  const consumptions = configs.map((c) => Number(c.fuel_consumption_combined)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgConsumption = consumptions.length ? Math.round((consumptions.reduce((a, b) => a + b, 0) / consumptions.length) * 10) / 10 : null;

  const consumptionByFuel = (() => {
    const m: Record<string, { sum: number; n: number }> = {};
    configs.forEach((c) => {
      const ft = (c.catalog_engines?.fuel_type || "").toLowerCase();
      const val = Number(c.fuel_consumption_combined);
      if (!ft || !val) return;
      if (!m[ft]) m[ft] = { sum: 0, n: 0 };
      m[ft].sum += val; m[ft].n += 1;
    });
    const out: Record<string, number> = {};
    Object.keys(m).forEach((k) => { out[k] = Math.round((m[k].sum / m[k].n) * 10) / 10; });
    return Object.keys(out).length ? out : null;
  })();

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
    gen: years,
    years,
    yearTo: phase.year_to ?? undefined,
    engineCount: engineIds.size,
    transmissionCount: unitIds.size,
    body: primaryBody,
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
    avgConsumption,
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
    // No reliability-tier column exists anywhere in catalog_engines/transmission_units --
    // "—" literally, never a guessed tier (CLAUDE.md "NULL over invention").
    reliability: { overall: "—", repairCost: "—" },
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
    const [phasesData, bodyDims, configs, trimsData] = await Promise.all([
      fetchAllRows<any>("catalog_phases", `
        id, generation_code, phase_label, year_from, year_to, platform_code,
        safety_rating, ncap_year, ncap_adult_pct, ncap_child_pct, ncap_pedestrian_pct,
        ncap_safety_assist_pct, towing_capacity_kg, avg_market_price_eur, price_range_min_eur,
        price_range_max_eur, typical_mileage_range, resale_value_rating,
        catalog_models!inner(id, name, segment, origin_country, catalog_brands!inner(id, name))
      `),
      fetchAllRows<any>("phase_body_dimensions", "*, catalog_body_types(id, name)"),
      fetchAllRows<any>("catalog_vehicle_configurations", `
        id, phase_id, fuel_consumption_combined,
        catalog_engines(id, power_kw, fuel_type),
        transmission_units(id, family),
        drivetrain_systems(id)
      `),
      fetchAllRows<any>("catalog_trims", "id, phase_id, name, catalog_trim_features(feature)"),
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
        trims.filter((t: any) => t.phase_id === phase.id)
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

export async function POST(req: NextRequest) {
  try {
    const { vehicleId } = await req.json();
    const bundle = await getPhaseBundleById(vehicleId);

    if (!bundle) {
      const empty: DetailData = { e: [], t: [], c: [], pros: [], cons: [], q: [], b: "", specs: emptySpecs(), dims: [] };
      return NextResponse.json(empty);
    }

    // Engines tab: one row per distinct engine (several configs can share the same engine
    // across gearboxes/bodies) -- mirrors the legacy schema's one-row-per-real-engine shape.
    const engineGroups = new Map<string, typeof bundle.configs>();
    for (const c of bundle.configs) {
      const list = engineGroups.get(c.engine.id) ?? [];
      list.push(c);
      engineGroups.set(c.engine.id, list);
    }
    const e: DetailEngine[] = [...engineGroups.values()].map((group) => {
      const engine = group[0].engine;
      const cons = group.map((c) => c.fuelConsumptionCombined).filter((n): n is number => n != null);
      const battery = group.map((c) => c.batteryCapacityNetKwh).filter((n): n is number => n != null);
      const range = group.map((c) => c.evRangeWltpKm).filter((n): n is number => n != null);
      return {
        engine: engine.displayName || `${engine.code} — ${engine.powerKw} kW`,
        fuel_type: engine.fuelType,
        power_kw: engine.powerKw,
        displacement_cc: engine.displacementCc,
        torque_nm: engine.torqueNm,
        drivetrain: group.some((c) => c.drivetrain != null) ? "AWD" : "FWD",
        consumption: cons.length ? Math.round((cons.reduce((a, b) => a + b, 0) / cons.length) * 10) / 10 : null,
        co2: group[0].co2EmissionsGKm,
        battery_kwh: battery.length ? battery[0] : null,
        range_km: range.length ? range[0] : null,
        reliability: "—",
        faults: bundle.faults.filter((f) => f.engineId === engine.id).map((f) => f.fault),
        pros: [],
        cons: [],
      };
    });

    // Transmissions tab: one row per distinct (gearbox, drivetrain-or-none) pairing actually
    // used -- preserves real pairing nuance (e.g. a gearbox that's FWD-only on hatchbacks but
    // Haldex-paired on the estate) instead of collapsing to one row per gearbox code.
    const transGroups = new Map<string, typeof bundle.configs>();
    for (const c of bundle.configs) {
      const key = `${c.gearbox.id}:${c.drivetrain?.id ?? "none"}`;
      const list = transGroups.get(key) ?? [];
      list.push(c);
      transGroups.set(key, list);
    }
    const t: DetailTransmission[] = [...transGroups.values()].map((group) => {
      const gearbox = group[0].gearbox;
      const drivetrain = group[0].drivetrain;
      return {
        type: gearbox.code,
        trans_type: gearbox.family,
        subtype: gearbox.family,
        speeds: gearbox.speeds,
        maintenance_km: null,
        reliability: "—",
        faults: bundle.faults.filter((f) => f.unitId === gearbox.id).map((f) => f.fault),
        notes: "",
        pros: [],
        cons: [],
        unit: {
          code: gearbox.code,
          family: gearbox.family,
          reliability_note: gearbox.reliabilityNote,
          maintenance_note: gearbox.maintenanceNote,
        },
        drivetrainSystem: drivetrain
          ? {
              code: drivetrain.code,
              type: drivetrain.type,
              generation: null,
              maker: drivetrain.maker,
              description: null,
              reliability_note: drivetrain.reliabilityNote,
              maintenance_note: null,
            }
          : null,
      };
    });

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

    const result: DetailData = {
      e, t, c, pros: [], cons: [], q,
      b: "Check full service history and verify mileage.",
      specs, dims,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/db-test POST]", err);
    const empty: DetailData = { e: [], t: [], c: [], pros: [], cons: [], q: [], b: "Could not load data.", specs: emptySpecs(), dims: [] };
    return NextResponse.json(empty, { status: 500 });
  }
}

function emptySpecs() {
  return {
    towingCapacity: null, groundClearance: null, length: null, width: null,
    height: null, weight: null, bootMax: null, resaleValue: null, bodyVariants: null,
  };
}
