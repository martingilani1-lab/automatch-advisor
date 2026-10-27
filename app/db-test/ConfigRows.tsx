import { IconManualGearbox, IconAutomaticGearbox, IconCar, IconCar4wd, IconGasStation } from "@tabler/icons-react";

import type { CatalogConfig } from "@/app/catalog/lib/types";
import { consumptionLabel, drivetrainLabel } from "@/app/catalog/lib/configDisplay";
import { gearboxTypeLabel } from "@/app/catalog/lib/gearboxLabel";
import type { ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";

interface ConfigRowsProps {
  configs: CatalogConfig[];
  onNavigate: (target: ConfigNavTarget) => void;
}

// One color per field, reusing the exact drivetrain/consumption hues the car-list widget's
// icon row already established (CarRow.tsx's SPEC_ICON_COLORS) so the same stat reads as the
// same color everywhere in the app -- transmission/body are new here, picked to stay
// distinct from those two and from REL_COLORS' tier palette.
const CONFIG_ICON_COLORS = { transmission: "#60a5fa", body: "#34d399", drivetrain: "#a78bfa", consumption: "#4dd0e1" };

// A catalog_engines.display_name sometimes already embeds power ("1.9 TDI 66kW (Wastegate)",
// "1.0 TSI 85kW"), sometimes doesn't ("1.6 MPI") -- confirmed across several seed migrations.
// Appending `${powerKw} kW` unconditionally (the original bug here) doubled it on every
// engine whose name already carries it. Same check duplicated in app/api/db-test/route.ts's
// detail-POST engine-label construction (Engines tab), which has the identical bug from the
// identical cause -- small enough, and display-spot-specific enough, to duplicate rather than
// share.
function hasEmbeddedPower(name: string): boolean {
  return /\d+\s*kw\b/i.test(name);
}

// db-test-only forks of configDisplay.ts's engineLabel/sortConfigs -- that file's own header
// comment says engineLabel/sortConfigs are shared with /catalog specifically so the two
// pages' text never drifts apart, so this is a deliberate, requested exception for db-test's
// Configurations rows only: no "(X hp)" suffix, and sorted by displacement (smallest to
// biggest) within each fuel group instead of by power. /catalog's ConfigurationsTable.tsx
// still imports the originals, untouched.
// Exported so the Costs tab (TcoCalculator.tsx) labels configurations the same way.
export function dbTestEngineLabel(c: CatalogConfig): string {
  const name = c.engine.displayName ?? c.engine.code;
  return hasEmbeddedPower(name) ? name : `${name} ${c.engine.powerKw} kW`;
}

// "5-speed manual" / "6-speed automatic" -- speed + type only, no transmission_units.code
// prefix (gearboxHeaderLabel in app/catalog/lib/gearboxLabel.ts, used elsewhere for the
// Gearboxes tab's own header, returns "<code> · <descriptor>"; this reuses that file's
// already-exported gearboxTypeLabel to build just the descriptor half, not a copy of its
// logic under a new name).
function dbTestTransmissionLabel(c: CatalogConfig): string {
  const typeLabel = gearboxTypeLabel(c.gearbox.family);
  if (c.gearbox.family === "single_speed" || !typeLabel) return typeLabel;
  return c.gearbox.speeds != null ? `${c.gearbox.speeds}-speed ${typeLabel}` : typeLabel;
}

// Same fuel-group order as configDisplay.ts's sortConfigs (petrol < lpg < diesel < hybrid <
// phev < electric -- petrol/diesel first as asked, hybrid/electric last), but ranks within a
// fuel group by displacementCc instead of powerKw. A handful of rows (mostly electric
// engines) have a null displacementCc -- those sort after every known displacement in their
// fuel group rather than colliding at 0, which would wrongly claim to be the smallest.
// Exported so the Engines tab (CarDetail.tsx) can group that tab's own engine list the same
// way -- same fuel-group order and header copy the user asked to reuse, no second copy of
// either table.
export const FUEL_SORT_ORDER: Record<string, number> = {
  petrol: 0, lpg: 1, diesel: 2, hybrid: 3, phev: 4, electric: 5,
};

function dbTestSortConfigs(configs: CatalogConfig[]): CatalogConfig[] {
  return [...configs].sort((a, b) => {
    const fuelDiff = (FUEL_SORT_ORDER[a.engine.fuelType] ?? 99) - (FUEL_SORT_ORDER[b.engine.fuelType] ?? 99);
    if (fuelDiff !== 0) return fuelDiff;
    const dispA = a.engine.displacementCc ?? Infinity;
    const dispB = b.engine.displacementCc ?? Infinity;
    if (dispA !== dispB) return dispA - dispB;
    const powerDiff = a.engine.powerKw - b.engine.powerKw;
    if (powerDiff !== 0) return powerDiff;
    const bodyDiff = a.bodyName.localeCompare(b.bodyName);
    if (bodyDiff !== 0) return bodyDiff;
    return dbTestTransmissionLabel(a).localeCompare(dbTestTransmissionLabel(b));
  });
}

// One small header per fuel group, not per row -- dbTestSortConfigs above already keeps a
// fuel type's rows contiguous, so the render loop just watches for the fuel type changing
// from the previous row to know when to drop in a new header.
const FUEL_GROUP_LABELS: Record<string, string> = {
  petrol: "Petrol variants", lpg: "LPG variants", diesel: "Diesel variants",
  hybrid: "Hybrid variants", phev: "Plug-in hybrid variants", electric: "Electric variants",
};
export function fuelGroupLabel(fuelType: string): string {
  return FUEL_GROUP_LABELS[fuelType] || `${fuelType.charAt(0).toUpperCase()}${fuelType.slice(1)} variants`;
}

// db-test's own native-styled Configurations tab -- same data/sorting/formatting as
// /catalog's ConfigurationsTable.tsx (both import from ../catalog/lib/configDisplay.ts), but
// rendered with this page's existing hand-rolled classes (.eq-item, .cgrid/.cgrid-item-btn --
// the same clickable-tile pattern GearboxAccordion's "Maintenance" toggle already uses)
// instead of the Tailwind catalog-* table, which looked visually foreign dropped into this
// page's card/pill design.
export default function ConfigRows({ configs, onNavigate }: ConfigRowsProps) {
  if (configs.length === 0) return null;
  const sorted = dbTestSortConfigs(configs);

  return (
    <div>
      {sorted.map((c, i) => (
        <div key={c.id}>
          {c.engine.fuelType !== sorted[i - 1]?.engine.fuelType && (
            // i === 0's header is the very first thing in the tab -- no margin-top needed
            // (every other group header does need the extra gap, but each header here is
            // nested inside its own row's wrapper div, not a true sibling of the others, so
            // a :first-child CSS rule can't distinguish "first in this row" from "first
            // overall"; i === 0 is the only reliable check).
            <div className="cfg-group-header" style={i === 0 ? { marginTop: 0 } : undefined}>
              {fuelGroupLabel(c.engine.fuelType)}
            </div>
          )}
          <div className="eq-item">
            <button
              type="button"
              className="cfg-link"
              style={{ display: "block", fontWeight: 700, fontSize: ".85rem", marginBottom: 8 }}
              onClick={() => onNavigate({ kind: "engine", id: c.engine.id })}
            >
              {dbTestEngineLabel(c)}
            </button>
            <div className="cgrid">
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={() => onNavigate({ kind: "unit", id: c.gearbox.id })}
              >
                <div className="cgrid-icon-cell">
                  {c.gearbox.family === "manual" ? (
                    <IconManualGearbox size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.transmission }} />
                  ) : (
                    <IconAutomaticGearbox size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.transmission }} />
                  )}
                </div>
                <div className="cgrid-val cfg-link">{dbTestTransmissionLabel(c)}</div>
              </div>
              <div className="cgrid-item">
                <div className="cgrid-icon-cell">
                  <IconCar size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.body }} />
                </div>
                <div className="cgrid-val">{c.bodyName}</div>
              </div>
              {c.drivetrain ? (
                <div
                  className="cgrid-item cgrid-item-btn"
                  onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}
                >
                  <div className="cgrid-icon-cell">
                    <IconCar4wd size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.drivetrain }} />
                  </div>
                  <div className="cgrid-val cfg-link">{drivetrainLabel(c)}</div>
                </div>
              ) : (
                <div className="cgrid-item">
                  <div className="cgrid-icon-cell">
                    <IconCar4wd size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.drivetrain }} />
                  </div>
                  <div className="cgrid-val">FWD</div>
                </div>
              )}
              <div className="cgrid-item">
                <div className="cgrid-icon-cell">
                  <IconGasStation size={16} stroke={1.5} style={{ color: CONFIG_ICON_COLORS.consumption }} />
                </div>
                <div className="cgrid-val">{consumptionLabel(c)}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
