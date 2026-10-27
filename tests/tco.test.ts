// TCO calculator math (app/db-test/lib/tco.ts) -- per configuration.
import { describe, it, expect } from "vitest";
import { calcTco, insuranceEstimate, proratedYearly, rankedLines, type TcoInput } from "@/app/db-test/lib/tco";
import { EMPTY_UNIT_SERVICE } from "@/app/catalog/lib/engineMaintenance";

const svc = (km: number | null, yrs: number | null, min: number | null, max: number | null) =>
  ({ intervalKm: km, intervalYears: yrs, costEurMin: min, costEurMax: max });

// 1.0 TSI-ish petrol, 6 l real-world, good engine, VW 02J-like manual, FWD.
const car: TcoInput = {
  priceEur: 10000, fuelType: "petrol", consumptionPer100: 6, powerKw: 81,
  engineReliabilityRating: 4, engineYearlyServiceEur: 200,
  timingBelt: svc(120000, null, 400, 560),
  gearbox: { label: "VW 02J", reliabilityRating: 4, service: svc(60000, null, 40, 80) },
  drivetrain: null,
};
const line = (r: ReturnType<typeof calcTco>, k: string) => r.lines.find((l) => l.key === k)?.yearly;

describe("calcTco", () => {
  it("computes each category at 15 000 km", () => {
    const r = calcTco(car, 15000);
    expect(line(r, "fuel")).toBeCloseTo(150 * 6 * 1.85); // 1665
    expect(line(r, "engine")).toBeCloseTo(200 + 60); // belt €480 / 120k × 15k
    expect(line(r, "gearbox")).toBeCloseTo(15); // €60 / 60k × 15k
    expect(line(r, "drivetrain")).toBeUndefined(); // FWD: no AWD line at all
    expect(line(r, "tires")).toBeCloseTo(150 + 60);
    expect(line(r, "repairs")).toBe(200); // good engine + good gearbox (+0)
    expect(line(r, "fixed")).toBe(100);
    expect(line(r, "insurance")).toBe(110);
    expect(line(r, "depreciation")).toBe(1000);
    expect(r.yearlyTotal).toBeCloseTo(1665 + 260 + 15 + 210 + 200 + 100 + 110 + 1000);
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
    expect(r.yearlyTotal).toBeCloseTo(260 + 210 + 200 + 100 + 110 + 1000);
  });
  it("prices insurance by power bands", () => {
    expect([99, 100, 150, 151].map(insuranceEstimate)).toEqual([110, 150, 150, 180]);
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
