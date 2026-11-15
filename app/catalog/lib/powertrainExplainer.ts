import type { CatalogEngine } from "./types";

// Plain-language "how this powertrain works" text for the engine card. An electrified engine
// row stands for a combination of units (motor, battery, sometimes a petrol engine) that the
// raw fields alone don't explain -- the same reason a gearbox card nests its drivetrain
// system as its own block (GearboxPanel.tsx). Keyed by catalog_engines.hybrid_type (frozen
// vocabulary MHEV / HEV / PHEV / EREV, scripts/catalog-vocabularies.json) plus the pure-EV
// case (fuel_type 'electric', hybrid_type NULL). A conventional engine gets no explainer:
// there is nothing non-obvious to explain.
//
// Generic by design: these sentences describe the technology, never one car's numbers (those
// stay in the fields below the explainer, sourced per row). If a new hybrid_type value is ever
// added to the CHECK constraint, add its entry here too -- an unknown kind just renders no
// explainer rather than a wrong one.

export type PowertrainKind = "EV" | "EREV" | "PHEV" | "HEV" | "MHEV";

export interface PowertrainExplainer {
  title: string;
  body: string;
}

export const POWERTRAIN_EXPLAINERS: Record<PowertrainKind, PowertrainExplainer> = {
  EV: {
    title: "Battery-electric",
    body:
      "An electric motor drives the wheels from a battery you charge from the grid. No engine, no oil changes -- range and charging speed depend on the battery and charger below.",
  },
  EREV: {
    title: "Electric with range extender (EREV)",
    body:
      "The wheels are always driven by the electric motor. A small petrol engine works only as a generator: when the battery runs low it starts and makes electricity, it never drives the wheels. Charge it like an EV for daily driving; the petrol tank is a reserve for longer trips. It is two units in one car -- the electric drive and the range extender -- so their figures are shown as two separate groups.",
  },
  PHEV: {
    title: "Plug-in hybrid (PHEV)",
    body:
      "A petrol or diesel engine and an electric motor can both drive the wheels. The battery is charged from the grid and covers short trips electrically; on longer trips the engine takes over, so it needs the usual engine servicing.",
  },
  HEV: {
    title: "Full hybrid (HEV)",
    body:
      "A combustion engine and an electric motor work together; the small battery is charged while driving and braking, never from a plug. It can move short distances on electricity alone, mostly in town.",
  },
  MHEV: {
    title: "Mild hybrid (MHEV)",
    body:
      "A combustion engine with a small 48 V (or 12 V) electric assist that helps when pulling away and lets the engine switch off while coasting. It cannot drive on electricity alone.",
  },
};

// Which explainer applies to an engine row, or null for a conventional engine.
export function powertrainKind(engine: Pick<CatalogEngine, "fuelType" | "hybridType">): PowertrainKind | null {
  if (engine.hybridType && engine.hybridType in POWERTRAIN_EXPLAINERS) {
    return engine.hybridType as PowertrainKind;
  }
  if (engine.fuelType === "electric") return "EV";
  return null;
}
