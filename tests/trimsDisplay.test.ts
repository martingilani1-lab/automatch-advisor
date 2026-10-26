// Regression for the Trims tab's replace/inherit rule (app/catalog/lib/trimsDisplay.ts).
// 2026-10-26: Golf 1J Facelift Highline showed "Climatronic" as new AND kept the Basis trim's
// "Manual AC (optional)" in grey -- a standard item must supersede an inherited optional one.
import { describe, it, expect } from "vitest";
import { resolveTrimFeatures } from "@/app/catalog/lib/trimsDisplay";
import type { CatalogTrim } from "@/app/catalog/lib/types";

const f = (feature: string, featureGroup: string | null, isOptional = false) => ({ feature, featureGroup, isOptional });
const trim = (id: string, tier: string, features: ReturnType<typeof f>[]) =>
  ({ id, name: id, tier, features } as unknown as CatalogTrim);

describe("resolveTrimFeatures", () => {
  const basis = trim("Basis", "1", [f("ABS", null), f("Manual AC", "climate", true), f("15-inch steel wheels", "wheels")]);
  const comfort = trim("Comfortline", "3", [f("15-inch alloy wheels", "wheels")]);
  const high = trim("Highline", "4", [f("Climatronic", "climate"), f("16-inch alloy wheels", "wheels")]);
  const all = [basis, comfort, high];

  it("standard upgrade hides the inherited optional item and says what it was", () => {
    const rows = resolveTrimFeatures(high, basis, all);
    expect(rows.find((r) => r.feature === "Manual AC")).toBeUndefined();
    const c = rows.find((r) => r.feature === "Climatronic")!;
    expect(c.status).toBe("upgraded");
    expect(c.replacedFeature).toBe("Manual AC (optional)");
  });

  it("standard upgrade of a standard item still shows the previous version as 'was'", () => {
    const w = resolveTrimFeatures(high, basis, all).find((r) => r.feature === "16-inch alloy wheels")!;
    expect(w.status).toBe("upgraded");
    expect(w.replacedFeature).toBe("15-inch alloy wheels");
  });

  it("an optional item stays visible on trims that have nothing standard in its group", () => {
    const rows = resolveTrimFeatures(comfort, basis, all);
    const ac = rows.find((r) => r.feature === "Manual AC")!;
    expect(ac.status).toBe("inherited");
    expect(ac.isOptional).toBe(true);
    expect(rows.find((r) => r.feature === "ABS")!.status).toBe("inherited");
  });

  it("same text going from optional to standard is an upgrade, not a duplicate", () => {
    const a = trim("Attraction", "1", [f("Manual air conditioning", "climate", true)]);
    const b = trim("Ambiente", "3", [f("Manual air conditioning", "climate")]);
    const rows = resolveTrimFeatures(b, a, [a, b]);
    expect(rows.filter((r) => r.feature === "Manual air conditioning")).toHaveLength(1);
    expect(rows[0].replacedFeature).toBe("Manual air conditioning (optional)");
  });
});
