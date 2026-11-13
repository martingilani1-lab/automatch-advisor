// Wear costs and possible faults (app/db-test/lib/repairBuffer.ts) and how calcTco uses them.
// Figures are the BMW i3 (I01) data from 20261112150500 + 20261112160500 (Martin, 2026-11-12).
// Rule under test (Martin, 2026-11-14): wear is spread over the year; possible faults are listed
// with a one-off repair cost and are never part of the yearly total.
import { describe, it, expect } from "vitest";
import { calculateRepairBuffer, faultTitle, likelihoodWord, type BufferFault } from "@/app/db-test/lib/repairBuffer";
import { calcTco, type TcoInput } from "@/app/db-test/lib/tco";
import { EMPTY_UNIT_SERVICE } from "@/app/catalog/lib/engineMaintenance";

const fault = (o: Partial<BufferFault> & { fault: string }): BufferFault => ({
  severity: null, estimatedCostEurMin: null, estimatedCostEurMax: null, annualProbability: null,
  affectedYearFrom: null, affectedYearTo: null, prePurchaseCheck: null, ...o,
});

const i3Faults: BufferFault[] = [
  fault({ fault: '12 V battery drain -- "drive train malfunction" warnings, the car won\'t wake up.', severity: "minor", estimatedCostEurMin: 250, estimatedCostEurMax: 250, annualProbability: 0.25 }),
  fault({ fault: "Brake disc corrosion -- regenerative braking leaves the friction brakes barely used.", severity: "moderate", estimatedCostEurMin: 450, estimatedCostEurMax: 450, annualProbability: 0.33333 }),
  fault({ fault: "A/C compressor failure contaminates the battery cooling circuit -- y.", severity: "critical", estimatedCostEurMin: 4000, estimatedCostEurMax: 7500, annualProbability: 0.002 }),
  fault({ fault: "Left electric-motor mount or its support fails on early cars (BMW service bulletin SI B22 01 15: z) -- clunk.", severity: "moderate", estimatedCostEurMin: 1200, estimatedCostEurMax: 1200, annualProbability: 0.02, affectedYearTo: 2015, prePurchaseCheck: "Check the mount." }),
  fault({ fault: "High-voltage battery module failure -- one of eight modules.", severity: "critical", estimatedCostEurMin: 3500, estimatedCostEurMax: 3500 }),
  fault({ fault: "KLE (on-board AC charger) failure -- AC charging stops.", severity: "critical" }),
];
const tyres = { frontCostEur: 300, frontLifeKm: 40000, rearCostEur: 300, rearLifeKm: 20000 };

describe("calculateRepairBuffer -- wear", () => {
  it("spreads wear parts over their life and tyres over mileage", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    const y = (t: string) => b.wear.find((w) => w.title === t)?.yearly;
    expect(y("12 V battery drain")).toBeCloseTo(62.5);
    expect(y("Brake disc corrosion")).toBeCloseTo(150, 1);
    expect(y("Rear tyres")).toBeCloseTo(225);
    expect(y("Front tyres")).toBeCloseTo(112.5);
    expect(b.partsYearly).toBeCloseTo(212.5, 1);
    expect(b.tyresYearly).toBeCloseTo(337.5);
    expect(b.wearYearly).toBeCloseTo(550, 0);
    expect(b.wear.find((w) => w.title === "12 V battery drain")?.basis).toBe("about every 4 years");
  });
  it("never puts a possible fault into the yearly figure", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    expect(b.wear.map((w) => w.title)).not.toContain("A/C compressor failure contaminates the battery cooling circuit");
    expect(b.wearYearly).toBeCloseTo(212.5 + 337.5, 1); // no A/C, motor mount or module share
  });
  it("scales tyre wear with mileage", () => {
    expect(calculateRepairBuffer([], tyres, 30000, 2018).tyresYearly).toBeCloseTo(675);
    expect(calculateRepairBuffer([], tyres, 30000, 2018).hasFaultData).toBe(false);
  });
  it("sorts the biggest yearly cost first", () => {
    const ys = calculateRepairBuffer(i3Faults, tyres, 15000, 2015).wear.map((w) => w.yearly);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
  });
});

