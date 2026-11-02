// My Garage reminder engine (app/garage/lib/reminders.ts).
import { describe, it, expect } from "vitest";
import { buildReminders, deadlineReminder, estimatedMileage, intervalsFromCatalog, remindersToEmail, serviceReminder } from "@/app/garage/lib/reminders";

const TODAY = "2026-11-02";
const car = { mileageKm: 150000, mileageUpdatedOn: "2026-05-02", yearlyKm: 20000 }; // ~10 000 km since

describe("mileage estimate", () => {
  it("adds yearly km for the time since the last reading", () => {
    expect(estimatedMileage(car, TODAY)).toBe(150000 + Math.round((20000 * 184) / 365));
    expect(estimatedMileage({ ...car, mileageUpdatedOn: null }, TODAY)).toBe(150000);
    expect(estimatedMileage({ ...car, mileageKm: null }, TODAY)).toBeNull();
  });
});

describe("deadlines", () => {
  it("overdue / soon / ok by days left", () => {
    const d = (dueOn: string) => deadlineReminder({ id: "x", kind: "stk", dueOn, label: null }, TODAY);
    expect(d("2026-10-30")).toMatchObject({ status: "overdue", daysLeft: -3, label: "STK valid until" });
    expect(d("2026-11-20")).toMatchObject({ status: "soon", daysLeft: 18 });
    expect(d("2027-06-01").status).toBe("ok");
  });
  it("a new due date is a new key (next year's STK gets its own email)", () => {
    const a = deadlineReminder({ id: "x", kind: "stk", dueOn: "2026-11-20", label: null }, TODAY);
    const b = deadlineReminder({ id: "x", kind: "stk", dueOn: "2028-11-20", label: null }, TODAY);
    expect(a.key).not.toBe(b.key);
  });
});

describe("services", () => {
  const oil = { kind: "oil_change" as const, everyKm: 15000, everyMonths: 12, costEurMin: 90, costEurMax: 130 };
  it("no record -> unknown, never guessed overdue", () => {
    expect(serviceReminder(oil, [], car, TODAY)).toMatchObject({ status: "unknown", dueOn: null });
  });
  it("km point reached first -> due by km", () => {
    // done at 140 000 km on 2026-03-01 -> due at 155 000 km; car is ~160 000 now -> overdue by km
    const r = serviceReminder(oil, [{ kind: "oil_change", doneOn: "2026-03-01", mileageKm: 140000 }], car, TODAY);
    expect(r.dueKm).toBe(155000);
    expect(r.status).toBe("overdue");
    expect(r.kmLeft).toBeLessThan(0);
  });
  it("time limit reached first -> due by date", () => {
    const slowCar = { mileageKm: 50000, mileageUpdatedOn: TODAY, yearlyKm: 5000 };
    const r = serviceReminder(oil, [{ kind: "oil_change", doneOn: "2026-01-15", mileageKm: 48000 }], slowCar, TODAY);
    expect(r.dueOn).toBe("2027-01-15"); // 12 months, long before 63 000 km at 5 000 km/year
    expect(r.status).toBe("ok");
  });
  it("uses the latest record of that kind", () => {
    const r = serviceReminder(oil, [
      { kind: "oil_change", doneOn: "2024-01-01", mileageKm: 100000 },
      { kind: "oil_change", doneOn: "2026-10-01", mileageKm: 158000 },
      { kind: "brakes", doneOn: "2026-10-20", mileageKm: 159000 },
    ], car, TODAY);
    expect(r.dueKm).toBe(173000);
    expect(r.status).toBe("ok");
  });
});

describe("intervalsFromCatalog", () => {
  const engine = { oilKm: 15000, oilMonths: 12, oilCostMin: 90, oilCostMax: 130, sparkPlugKm: null, plugCostMin: null, plugCostMax: null, airFilterKm: 60000, fuelFilterKm: 60000, timingType: "belt", timingKm: 210000, timingYears: 10, timingCostMin: 400, timingCostMax: 550 };
  it("only intervals the catalog has; belt years -> months; no timing for chains", () => {
    const k = intervalsFromCatalog({ engine, gearbox: { everyKm: 60000, everyYears: null, costMin: 160, costMax: 260 }, drivetrain: null });
    expect(k.map((i) => i.kind)).toEqual(["oil_change", "timing_belt", "air_filter", "fuel_filter", "gearbox_service"]);
    expect(k[1].everyMonths).toBe(120);
    expect(intervalsFromCatalog({ engine: { ...engine, timingType: "chain" }, gearbox: null, drivetrain: null }).some((i) => i.kind === "timing_belt")).toBe(false);
  });
});

describe("buildReminders + email selection", () => {
  it("sorts most urgent first and emails only overdue / within the user's window", () => {
    const all = buildReminders(car, [{ kind: "oil_change", everyKm: 15000, everyMonths: 12, costEurMin: null, costEurMax: null }], [], [
      { id: "1", kind: "insurance", dueOn: "2027-03-01", label: null },
      { id: "2", kind: "stk", dueOn: "2026-11-10", label: null },
    ], TODAY);
    expect(all.map((r) => r.kind)).toEqual(["stk", "insurance", "oil_change"]);
    expect(remindersToEmail(all, 14).map((r) => r.kind)).toEqual(["stk"]); // unknown oil never emailed
  });
});

import { buildReminderEmail, reminderLine } from "@/app/garage/lib/email";

describe("reminder email", () => {
  const stk = deadlineReminder({ id: "1", kind: "stk", dueOn: "2026-11-14", label: null }, TODAY);
  it("one clear line per item, overdue wording, escaped HTML, link to the garage", () => {
    expect(reminderLine(stk)).toBe("STK valid until: due 14 Nov 2026 (in 12 days)");
    const late = deadlineReminder({ id: "2", kind: "insurance", dueOn: "2026-10-30", label: null }, TODAY);
    expect(reminderLine(late)).toBe("Insurance – next payment: overdue since 30 Oct 2026");
    const m = buildReminderEmail([{ vehicleName: "Octavia <script>", reminders: [stk] }], "https://automatch.example/");
    expect(m.subject).toBe("Octavia <script>: STK valid until is coming up");
    expect(m.html).toContain("Octavia &lt;script&gt;");
    expect(m.html).toContain("https://automatch.example/garage");
    const two = buildReminderEmail([{ vehicleName: "A", reminders: [stk, late] }], null);
    expect(two.subject).toBe("My Garage: 2 things due or overdue");
  });
});
