// Age-based depreciation curve (app/db-test/lib/depreciation.ts).
import { describe, it, expect } from "vitest";
import { calculateAnnualDepreciation } from "@/app/db-test/lib/depreciation";

describe("calculateAnnualDepreciation", () => {
  it("applies each age band, boundaries included", () => {
    expect(calculateAnnualDepreciation(20000, 2026)).toBe(3000); // age 0 -> 15 %
    expect(calculateAnnualDepreciation(20000, 2023)).toBe(3000); // age 3 -> 15 %
    expect(calculateAnnualDepreciation(20000, 2022)).toBe(2000); // age 4 -> 10 %
    expect(calculateAnnualDepreciation(20000, 2018)).toBe(2000); // age 8 -> 10 %
    expect(calculateAnnualDepreciation(20000, 2017)).toBe(1000); // age 9 -> 5 %
    expect(calculateAnnualDepreciation(20000, 2013)).toBe(1000); // age 13 -> 5 %
    expect(calculateAnnualDepreciation(20000, 2012)).toBe(200); // age 14 -> flat €200
  });
  it("never takes more than the car is worth at the floor", () => {
    expect(calculateAnnualDepreciation(150, 2005)).toBe(150);
  });
  it("respects a custom current year", () => {
    expect(calculateAnnualDepreciation(10000, 2020, 2030)).toBe(500); // age 10 -> 5 %
  });
  it("handles bad input safely", () => {
    expect(calculateAnnualDepreciation(0, 2015)).toBe(0);
    expect(calculateAnnualDepreciation(NaN, 2015)).toBe(0);
    expect(calculateAnnualDepreciation(10000, 2030)).toBe(1500); // future year -> treated as new
  });
});
