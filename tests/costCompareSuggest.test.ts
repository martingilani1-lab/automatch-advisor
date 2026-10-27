// "Add a vehicle" suggestions + cascade label parsing (app/db-test/lib/costCompareSuggest.ts).
import { describe, it, expect } from "vitest";
import type { CarData } from "@/app/lib/carFields";
import { generationCode, modelName, phaseOptionLabel, suggestSimilarCars } from "@/app/db-test/lib/costCompareSuggest";

function car(id: string, make: string, name: string, gen: string, phase: string, segment: string, body: string, price: number): CarData {
  return {
    id, make, model: `${name} (${gen}) ${phase}`, phaseLabel: phase, gen: "", years: "2020–2024",
    body, segment, fuel: [], pricing: { euPriceMin: price * 0.8, euPriceMax: price * 1.2 },
  } as unknown as CarData;
}

const octNX = car("o1", "Škoda", "Octavia", "NX", "Pre-facelift", "C", "Liftback", 25000);
const octNXfl = car("o2", "Škoda", "Octavia", "NX", "Facelift", "C", "Liftback", 30000);
const oct5E = car("o3", "Škoda", "Octavia", "5E", "Facelift", "C", "Liftback", 15000);
const golf = car("g1", "Volkswagen", "Golf", "CD1", "Pre-facelift", "C", "Hatchback", 24000);
const leon = car("l1", "SEAT", "León", "KL", "Pre-facelift", "C", "Hatchback", 40000);
const fabia = car("f1", "Škoda", "Fabia", "PJ", "Pre-facelift", "B", "Hatchback", 15000);
const tt = car("t1", "Audi", "TT", "FV", "Pre-facelift", "S", "Coupe", 60000);
const all = [octNX, octNXfl, oct5E, golf, leon, fabia, tt];

describe("label parsing", () => {
  it("splits the server's model label", () => {
    expect(modelName(octNX)).toBe("Octavia");
    expect(generationCode(octNX)).toBe("NX");
    expect(phaseOptionLabel(octNX)).toBe("NX · Pre-facelift (2020–2024)");
  });
});

describe("suggestSimilarCars", () => {
  it("puts the same model first, then same-class rivals by price; never the compared car", () => {
    const s = suggestSimilarCars(all, [octNX]);
    expect(s.map((x) => x.car.id).slice(0, 2)).toEqual(["o2", "o3"]); // other Octavia phases first
    expect(s[0].reason).toBe("Same model, other phase");
    expect(s[1].reason).toBe("Same model, other generation");
    expect(s[2].car.id).toBe("g1"); // same class, near-identical price beats the dearer León
    expect(s[2].reason).toBe("Same class, similar price");
    expect(s.some((x) => x.car.id === "o1")).toBe(false);
    expect(s.some((x) => x.car.id === "t1")).toBe(false); // different class, far off on price
  });
  it("suggests nothing before anything is compared", () => {
    expect(suggestSimilarCars(all, [])).toEqual([]);
  });
});
