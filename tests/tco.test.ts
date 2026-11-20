// TCO calculator math (app/db-test/lib/tco.ts) -- per configuration.
import { describe, it, expect } from "vitest";
import { calcTco, realWorldPhev, insuranceEstimate, pickCheapest, proratedYearly, rankedLines, type TcoInput, type TcoResult } from "@/app/db-test/lib/tco";
import { EMPTY_UNIT_SERVICE } from "@/app/catalog/lib/engineMaintenance";
import { calculateRepairBuffer } from "@/app/db-test/lib/repairBuffer";

const svc = (km: number | null, yrs: number | null, min: number | null, max: number | null) =>
  ({ intervalKm: km, intervalYears: yrs, costEurMin: min, costEurMax: max });

// 1.0 TSI-ish petrol, 6 l real-world, good engine, VW 02J-like manual, FWD.
const car: TcoInput = {
  priceEur: 10000, manufactureYear: 2020, fuelType: "petrol", consumptionPer100: 6, powerKw: 81,
  engineReliabilityRating: 4, engineYearlyServiceEur: 200,
  timingBelt: svc(120000, null, 400, 560),
  gearbox: { label: "VW 02J", reliabilityRating: 4, service: svc(60000, null, 40, 80) },
  drivetrain: null,
};
const line = (r: ReturnType<typeof calcTco>, k: string) => r.lines.find((l) => l.key === k)?.yearly;

describe("calcTco", () => {
  it("computes each category at 15 000 km", () => {
    const r = calcTco(car, 15000, 2026);
    expect(line(r, "fuel")).toBeCloseTo(150 * 6 * 1.85); // 1665
    expect(line(r, "engine")).toBeCloseTo(200 + 60); // belt €480 / 120k × 15k
    expect(line(r, "gearbox")).toBeCloseTo(15); // €60 / 60k × 15k
    expect(line(r, "drivetrain")).toBeUndefined(); // FWD: no AWD line at all
    expect(line(r, "tires")).toBeCloseTo(150 + 90); // 2 swaps × €45
    expect(line(r, "repairs")).toBe(200); // good engine + good gearbox (+0)
    expect(line(r, "fixed")).toBe(45); // €90 STK/EK every 2 years
    expect(line(r, "vignette")).toBeUndefined(); // optional, off by default
    expect(line(r, "insurance")).toBe(110);
    expect(line(r, "depreciation")).toBe(1000);
    expect(r.yearlyTotal).toBeCloseTo(1665 + 260 + 15 + 240 + 200 + 45 + 110 + 1000);
    expect(r.monthlyTotal).toBeCloseTo(r.yearlyTotal / 12);
    expect(r.incomplete).toBe(false);
  });
  it("uses diesel at €1.95/l", () => {
    expect(line(calcTco({ ...car, fuelType: "diesel", consumptionPer100: 5 }, 15000), "fuel")).toBeCloseTo(150 * 5 * 1.95);
  });
  it("adds the AWD service and the gearbox/AWD reliability to the repair reserve", () => {
    const awd = calcTco({
      ...car,
      gearbox: { label: "VW DQ200", reliabilityRating: 2, service: svc(60000, null, 100, 160) },
      drivetrain: { label: "Haldex Gen 1", reliabilityRating: 3, service: svc(60000, null, 80, 150) },
    }, 15000);
    expect(line(awd, "drivetrain")).toBeCloseTo(115 / 4);
    expect(line(awd, "repairs")).toBe(200 + 250 + 100); // good engine + poor gearbox + average AWD
  });
  it("scales the reserve with mileage, clamped", () => {
    expect(line(calcTco(car, 50000), "repairs")).toBe(300);
    expect(line(calcTco(car, 5000), "repairs")).toBe(100);
  });
  it("leaves unpriced items out of the total and flags them", () => {
    const r = calcTco({ ...car, consumptionPer100: null, gearbox: { ...car.gearbox, service: EMPTY_UNIT_SERVICE } }, 15000);
    expect(line(r, "fuel")).toBeNull();
    expect(line(r, "gearbox")).toBeNull();
    expect(r.incomplete).toBe(true);
    expect(r.yearlyTotal).toBeCloseTo(260 + 240 + 200 + 45 + 110 + 1000);
  });
  it("prices insurance by power bands", () => {
    expect([99, 100, 150, 151].map((kw) => insuranceEstimate(kw))).toEqual([110, 150, 150, 180]);
  });
});

describe("proratedYearly", () => {
  it("takes the time limit when it comes first (Haldex 60k km / 3 years at 10 000 km)", () => {
    expect(proratedYearly(svc(60000, 3, 120, 120), 10000)).toBe(40); // time: 120/3, km: 20
    expect(proratedYearly(svc(60000, 3, 120, 120), 30000)).toBe(60); // km wins
  });
  it("is null without a price or without any interval", () => {
    expect(proratedYearly(svc(60000, null, null, null), 15000)).toBeNull();
    expect(proratedYearly(svc(null, null, 100, 100), 15000)).toBeNull();
  });
});

