import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Static reference vocabulary (17 rows: 9 gsr2_mandated + 8 beyond_baseline —
// see supabase/migrations/20260824090000_add_safety_features_reference_table.sql).
// Identical for every car, so this is fetched ONCE by PrehladView on mount
// (like /api/cars), not per-vehicle the way POST /api/detail is. A car's
// eligibility for the gsr2_mandated rows is derived client-side from its
// production years (isGsr2Era, app/lib/carFields.ts) — this table has no
// per-car linkage at all, by design (that's a later step, not built yet).
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("safety_features")
      .select("*")
      .order("category")
      .order("universal_name");

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[/api/safety-features]", err);
    return NextResponse.json([], { status: 500 });
  }
}
