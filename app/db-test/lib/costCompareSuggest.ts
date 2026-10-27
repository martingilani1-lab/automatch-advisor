// "Add a vehicle" helpers for the cost comparison (CostCompare.tsx): the brand -> model ->
// phase cascade, and the "Suggested" list shown above it -- the same model in another
// phase/generation first, then cars of the same class at a similar price, so a buyer
// comparing an Octavia sees other Octavias and its real rivals before the whole catalog.
import type { CarData } from "@/app/lib/carFields";
import { carPriceMax, carPriceMin } from "@/app/lib/carFields";

// /api/db-test builds CarData.model as "<model name> (<generation code>) <phase label>"
// (modelLabel in app/api/db-test/route.ts); the bare model name is everything before the
// generation code, the generation code is what's inside the parentheses.
export function modelName(c: CarData): string {
  const base = c.phaseLabel && c.model.endsWith(c.phaseLabel) ? c.model.slice(0, -c.phaseLabel.length).trim() : c.model;
  return base.split(" (")[0].trim();
}
export function generationCode(c: CarData): string | null {
  return c.model.match(/\(([^)]+)\)/)?.[1] ?? null;
}
// Phase picker label once brand + model are already chosen: "5F · Pre-facelift (2012–2016)".
export function phaseOptionLabel(c: CarData): string {
  const parts = [generationCode(c), c.phaseLabel].filter(Boolean).join(" · ");
  return `${parts || c.model}${c.years ? ` (${c.years})` : ""}`;
}

const priceMid = (c: CarData) => (carPriceMin(c) + carPriceMax(c)) / 2;

export interface Suggestion {
  car: CarData;
  reason: string;
  score: number;
}

// Similarity to the closest already-compared car:
//   same brand + model (another phase or generation) ......... 100
//   same segment (catalog_models.segment: B, C, D, S, ...) ...  40
//   same primary body type ...................................  20
//   price: up to 30, falling linearly to 0 at ±100 % of that car's mid price
//   same brand ...............................................  10
// Same-model always outranks a rival; among rivals, class first, then price. Cars already in
// the comparison are never suggested. Nothing compared yet -> no suggestions (nothing to be
// similar to).
export function suggestSimilarCars(cars: CarData[], compared: CarData[], limit = 6): Suggestion[] {
  if (!compared.length) return [];
  const taken = new Set(compared.map((c) => c.id));
  const scored: Suggestion[] = [];
  for (const car of cars) {
    if (taken.has(car.id)) continue;
    let best: Suggestion | null = null;
    for (const ref of compared) {
      const sameModel = car.make === ref.make && modelName(car) === modelName(ref);
      const sameSegment = !!car.segment && car.segment === ref.segment;
      const refMid = priceMid(ref);
      const priceScore = refMid > 0 && priceMid(car) > 0 ? 30 * Math.max(0, 1 - Math.abs(priceMid(car) - refMid) / refMid) : 0;
      const score =
        (sameModel ? 100 : 0) + (sameSegment ? 40 : 0) + (car.body && car.body === ref.body ? 20 : 0) + priceScore + (car.make === ref.make ? 10 : 0);
      const reason = sameModel
        ? generationCode(car) === generationCode(ref) ? "Same model, other phase" : "Same model, other generation"
        : sameSegment && priceScore >= 22.5 // within ±25 % of the price
          ? "Same class, similar price"
          : sameSegment
            ? "Same class"
            : "Similar price";
      if (!best || score > best.score) best = { car, reason, score };
    }
    // A candidate with no class match and no price overlap isn't "similar" at all.
    if (best && best.score >= 40) scored.push(best);
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
