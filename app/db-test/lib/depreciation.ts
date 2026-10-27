// Age-based annual depreciation for the TCO calculator (Martin, 2026-10-27). Replaces a flat
// "10 % of price per year" with a curve: used cars lose value fast while young, then slower,
// then hit a price floor where they lose a small fixed amount a year.
//
//   age 0–3   -> 15 % of the current price
//   age 4–8   -> 10 %
//   age 9–13  ->  5 %
//   age 14+   -> flat €200/year (never more than the car is worth)
//
// Pure and self-contained -- no imports, so it can be used anywhere (TCO calculator, tests,
// a future quiz cost estimate).

export const DEPRECIATION_FLOOR_EUR = 200;

export function calculateAnnualDepreciation(currentPrice: number, manufactureYear: number, currentYear = 2026): number {
  // Nothing to lose on a missing, zero or nonsensical price.
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return 0;

  // A manufacture year in the future (bad input) is treated as a brand-new car rather than
  // a negative age.
  const carAge = Math.max(0, currentYear - manufactureYear);

  if (carAge <= 3) return currentPrice * 0.15;
  if (carAge <= 8) return currentPrice * 0.1;
  if (carAge <= 13) return currentPrice * 0.05;
  return Math.min(DEPRECIATION_FLOOR_EUR, currentPrice);
}
