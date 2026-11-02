// My Garage reminder engine -- pure, no I/O, shared by the garage page (what's due) and the
// daily email job (what to send). Two kinds of reminders:
//
//   1. DEADLINES the user typed in (STK valid until, insurance payment, ...): due on that date.
//   2. SERVICES with an interval from the catalog (oil every 15 000 km / 12 months, timing belt
//      every 120 000 km / 8 years, DSG oil every 60 000 km, ...): due at
//        last record's km + interval km, or last record's date + interval months,
//      whichever comes FIRST. The km point is turned into a date with the car's yearly km.
//
// Never guesses history: a service with an interval but no record yet is "unknown" with a
// prompt to log the last one -- not "overdue", not "ok". Free-text cars have no catalog
// intervals, so they only get deadlines (plus anything the user logs).

import type { DeadlineKind, ServiceKind } from "./vocab";
import { DEADLINE_LABELS, SERVICE_LABELS } from "./vocab";

export const DEFAULT_YEARLY_KM = 15000;
export const SOON_DAYS = 30; // "due soon" window on the page (emails use the user's own setting)
export const SOON_KM = 1500;

export interface ServiceInterval {
  kind: ServiceKind;
  everyKm: number | null;
  everyMonths: number | null;
  costEurMin: number | null;
  costEurMax: number | null;
}

export interface GarageVehicleFacts {
  mileageKm: number | null;
  mileageUpdatedOn: string | null; // YYYY-MM-DD
  yearlyKm: number | null;
}

export interface ServiceRecord {
  kind: ServiceKind;
  doneOn: string; // YYYY-MM-DD
  mileageKm: number | null;
}

export interface Deadline {
  id: string;
  kind: DeadlineKind;
  dueOn: string;
  label: string | null;
}

export type ReminderStatus = "overdue" | "soon" | "ok" | "unknown";

export interface Reminder {
  key: string; // stable per item AND due point -- used to de-duplicate emails
  source: "deadline" | "service";
  kind: string;
  label: string;
  status: ReminderStatus;
  dueOn: string | null; // date, or the estimated date for a km-based service
  dueKm: number | null;
  daysLeft: number | null;
  kmLeft: number | null;
  basis: string; // human explanation: "last done 12 Mar 2025 at 150 000 km · every 15 000 km / 12 months"
  costEurMin: number | null;
  costEurMax: number | null;
}

// ---- date helpers (UTC, date-only) --------------------------------------------------------
const DAY_MS = 86400000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
function addMonths(s: string, months: number): string {
  const d = toDate(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return iso(d);
}
const addDays = (s: string, days: number) => iso(new Date(toDate(s).getTime() + Math.round(days) * DAY_MS));

const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;
export function fmtDate(s: string): string {
  const d = toDate(s);
  return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Today's mileage estimate: last known reading + yearly km × time since it was recorded.
export function estimatedMileage(v: GarageVehicleFacts, today: string): number | null {
  if (v.mileageKm == null) return null;
  if (!v.mileageUpdatedOn) return v.mileageKm;
  const days = Math.max(0, daysBetween(v.mileageUpdatedOn, today));
  return Math.round(v.mileageKm + ((v.yearlyKm ?? DEFAULT_YEARLY_KM) * days) / 365);
}

function statusOf(daysLeft: number | null, kmLeft: number | null): ReminderStatus {
  if ((daysLeft != null && daysLeft < 0) || (kmLeft != null && kmLeft < 0)) return "overdue";
  if ((daysLeft != null && daysLeft <= SOON_DAYS) || (kmLeft != null && kmLeft <= SOON_KM)) return "soon";
  return "ok";
}

// ---- deadlines ----------------------------------------------------------------------------
export function deadlineReminder(d: Deadline, today: string): Reminder {
  const daysLeft = daysBetween(today, d.dueOn);
  return {
    key: `deadline:${d.kind}:${d.id}:${d.dueOn}`,
    source: "deadline",
    kind: d.kind,
    label: d.kind === "other" && d.label ? d.label : DEADLINE_LABELS[d.kind],
    status: statusOf(daysLeft, null),
    dueOn: d.dueOn,
    dueKm: null,
    daysLeft,
    kmLeft: null,
    basis: `due ${fmtDate(d.dueOn)}`,
    costEurMin: null,
    costEurMax: null,
  };
}

// ---- services -----------------------------------------------------------------------------
export function serviceReminder(interval: ServiceInterval, records: ServiceRecord[], v: GarageVehicleFacts, today: string): Reminder {
  const every = [interval.everyKm != null ? `every ${fmtKm(interval.everyKm)}` : null, interval.everyMonths != null ? `${interval.everyMonths} months` : null]
    .filter(Boolean)
    .join(" / ");
  const last = records
    .filter((r) => r.kind === interval.kind)
    .sort((a, b) => (a.doneOn < b.doneOn ? 1 : -1))[0];
  const base = {
    source: "service" as const,
    kind: interval.kind,
    label: SERVICE_LABELS[interval.kind],
    costEurMin: interval.costEurMin,
    costEurMax: interval.costEurMax,
  };
  if (!last) {
    return {
      ...base,
      key: `service:${interval.kind}:unknown`,
      status: "unknown",
      dueOn: null,
      dueKm: null,
      daysLeft: null,
      kmLeft: null,
      basis: `no record yet — log the last one to get a reminder · ${every}`,
    };
  }

  const nowKm = estimatedMileage(v, today);
  const yearly = v.yearlyKm ?? DEFAULT_YEARLY_KM;
  const dueKm = interval.everyKm != null && last.mileageKm != null ? last.mileageKm + interval.everyKm : null;
  const kmLeft = dueKm != null && nowKm != null ? dueKm - nowKm : null;
  // Date by time limit, and date at which the km point is expected to be reached.
  const byTime = interval.everyMonths != null ? addMonths(last.doneOn, interval.everyMonths) : null;
  const byKm = kmLeft != null ? addDays(today, (kmLeft / yearly) * 365) : null;
  const dueOn = [byTime, byKm].filter((x): x is string => x != null).sort()[0] ?? null;
  const daysLeft = dueOn ? daysBetween(today, dueOn) : null;

  const lastText = `last done ${fmtDate(last.doneOn)}${last.mileageKm != null ? ` at ${fmtKm(last.mileageKm)}` : ""}`;
  return {
    ...base,
    key: `service:${interval.kind}:${last.doneOn}:${last.mileageKm ?? "-"}`,
    status: dueOn == null && kmLeft == null ? "unknown" : statusOf(daysLeft, kmLeft),
    dueOn,
    dueKm,
    daysLeft,
    kmLeft,
    basis: `${lastText} · ${every}`,
  };
}

const STATUS_ORDER: Record<ReminderStatus, number> = { overdue: 0, soon: 1, ok: 2, unknown: 3 };

// Everything for one car, most urgent first.
export function buildReminders(
  v: GarageVehicleFacts,
  intervals: ServiceInterval[],
  records: ServiceRecord[],
  deadlines: Deadline[],
  today: string,
): Reminder[] {
  return [
    ...deadlines.map((d) => deadlineReminder(d, today)),
    ...intervals.map((i) => serviceReminder(i, records, v, today)),
  ].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9));
}