describe("calculateRepairBuffer -- possible faults", () => {
  it("lists them with a one-off cost and a likelihood word, most severe and dearest first", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2015);
    expect(b.possibleFaults.map((f) => [f.title, f.costMin, f.costMax, f.likelihood])).toEqual([
      ["A/C compressor failure contaminates the battery cooling circuit", 4000, 7500, "rare"],
      ["High-voltage battery module failure", 3500, 3500, "unknown"],
      ["KLE failure", null, null, "unknown"],
      ["Left electric-motor mount or its support fails on early cars", 1200, 1200, "occasional"],
    ]);
    expect(b.possibleFaults.find((f) => f.title.startsWith("Left"))?.prePurchaseCheck).toBe("Check the mount.");
  });
  it("leaves out a fault outside its build years and says so", () => {
    const b = calculateRepairBuffer(i3Faults, tyres, 15000, 2017);
    expect(b.possibleFaults.some((f) => f.title.startsWith("Left"))).toBe(false);
    expect(b.notThisYear).toEqual([{ title: "Left electric-motor mount or its support fails on early cars", years: "up to 2015" }]);
  });
  it("keeps a year-limited fault when the year is unknown", () => {
    expect(calculateRepairBuffer(i3Faults, null, 15000, null).possibleFaults.some((f) => f.title.startsWith("Left"))).toBe(true);
  });
  it("words the likelihood from the yearly share of cars", () => {
    expect([null, 0.002, 0.009, 0.01, 0.049, 0.05, 0.19].map(likelihoodWord))
      .toEqual(["unknown", "rare", "rare", "occasional", "occasional", "common", "common"]);
  });
});

describe("faultTitle", () => {
  it("shortens fault text to a row name", () => {
    expect(faultTitle("12 V battery drain -- the car won't wake up.")).toBe("12 V battery drain");
    expect(faultTitle("KLE (on-board AC charger) failure -- AC charging stops.")).toBe("KLE failure");
    expect(faultTitle("Front suspension (lower arm bushes) knocks; steering rack noise.")).toBe("Front suspension knocks; steering rack noise");
  });
});

describe("calcTco with wear data", () => {
  const ev: TcoInput = {
    priceEur: 15000, manufactureYear: 2015, fuelType: "electric", consumptionPer100: 15, powerKw: 125,
    engineReliabilityRating: 4, engineYearlyServiceEur: 135, timingBelt: null,
    gearbox: { label: "single-speed", reliabilityRating: 5, service: EMPTY_UNIT_SERVICE },
    drivetrain: null,
  };
  const line = (r: ReturnType<typeof calcTco>, k: string) => r.lines.find((l) => l.key === k);

  it("replaces the rating reserve with wear parts only, and uses car-specific tyres", () => {
    const r = calcTco({ ...ev, faults: i3Faults, tyreWear: tyres }, 15000, 2026);
    expect(line(r, "repairs")?.yearly).toBeCloseTo(212.5, 1);
    expect(line(r, "repairs")?.label).toBe("Wear parts");
    expect(line(r, "tires")?.yearly).toBeCloseTo(337.5 + 90); // + 2 seasonal swaps × €45
  });
  it("falls back to the rating reserve and generic tyres without wear data", () => {
    const r = calcTco(ev, 15000, 2026);
    expect(line(r, "repairs")?.yearly).toBe(200); // good engine, good gearbox
    expect(line(r, "repairs")?.label).toBe("Unexpected repairs reserve");
    expect(line(r, "tires")?.yearly).toBeCloseTo(150 + 90);
  });
  it("keeps the rating reserve when the car has faults but no wear parts", () => {
    const onlyRisk = i3Faults.filter((f) => (f.annualProbability ?? 0) < 0.2);
    expect(line(calcTco({ ...ev, faults: onlyRisk }, 15000, 2026), "repairs")?.yearly).toBe(200);
  });
});
