// GET /api/garage/reminders -- the daily reminder job (Vercel Cron, see vercel.json).
//
// For every user with email reminders ON: compute their cars' reminders with the same engine
// the garage page uses, keep the ones overdue or inside the user's "days before" window, drop
// any already emailed (garage_notifications_sent), send ONE email per user via Resend, then
// log what was sent. A new due date (next year's STK, a newly logged oil change) is a new key,
// so it gets its own reminder later.
//
// Protected: Vercel Cron sends "Authorization: Bearer $CRON_SECRET". Without CRON_SECRET set,
// the job refuses to run (never an open endpoint that emails people).
// Needs env: CRON_SECRET, RESEND_API_KEY, GARAGE_EMAIL_FROM ("AutoMatch <reminders@your-domain>"),
// optional NEXT_PUBLIC_SITE_URL for the link in the email.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { GARAGE_VEHICLE_SELECT, vehicleFromRow } from "@/app/garage/lib/server";
import { buildReminders, remindersToEmail } from "@/app/garage/lib/reminders";
import type { EmailVehicleBlock } from "@/app/garage/lib/email";
import { buildReminderEmail } from "@/app/garage/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JobResult {
  users: number;
  emailsSent: number;
  itemsSent: number;
  errors: number;
  note?: string;
}

const EMPTY: JobResult = { users: 0, emailsSent: 0, itemsSent: 0, errors: 0 };

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.GARAGE_EMAIL_FROM, to, subject, html, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(EMPTY, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.GARAGE_EMAIL_FROM) {
    return NextResponse.json({ ...EMPTY, note: "Email not configured (RESEND_API_KEY / GARAGE_EMAIL_FROM)" } satisfies JobResult);
  }

  try {
    // "Today" in SK/CZ time, so a deadline flips to "due today" on the user's calendar day.
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bratislava" });

    const [settingsRes] = await Promise.all([
      supabase.from("garage_notification_settings").select("user_id, days_before").eq("email_enabled", true),
    ]);
    if (settingsRes.error) throw settingsRes.error;

    const result: JobResult = { ...EMPTY, users: settingsRes.data?.length ?? 0 };

    for (const s of settingsRes.data ?? []) {
      try {
        const [vehiclesRes, sentRes, userRes] = await Promise.all([
          supabase.from("garage_vehicles").select(GARAGE_VEHICLE_SELECT).eq("user_id", s.user_id),
          supabase.from("garage_notifications_sent").select("item_key").eq("user_id", s.user_id),
          supabase.auth.admin.getUserById(s.user_id),
        ]);
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (sentRes.error) throw sentRes.error;
        const email = userRes.data?.user?.email;
        if (!email) continue;

        const already = new Set((sentRes.data ?? []).map((r) => r.item_key));
        const blocks: (EmailVehicleBlock & { vehicleId: string; keys: string[] })[] = [];
        for (const row of vehiclesRes.data ?? []) {
          const v = vehicleFromRow(row);
          const due = remindersToEmail(buildReminders(v, v.intervals, v.records, v.deadlines, today), s.days_before)
            .filter((r) => !already.has(`${v.id}:${r.key}`));
          if (due.length) {
            blocks.push({
              vehicleId: v.id,
              vehicleName: v.nickname ?? `${v.brand} ${v.model}${v.licensePlate ? ` (${v.licensePlate})` : ""}`,
              reminders: due,
              keys: due.map((r) => `${v.id}:${r.key}`),
            });
          }
        }
        if (!blocks.length) continue;

        const mail = buildReminderEmail(blocks, process.env.NEXT_PUBLIC_SITE_URL ?? null);
        await sendEmail(email, mail.subject, mail.html, mail.text);

        const log = blocks.flatMap((b) => b.keys.map((item_key) => ({ user_id: s.user_id, vehicle_id: b.vehicleId, item_key })));
        const { error: logErr } = await supabase.from("garage_notifications_sent").upsert(log, { onConflict: "user_id,item_key", ignoreDuplicates: true });
        if (logErr) throw logErr;
        result.emailsSent += 1;
        result.itemsSent += log.length;
      } catch (err) {
        // One user's failure never stops the others; it's retried tomorrow (nothing logged).
        console.error("[/api/garage/reminders] user", s.user_id, err);
        result.errors += 1;
      }
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/garage/reminders]", err);
    return NextResponse.json(EMPTY, { status: 500 });
  }
}
