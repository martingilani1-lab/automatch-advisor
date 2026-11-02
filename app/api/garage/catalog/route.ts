// GET /api/garage/catalog?phaseId=<uuid>
// The real engine + gearbox + drivetrain combinations of one catalog phase, for the "add a car"
// picker (body type doesn't matter for service intervals, so it's collapsed). Public catalog
// data -- no sign-in needed. The model/phase list itself comes from GET /api/db-test.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GarageCatalogOption {
  key: string; // engineId|unitId|drivetrainId
  engineId: string;
  unitId: string;
  drivetrainId: string | null;
  label: string; // "2.0 TDI 110 kW · VW DQ381 7-speed · Haldex Gen 5"
  fuelType: string;
  powerKw: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const phaseId = new URL(req.url).searchParams.get("phaseId") ?? "";
    if (!UUID_RE.test(phaseId)) return NextResponse.json([], { status: 400 });

    const [configsRes] = await Promise.all([
      supabase
        .from("catalog_vehicle_configurations")
        .select("engine_id, unit_id, drivetrain_id, catalog_engines(code, display_name, power_kw, fuel_type, displacement_cc), transmission_units(code, speeds), drivetrain_systems(code, type, generation)")
        .eq("phase_id", phaseId),
    ]);
    if (configsRes.error) throw configsRes.error;

    const one = (x: any) => (Array.isArray(x) ? x[0] ?? null : x ?? null);
    const byKey = new Map<string, GarageCatalogOption>();
    const ccOf = new Map<string, number>(); // displacement, only for sorting
    for (const c of (configsRes.data ?? []) as any[]) {
      const e = one(c.catalog_engines);
      const g = one(c.transmission_units);
      const d = one(c.drivetrain_systems);
      if (!e || !g) continue;
      const key = `${c.engine_id}|${c.unit_id}|${c.drivetrain_id ?? "2wd"}`;
      if (byKey.has(key)) continue;
      const name = e.display_name ?? e.code;
      byKey.set(key, {
        key,
        engineId: c.engine_id,
        unitId: c.unit_id,
        drivetrainId: c.drivetrain_id,
        label: [
          /kw/i.test(name) ? name : `${name} ${e.power_kw} kW`,
          `${g.code}${g.speeds ? ` ${g.speeds}-speed` : ""}`,
          d ? (d.generation ? `${d.type === "haldex" ? "Haldex " : ""}${d.generation}` : d.code) : "FWD",
        ].join(" · "),
        fuelType: e.fuel_type,
        powerKw: Number(e.power_kw),
      });
      ccOf.set(key, Number(e.displacement_cc) || 0);
    }
    const result: GarageCatalogOption[] = [...byKey.values()].sort(
      (a, b) => a.fuelType.localeCompare(b.fuelType) || (ccOf.get(a.key) ?? 0) - (ccOf.get(b.key) ?? 0) || a.powerKw - b.powerKw
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/garage/catalog]", err);
    return NextResponse.json([], { status: 500 });
  }
}