// Which reminders go into an email: overdue, or due within the user's window. Unknown never.
export function remindersToEmail(all: Reminder[], daysBefore: number): Reminder[] {
  return all.filter((r) => r.status !== "unknown" && ((r.daysLeft != null && r.daysLeft <= daysBefore) || (r.kmLeft != null && r.kmLeft <= SOON_KM)));
}

// ---- catalog -> intervals -----------------------------------------------------------------
// Catalog maintenance columns (catalog_engines maintenance + transmission_units /
// drivetrain_systems service_*) as the reminder engine needs them. Only intervals the catalog
// actually has are returned -- a NULL interval is no reminder, never a made-up default.
export interface CatalogMaintenanceInput {
  engine: {
    oilKm: number | null; oilMonths: number | null; oilCostMin: number | null; oilCostMax: number | null;
    sparkPlugKm: number | null; plugCostMin: number | null; plugCostMax: number | null;
    airFilterKm: number | null; fuelFilterKm: number | null;
    timingType: string | null; timingKm: number | null; timingYears: number | null; timingCostMin: number | null; timingCostMax: number | null;
  } | null;
  gearbox: { everyKm: number | null; everyYears: number | null; costMin: number | null; costMax: number | null } | null;
  drivetrain: { everyKm: number | null; everyYears: number | null; costMin: number | null; costMax: number | null } | null;
}

export function intervalsFromCatalog(c: CatalogMaintenanceInput): ServiceInterval[] {
  const out: ServiceInterval[] = [];
  const add = (kind: ServiceKind, everyKm: number | null, everyMonths: number | null, costEurMin: number | null = null, costEurMax: number | null = null) => {
    if (everyKm != null || everyMonths != null) out.push({ kind, everyKm, everyMonths, costEurMin, costEurMax });
  };
  const e = c.engine;
  if (e) {
    add("oil_change", e.oilKm, e.oilMonths, e.oilCostMin, e.oilCostMax);
    // Chains have no replacement interval -- never a timing reminder for them.
    if (e.timingType === "belt") add("timing_belt", e.timingKm, e.timingYears != null ? e.timingYears * 12 : null, e.timingCostMin, e.timingCostMax);
    add("spark_plugs", e.sparkPlugKm, null, e.plugCostMin, e.plugCostMax);
    add("air_filter", e.airFilterKm, null);
    add("fuel_filter", e.fuelFilterKm, null);
  }
  if (c.gearbox) add("gearbox_service", c.gearbox.everyKm, c.gearbox.everyYears != null ? c.gearbox.everyYears * 12 : null, c.gearbox.costMin, c.gearbox.costMax);
  if (c.drivetrain) add("awd_service", c.drivetrain.everyKm, c.drivetrain.everyYears != null ? c.drivetrain.everyYears * 12 : null, c.drivetrain.costMin, c.drivetrain.costMax);
  return out;
}
