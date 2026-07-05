import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const [v, e, t] = await Promise.all([
    supabase.from("vehicles").select("*").limit(1),
    supabase.from("engines").select("*").limit(1),
    supabase.from("transmissions").select("*").limit(1),
  ]);

  // Count totals
  const [vc, ec, tc] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }),
    supabase.from("engines").select("id", { count: "exact", head: true }),
    supabase.from("transmissions").select("id", { count: "exact", head: true }),
  ]);

  // Get distinct brands
  const brands = await supabase.from("vehicles").select("brand");
  const uniqueBrands = [...new Set((brands.data || []).map((b: any) => b.brand))].sort();

  return NextResponse.json({
    counts: { vehicles: vc.count, engines: ec.count, transmissions: tc.count, brands: uniqueBrands.length },
    brands: uniqueBrands,
    vehicle_columns: v.data?.[0] ? Object.keys(v.data[0]) : [],
    engine_columns: e.data?.[0] ? Object.keys(e.data[0]) : [],
    transmission_columns: t.data?.[0] ? Object.keys(t.data[0]) : [],
    vehicle_sample: v.data?.[0] || null,
    engine_sample: e.data?.[0] || null,
    transmission_sample: t.data?.[0] || null,
  });
}