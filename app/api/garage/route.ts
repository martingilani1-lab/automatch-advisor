// /api/garage -- the signed-in user's garage.
//   GET   everything for the garage page: cars (+ catalog service intervals, records,
//         deadlines), email-reminder settings, the account email.
//   POST  { action, ... } one change: addVehicle | updateVehicle | deleteVehicle | addRecord |
//         deleteRecord | setDeadline | deleteDeadline | saveSettings.
//
// Every request must carry the user's Supabase access token (Authorization: Bearer ...).
// The token is verified server-side and EVERY query is scoped to that user's id -- the body
// never chooses whose data is touched. RLS on the garage tables is the second lock.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { GarageData } from "@/app/garage/lib/server";
import { GARAGE_VEHICLE_SELECT, dateStr, int, requireUser, str, uuid, vehicleFromRow } from "@/app/garage/lib/server";
import { DEADLINE_KINDS, SERVICE_KINDS } from "@/app/garage/lib/vocab";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMPTY: GarageData = { email: null, vehicles: [], settings: { emailEnabled: false, daysBefore: 14 } };
const MAX_VEHICLES = 20;
const thisYear = () => new Date().getUTCFullYear();
const todayStr = () => new Date().toISOString().slice(0, 10);

export async function GET(req: Request) {
  try {
    const user = await requireUser(req, supabase);
    if (!user) return NextResponse.json(EMPTY, { status: 401 });

    const [vehiclesRes, settingsRes] = await Promise.all([
      supabase.from("garage_vehicles").select(GARAGE_VEHICLE_SELECT).eq("user_id", user.id).order("created_at"),
      supabase.from("garage_notification_settings").select("email_enabled, days_before").eq("user_id", user.id).maybeSingle(),
    ]);
    if (vehiclesRes.error) throw vehiclesRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const result: GarageData = {
      email: user.email ?? null,
      vehicles: (vehiclesRes.data ?? []).map(vehicleFromRow),
      settings: {
        emailEnabled: settingsRes.data?.email_enabled ?? false,
        daysBefore: settingsRes.data?.days_before ?? 14,
      },
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/garage]", err);
    return NextResponse.json(EMPTY, { status: 500 });
  }
}

// Fields a user can set on a car (shared by add + update).
function vehicleFields(b: any) {
  return {
    nickname: str(b.nickname, 60),
    license_plate: str(b.licensePlate, 15),
    engine_text: str(b.engineText, 80),
    year_made: int(b.yearMade, 1950, thisYear() + 1),
    mileage_km: int(b.mileageKm, 0, 2_000_000),
    yearly_km: int(b.yearlyKm, 1, 200_000),
  };
}

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error } satisfies Result, { status });