describe("rankedLines", () => {
  it("orders biggest first and shares sum to 1", () => {
    const ranked = rankedLines(calcTco(car, 15000));
    expect(ranked[0].key).toBe("fuel");
    expect(ranked.every((l, i) => i === 0 || ranked[i - 1].yearly >= l.yearly)).toBe(true);
    expect(ranked.reduce((s, l) => s + l.share, 0)).toBeCloseTo(1);
  });
});

describe("pickCheapest", () => {
  const res = (yearlyTotal: number, incomplete = false): TcoResult => ({ lines: [], yearlyTotal, monthlyTotal: yearlyTotal / 12, incomplete, buffer: calculateRepairBuffer([], null, 0, null) });
  it("picks the clearly cheapest vehicle", () => {
    expect(pickCheapest([res(5000), res(4200), res(4600)])).toBe(1);
  });
  it("no pick when the gap is under €60/year", () => {
    expect(pickCheapest([res(5000), res(4950)])).toBeNull();
  });
  it("no pick when any vehicle is missing data or still loading", () => {
    expect(pickCheapest([res(5000), res(3000, true)])).toBeNull();
    expect(pickCheapest([res(5000), null])).toBeNull();
  });
  it("needs at least two vehicles", () => {
    expect(pickCheapest([res(5000)])).toBeNull();
  });
});

describe("depreciation in calcTco", () => {
  it("follows the age curve and falls back to 10 % only when the age is unknown", () => {
    expect(line(calcTco({ ...car, manufactureYear: 2024 }, 15000, 2026), "depreciation")).toBe(1500); // age 2 -> 15 %
    expect(line(calcTco({ ...car, manufactureYear: 2003 }, 15000, 2026), "depreciation")).toBe(200); // Bora-age -> floor
    expect(line(calcTco({ ...car, manufactureYear: null }, 15000, 2026), "depreciation")).toBe(1000);
  });
});

describe("optional vignette", () => {
  it("adds €90 only when the buyer ticks it, and never marks the total incomplete", () => {
    const off = calcTco(car, 15000, 2026);
    const on = calcTco(car, 15000, 2026, undefined, { includeVignette: true });
    expect(line(on, "vignette")).toBe(90);
    expect(on.yearlyTotal - off.yearlyTotal).toBeCloseTo(90);
    expect(off.incomplete).toBe(false);
  });
});

// Plug-in and range-extender hybrids draw two energies over the same km (Martin, 2026-11-20).
describe("calcTco -- two energies", () => {
  const full = (r: ReturnType<typeof calcTco>) => r.lines.find((l) => l.key === "fuel");
  it("prices a PHEV's petrol AND its electricity", () => {
    // Golf 8 eHybrid WLTP 1.2 l + 14.8 kWh, ×1.15 real-world -> 1.4 l + 17 kWh.
    const r = calcTco({ ...car, consumptionPer100: 1.4, extraEnergy: { fuelType: "electric", consumptionPer100: 17, basis: "b" } }, 15000);
    expect(full(r)?.yearly).toBeCloseTo(150 * (1.4 * 1.85 + 17 * 0.25)); // 388.5 + 637.5
    expect(full(r)?.label).toBe("Fuel & electricity");
    expect(full(r)?.detail).toContain("(b)");
  });
  it("prices an EREV's electricity AND its range-extender petrol", () => {
    const r = calcTco({ ...car, fuelType: "electric", consumptionPer100: 13.2, extraEnergy: { fuelType: "petrol", consumptionPer100: 0.7, basis: "b" } }, 15000);
    expect(full(r)?.yearly).toBeCloseTo(150 * (13.2 * 0.25 + 0.7 * 1.85));
  });
  it("keeps a single-energy car (and a bi-fuel LPG car) on one price", () => {
    expect(full(calcTco({ ...car, fuelType: "lpg", consumptionPer100: 10.6 }, 15000))?.yearly).toBeCloseTo(150 * 10.6 * 0.8);
    expect(full(calcTco(car, 15000))?.label).toBe("Fuel");
  });
  it("shows no data when the primary figure is missing, even with a second energy", () => {
    expect(full(calcTco({ ...car, consumptionPer100: null, extraEnergy: { fuelType: "electric", consumptionPer100: 17, basis: "b" } }, 15000))?.yearly).toBeNull();
  });
});

describe("realWorldPhev", () => {
  it("turns the WLTP-weighted pair into a typical private owner's use (ICCT 2022)", () => {
    // Golf 8 eHybrid: 1.2 l + 14.8 kWh official -> 3.0 l + 10.2 kWh.
    expect(realWorldPhev(1.2, 14.8)).toEqual({ petrol: 3, kwh: 10.2 });
    expect(realWorldPhev(null, 14.8).petrol).toBeNull();
  });
});
