// TCO calculator math (app/db-test/lib/tco.ts).
import { describe, it, expect } from "vitest";
import { calcTco, insuranceEstimate, type TcoInput } from "@/app/db-test/lib/tco";

const car: TcoInput = {
  priceEur: 10000, fuelType: "petrol", consumptionPer100: 6, powerKw: 81, reliabilityRating: 4,
  yearlyServiceEur: 200, timingBeltCostEur: 480, timingBeltIntervalKm: 120000,
};
const line = (r: ReturnType<typeof calcTco>, k: string) => r.lines.find((l) => l.key === k)!.yearly;

describe("calcTco", () => {
  it("computes each category at 15 000 km", () => {
    const r = calcTco(car, 15000);
    expect(line(r, "fuel")).toBeCloseTo(150 * 6 * 1.6); // 1440
    expect(line(r, "maintenance")).toBeCloseTo(200 + 60); // belt 480/120k × 15k
    expect(line(r, "tires")).toBeCloseTo(150 + 60);
    expect(line(r, "repairs")).toBe(200);
    expect(line(r, "fixed")).toBe(100);
    expect(line(r, "insurance")).toBe(110);
    expect(line(r, "depreciation")).toBe(1000);
    expect(r.yearlyTotal).toBeCloseTo(1440 + 260 + 210 + 200 + 100 + 110 + 1000);
    expect(r.monthlyTotal).toBeCloseTo(r.yearlyTotal / 12);
    expect(r.incomplete).toBe(false);
  });
  it("scales with mileage, with the repair reserve clamped", () => {
    expect(line(calcTco(car, 30000), "fuel")).toBeCloseTo(2880);
    expect(line(calcTco(car, 50000), "repairs")).toBe(300); // capped at 1.5×
    expect(line(calcTco(car, 5000), "repairs")).toBe(100); // floored at 0.5×
  });
  it("does not prorate a timing job without an interval (chain)", () => {
    expect(line(calcTco({ ...car, timingBeltIntervalKm: null }, 15000), "maintenance")).toBe(200);
  });
  it("gives an unrated engine the average reserve, never the cheapest", () => {
    expect(line(calcTco({ ...car, reliabilityRating: null }, 15000), "repairs")).toBe(500);
    expect(line(calcTco({ ...car, reliabilityRating: 2 }, 15000), "repairs")).toBe(800);
  });
  it("leaves unknown categories out of the total and flags it", () => {
    const r = calcTco({ ...car, consumptionPer100: null, priceEur: null }, 15000);
    expect(line(r, "fuel")).toBeNull();
    expect(r.incomplete).toBe(true);
    expect(r.yearlyTotal).toBeCloseTo(260 + 210 + 200 + 100 + 110);
  });
  it("prices insurance by power bands", () => {
    expect([99, 100, 150, 151].map(insuranceEstimate)).toEqual([110, 150, 150, 180]);
  });
});
