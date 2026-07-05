import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Origin country to flag emoji
const ORIGIN_FLAGS: Record<string, string> = {
  german: "\u{1F1E9}\u{1F1EA}", japanese: "\u{1F1EF}\u{1F1F5}", korean: "\u{1F1F0}\u{1F1F7}",
  french: "\u{1F1EB}\u{1F1F7}", czech: "\u{1F1E8}\u{1F1FF}", italian: "\u{1F1EE}\u{1F1F9}",
  swedish: "\u{1F1F8}\u{1F1EA}", british: "\u{1F1EC}\u{1F1E7}", american: "\u{1F1FA}\u{1F1F8}",
  chinese: "\u{1F1E8}\u{1F1F3}", romanian: "\u{1F1F7}\u{1F1F4}", spanish: "\u{1F1EA}\u{1F1F8}",
};

export async function GET() {
  try {
    const [vehiclesRes, enginesRes, transRes] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("engines").select("*"),
      supabase.from("transmissions").select("*"),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (enginesRes.error) throw enginesRes.error;
    if (transRes.error) throw transRes.error;

    const engines = enginesRes.data || [];
    const transmissions = transRes.data || [];

    const cars = (vehiclesRes.data || []).map((v: any) => {
      const vEngines = engines.filter((e: any) => e.vehicle_id === v.id);
      const vTrans = transmissions.filter((t: any) => t.vehicle_id === v.id);

      // Unique fuel types
      const fuelTypes = [...new Set(vEngines.map((e: any) => (e.fuel_type || "").toLowerCase()))].filter(Boolean);

      // Best reliability from engines
      const relOrder = ["excellent", "good", "average", "below_average"];
      const bestRel = vEngines.reduce((best: string, e: any) => {
        const r = (e.reliability_rating || "average").toLowerCase();
        return relOrder.indexOf(r) < relOrder.indexOf(best) ? r : best;
      }, "average");
      const relMap: Record<string, string> = { excellent: "Excellent", good: "Good", average: "Average", below_average: "Poor" };

      // Has AWD?
      const hasAWD = vEngines.some((e: any) => e.drivetrain === "AWD");
      const drivetrains = [...new Set(vEngines.map((e: any) => e.drivetrain).filter(Boolean))];

      // Parse yearTo
      let yearTo = 2025;
      if (v.production_years) {
        if (v.production_years.toLowerCase().includes("present")) yearTo = 2025;
        else { const m = v.production_years.match(/(\d{4})\s*$/); if (m) yearTo = parseInt(m[1]); }
      }

      // Avg fuel consumption
      const avgConsumption = vEngines.length > 0
        ? Math.round(vEngines.reduce((s: number, e: any) => s + (e.fuel_consumption_avg || 0), 0) / vEngines.length * 10) / 10
        : null;

      return {
        id: v.id,
        make: v.brand,
        model: v.model,
        gen: v.production_years || "",
        years: v.production_years || "",
        yearTo,
        body: v.body_type || "hatchback",
        segment: v.segment || "",
        fuel: fuelTypes.length > 0 ? fuelTypes : ["petrol"],
        seats: v.seats_count || 5,
        boot: v.boot_capacity_liters || null,
        bootMax: v.boot_max_liters || null,
        origin: v.origin_country || "",
        originFlag: ORIGIN_FLAGS[v.origin_country || ""] || "\u{1F30D}",
        towingCapacity: v.towing_capacity_kg || null,
        groundClearance: v.ground_clearance_mm || null,
        length: v.length_mm || null,
        width: v.width_mm || null,
        height: v.height_mm || null,
        weight: v.curb_weight_kg || null,
        hasAWD,
        drivetrains,
        avgConsumption,
        resaleValue: v.resale_value_rating || null,
        bodyVariants: v.body_variants || null,
        buyingTip: v.buyers_guide || "",
        transmissions: vTrans.map((t: any) => t.specific_type || t.trans_type || ""),
        fuelTankLiters: Math.max(...vEngines.map((e: any) => e.fuel_tank_liters || 0)) || null,
        consumptionByFuel: (() => {
  const m: Record<string, { sum: number; n: number }> = {};
  vEngines.forEach((e: any) => {
    const ft = (e.fuel_type || "").toLowerCase();
    const v = Number(e.fuel_consumption_avg);
    if (!ft || !v) return;
    if (!m[ft]) m[ft] = { sum: 0, n: 0 };
    m[ft].sum += v; m[ft].n += 1;
  });
  const out: Record<string, number> = {};
  Object.keys(m).forEach(k => { out[k] = Math.round((m[k].sum / m[k].n) * 10) / 10; });
  return Object.keys(out).length ? out : null;
})(),
        pricing: {
          skPriceMin: v.price_range_min_eur,
          skPriceMax: v.price_range_max_eur,
          euPriceMin: v.price_range_min_eur,
          euPriceMax: v.price_range_max_eur,
          mileageAtMidBudget: v.typical_milage_range || "",
        },
        reliability: { overall: relMap[bestRel] || "Average", repairCost: "Moderate" },
        safety: {
          stars: v.safety_rating,
          adultOccupant: v.ncap_adult_pct,
          childOccupant: v.ncap_child_pct,
          pedestrian: v.ncap_pedestrian_pct,
          safetyAssist: v.ncap_safety_assist_pct,
          ncapYear: v.ncap_year,
        },
        equipment: (v.equipment_trims || []).map((t: any) => ({
          trim: t.trim || t.name || "Standard",
          features: t.features || [],
        })),
        pros: v.general_pros || [],
        cons: v.general_cons || [],
        // Vehicle-level common faults: [{issue, severity}]
        vehicleFaults: v.common_faults || [],
        // Max engine power for quick display
        maxPowerKw: vEngines.length > 0 ? Math.max(...vEngines.map((e: any) => e.power_kw || 0)) : null,
        minPowerKw: vEngines.length > 0 ? Math.min(...vEngines.filter((e: any) => e.power_kw > 0).map((e: any) => e.power_kw)) : null,
      };
    });

    return NextResponse.json(cars);
  } catch (err) {
    console.error("[/api/cars]", err);
    return NextResponse.json([], { status: 500 });
  }
}