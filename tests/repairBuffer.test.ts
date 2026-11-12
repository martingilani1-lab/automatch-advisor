// Maintenance & repair buffer (app/db-test/lib/repairBuffer.ts) and how calcTco uses it.
// Figures are the BMW i3 (I01) data from 20261112150500 + 20261112160500 (Martin, 2026-11-12).
import { describe, it, expect } from "vitest";
import { calculateRepairBuffer, faultTitle, type BufferFault } from "@/app/db-test/lib/repairBuffer";
import { calcTco, type TcoInput } from "@/app/db-test/lib/tco";
import { EMPTY_UNIT_SERVICE } from "@/app/catalog/lib/engineMaintenance";

const fault = (o: Partial<BufferFault> & { fault: string }): BufferFault => ({
  severity: null, estimatedCostEurMin: null, estimatedCostEurMax: null, annualProbability: null,
  affectedYearFrom: null, affectedYearTo: null, prePurchaseCheck: null, ...o,
});

const i3Faults: BufferFault[] = [
  fault({ fault: '12 V battery drain -- "drive train malfunction" warnings, the car won\'t wake up.', estimatedCostEurMin: 250, estimatedCostEurMax: 250, annualProbability: 0.25 }),
  fault({ fault: "Brake disc corrosion -- regenerative braking leaves the friction brakes barely used.", estimatedCostEurMin: 450, estimatedCostEurMax: 450, annualProbability: 0.33333 }),
  fault({ fault: "A/C compressor failure contaminates the battery cooling circuit -- y.", estimatedCostEurMin: 4000, estimatedCostEurMax: 7500, annualProbability: 0.002 }),
  fault({ fault: "Left electric-motor mount or its support fails on early cars (BMW service bulletin SI B22 01 15: z) -- clunk.", estimatedCostEurMin: 1200, estimatedCostEurMax: 1200, annualProbability: 0.02, affectedYearTo: 2015, prePurchaseCheck: "Check the mount." }),
  fault({ fault: "High-voltage battery module failure -- one of eight modules.", estimatedCostEurMin: 3500, estimatedCostEurMax: 3500 }),
  fault({ fault: "KLE (on-board AC charger) failure -- AC charging stops." }),
];
const tyres = { frontCostEur: 300, frontLifeKm: 40000, rearCostEur: 300, rearLifeKm: 20000 };

describe("calculateRepairBuffer", () => {
  it("prices wear by time, wear by km and risk with one expected-cost formula", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    const y = (t: string) => b.items.find((i) => i.title === t)?.yearly;
    expect(y("12 V battery drain")).toBeCloseTo(62.5);
    expect(y("Brake disc corrosion")).toBeCloseTo(150, 1);
    expect(y("A/C compressor failure contaminates the battery cooling circuit")).toBeCloseTo(5750 * 0.002); // midpoint of 4 000-7 500
    expect(y("Left electric-motor mount or its support fails on early cars")).toBeCloseTo(24);
    expect(y("Rear tyres")).toBeCloseTo(225);
    expect(y("Front tyres")).toBeCloseTo(112.5);
    expect(b.tyresYearly).toBeCloseTo(337.5);
    expect(b.faultsYearly).toBeCloseTo(62.5 + 150 + 11.5 + 24, 1);
    expect(b.yearlyTotal).toBeCloseTo(b.faultsYearly + 337.5);
    expect(b.hasFaultData).toBe(true);
  });
  it("splits wear from risk by probability, for display only", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    const kind = (start: string) => b.items.find((i) => i.title.startsWith(start))?.kind;
    expect(kind("12 V")).toBe("wear-time");
    expect(kind("Brake")).toBe("wear-time");
    expect(kind("A/C")).toBe("risk");
    expect(kind("Rear tyres")).toBe("wear-km");
    expect(b.items.find((i) => i.title.startsWith("12 V"))?.basis).toBe("replaced about every 4 years");
    expect(b.items.find((i) => i.title.startsWith("A/C"))?.basis).toBe("0.2 % a year");
  });
  it("drops a fault outside its build years and says so", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2017);
    expect(b.items.some((i) => i.title.startsWith("Left electric-motor mount"))).toBe(false);
    expect(b.notThisYear).toEqual([{ title: "Left electric-motor mount or its support fails on early cars", years: "up to 2015" }]);
  });
  it("keeps a year-limited fault when the year is unknown", () => {
    expect(calculateRepairBuffer(i3Faults, null, 15000, null).items.some((i) => i.title.startsWith("Left"))).toBe(true);
  });
  it("never guesses an unpriced fault into the total", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    expect(b.unpriced.map((u) => [u.title, u.missing])).toEqual([
      ["High-voltage battery module failure", "probability"],
      ["KLE failure", "both"],
    ]);
  });
  it("scales tyre wear with mileage", () => {
    expect(calculateRepairBuffer([], tyres, 30000, 2018).tyresYearly).toBeCloseTo(675);
    expect(calculateRepairBuffer([], tyres, 30000, 2018).hasFaultData).toBe(false);
  });
  it("sorts the biggest yearly cost first", () => {
    const ys = calculateRepairBuffer(i3Faults, tyres, 15000, 2015).items.map((i) => i.yearly);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
  });
});

describe("faultTitle", () => {
  it("shortens fault text to a row name", () => {
    expect(faultTitle("12 V battery drain -- the car won't wake up.")).toBe("12 V battery drain");
    expect(faultTitle("KLE (on-board AC charger) failure -- AC charging stops.")).toBe("KLE failure");
    expect(faultTitle("Front suspension (lower arm bushes) knocks; steering rack noise.")).toBe("Front suspension knocks; steering rack noise");
  });
});

describe("calcTco with a repair buffer", () => {
  const ev: TcoInput = {
    priceEur: 15000, manufactureYear: 2015, fuelType: "electric", consumptionPer100: 15, powerKw: 125,
    engineReliabilityRating: 4, engineYearlyServiceEur: 135, timingBelt: null,
    gearbox: { label: "single-speed", reliabilityRating: 5, service: EMPTY_UNIT_SERVICE },
    drivetrain: null,
  };
  const line = (r: ReturnType<typeof calcTco>, k: string) => r.lines.find((l) => l.key === k)?.yearly;

  it("uses the priced faults instead of the rating reserve, and car-specific tyres", () => {
    const r = calcTco({ ...ev, faults: i3Faults, tyreWear: tyres }, 15000, 2026);
    expect(line(r, "repairs")).toBeCloseTo(r.buffer.faultsYearly);
    expect(line(r, "tires")).toBeCloseTo(337.5 + 90); // + 2 seasonal swaps × €45
  });
  it("falls back to the rating reserve and generic tyres without fault data", () => {
    const r = calcTco(ev, 15000, 2026);
    expect(line(r, "repairs")).toBe(200); // good engine, good gearbox
    expect(line(r, "tires")).toBeCloseTo(150 + 90);
    expect(r.buffer.hasFaultData).toBe(false);
  });
});