export async function POST(req: Request) {
  try {
    const user = await requireUser(req, supabase);
    if (!user) return fail("Not signed in", 401);
    const b = await req.json().catch(() => null);
    if (!b || typeof b.action !== "string") return fail("Bad request");

    // A car id from the body is only usable if it belongs to this user.
    const ownVehicle = async (id: unknown) => {
      const vid = uuid(id);
      if (!vid) return null;
      const { data, error } = await supabase.from("garage_vehicles").select("id").eq("id", vid).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data ? vid : null;
    };

    switch (b.action) {
      case "addVehicle": {
        const brand = str(b.brand, 40);
        const model = str(b.model, 60);
        if (!brand || !model) return fail("Brand and model are required");
        const { count, error: cErr } = await supabase.from("garage_vehicles").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if (cErr) throw cErr;
        if ((count ?? 0) >= MAX_VEHICLES) return fail(`A garage holds up to ${MAX_VEHICLES} cars`);
        const fields = vehicleFields(b);
        const { error } = await supabase.from("garage_vehicles").insert({
          user_id: user.id,
          brand,
          model,
          phase_id: uuid(b.phaseId),
          engine_id: uuid(b.engineId),
          unit_id: uuid(b.unitId),
          drivetrain_id: uuid(b.drivetrainId),
          ...fields,
          mileage_updated_on: fields.mileage_km != null ? todayStr() : null,
        });
        if (error) throw error;
        break;
      }
      case "updateVehicle": {
        const id = await ownVehicle(b.id);
        if (!id) return fail("Car not found", 404);
        const fields = vehicleFields(b);
        const { error } = await supabase
          .from("garage_vehicles")
          .update({ ...fields, mileage_updated_on: fields.mileage_km != null ? todayStr() : null })
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        break;
      }
      case "deleteVehicle": {
        const id = await ownVehicle(b.id);
        if (!id) return fail("Car not found", 404);
        const { error } = await supabase.from("garage_vehicles").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
        break;
      }
      case "addRecord": {
        const vehicleId = await ownVehicle(b.vehicleId);
        if (!vehicleId) return fail("Car not found", 404);
        const kind = (SERVICE_KINDS as readonly string[]).includes(b.kind) ? b.kind : null;
        const doneOn = dateStr(b.doneOn);
        if (!kind || !doneOn) return fail("Type and date are required");
        if (doneOn > todayStr()) return fail("The date can't be in the future");
        const mileage = int(b.mileageKm, 0, 2_000_000);
        const cost = typeof b.costEur === "number" || typeof b.costEur === "string" ? Number(b.costEur) : NaN;
        const { error } = await supabase.from("garage_service_records").insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          kind,
          done_on: doneOn,
          mileage_km: mileage,
          cost_eur: Number.isFinite(cost) && cost >= 0 && cost < 1_000_000 ? Math.round(cost * 100) / 100 : null,
          note: str(b.note, 300),
        });
        if (error) throw error;
        // A newer odometer reading on a record also updates the car's mileage.
        if (mileage != null) {
          await supabase.from("garage_vehicles").update({ mileage_km: mileage, mileage_updated_on: doneOn })
            .eq("id", vehicleId).eq("user_id", user.id).or(`mileage_km.is.null,mileage_km.lt.${mileage}`);
        }
        break;
      }
      case "deleteRecord": {
        const id = uuid(b.id);
        if (!id) return fail("Record not found", 404);
        const { error } = await supabase.from("garage_service_records").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
        break;
      }
      case "setDeadline": {
        const vehicleId = await ownVehicle(b.vehicleId);
        if (!vehicleId) return fail("Car not found", 404);
        const kind = (DEADLINE_KINDS as readonly string[]).includes(b.kind) ? b.kind : null;
        const dueOn = dateStr(b.dueOn);
        if (!kind || !dueOn) return fail("Type and date are required");
        const row = { user_id: user.id, vehicle_id: vehicleId, kind, due_on: dueOn, label: str(b.label, 60), note: str(b.note, 300) };
        // One current deadline per kind (except "other"): replace it.
        if (kind !== "other") {
          const { error: delErr } = await supabase.from("garage_deadlines").delete().eq("vehicle_id", vehicleId).eq("user_id", user.id).eq("kind", kind);
          if (delErr) throw delErr;
        }
        const { error } = await supabase.from("garage_deadlines").insert(row);
        if (error) throw error;
        break;
      }
      case "deleteDeadline": {
        const id = uuid(b.id);
        if (!id) return fail("Deadline not found", 404);
        const { error } = await supabase.from("garage_deadlines").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
        break;
      }
      case "saveSettings": {
        const { error } = await supabase.from("garage_notification_settings").upsert({
          user_id: user.id,
          email_enabled: b.emailEnabled === true,
          days_before: int(b.daysBefore, 1, 60) ?? 14,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }
      default:
        return fail("Unknown action");
    }
    return NextResponse.json({ ok: true } satisfies Result);
  } catch (err) {
    console.error("[/api/garage]", err);
    return NextResponse.json({ ok: false, error: "Something went wrong" } satisfies Result, { status: 500 });
  }
}
