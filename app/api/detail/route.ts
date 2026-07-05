import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { vehicleId } = await req.json();

    const [enginesRes, transRes, vehicleRes] = await Promise.all([
      supabase.from("engines").select("*").eq("vehicle_id", vehicleId),
      supabase.from("transmissions").select("*").eq("vehicle_id", vehicleId),
      supabase.from("vehicles").select("*").eq("id", vehicleId).single(),
    ]);

    const engines = enginesRes.data || [];
    const transmissions = transRes.data || [];
    const vehicle = vehicleRes.data;

    const relLabel: Record<string, string> = { excellent: "Excellent", good: "Good", average: "Average", below_average: "Poor" };

    const result = {
      // Engines — full data
      e: engines.map((e: any) => ({
        engine: e.label || `${e.engine_code || "Engine"} — ${e.power_kw || "?"} kW`,
        fuel_type: (e.fuel_type || "").toLowerCase(),
        power_kw: e.power_kw || 0,
        displacement_cc: e.displacement_cc || null,
        torque_nm: e.torque_nm || null,
        drivetrain: e.drivetrain || "FWD",
        consumption: e.fuel_consumption_avg || null,
        co2: e.co2_emissions_gkm || null,
        battery_kwh: e.battery_kwh || null,
        range_km: e.range_km || null,
        reliability: relLabel[e.reliability_rating || "average"] || "Average",
        faults: e.common_faults || [],
        pros: e.pros || [],
        cons: e.cons || [],
      })),

      // Transmissions — full data
      t: transmissions.map((t: any) => ({
        type: t.specific_type || t.trans_type || "Transmission",
        trans_type: (t.trans_type || "").toLowerCase(),
        subtype: t.subtype || "",
        speeds: t.speeds || null,
        maintenance_km: t.maintenance_interval_km || null,
        reliability: relLabel[t.reliability_rating || "average"] || "Average",
        faults: t.common_faults || [],
        notes: t.notes || "",
        pros: t.pros || [],
        cons: t.cons || [],
      })),

      // Vehicle common faults: [{issue, severity}]
      c: (vehicle?.common_faults || []).map((f: any) => ({
        area: typeof f === "string" ? "General" : (f.issue || "").split(/[—\-,.]/).at(0)?.trim().slice(0, 50) || "General",
        severity: typeof f === "string" ? "Medium" : (f.severity || "medium").charAt(0).toUpperCase() + (f.severity || "medium").slice(1),
        detail: typeof f === "string" ? f : f.issue || "",
      })),

      // Vehicle data
      pros: vehicle?.general_pros || [],
      cons: vehicle?.general_cons || [],
      q: (vehicle?.equipment_trims || []).map((t: any) => ({
        trim: t.trim || t.name || "Standard",
        features: Array.isArray(t.features) ? t.features.join(" \u00B7 ") : t.features || "",
      })),
      b: vehicle?.buyers_guide || "Check full service history and verify mileage.",

      // Extra vehicle info for expanded card
      specs: {
        towingCapacity: vehicle?.towing_capacity_kg || null,
        groundClearance: vehicle?.ground_clearance_mm || null,
        length: vehicle?.length_mm || null,
        width: vehicle?.width_mm || null,
        height: vehicle?.height_mm || null,
        weight: vehicle?.curb_weight_kg || null,
        bootMax: vehicle?.boot_max_liters || null,
        resaleValue: vehicle?.resale_value_rating || null,
        bodyVariants: vehicle?.body_variants || null,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/detail]", err);
    return NextResponse.json(
      { e: [], t: [], c: [], pros: [], cons: [], q: [], b: "Could not load data.", specs: {} },
      { status: 500 }
    );
  }
}