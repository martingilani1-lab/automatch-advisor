import type { CatalogConfig } from "@/app/catalog/lib/types";
import { consumptionLabel, drivetrainLabel, transmissionLabel } from "@/app/catalog/lib/configDisplay";
import type { ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";

interface ConfigRowsProps {
  configs: CatalogConfig[];
  onNavigate: (target: ConfigNavTarget) => void;
}

// db-test-only forks of configDisplay.ts's engineLabel/sortConfigs -- that file's own header
// comment says engineLabel/sortConfigs are shared with /catalog specifically so the two
// pages' text never drifts apart, so this is a deliberate, requested exception for db-test's
// Configurations rows only: no "(X hp)" suffix, and sorted by displacement (smallest to
// biggest) within each fuel group instead of by power. /catalog's ConfigurationsTable.tsx
// still imports the originals, untouched.
function dbTestEngineLabel(c: CatalogConfig): string {
  const name = c.engine.displayName ?? c.engine.code;
  return `${name} ${c.engine.powerKw} kW`;
}

// Same fuel-group order as configDisplay.ts's sortConfigs (petrol < lpg < diesel < hybrid <
// phev < electric -- petrol/diesel first as asked, hybrid/electric last), but ranks within a
// fuel group by displacementCc instead of powerKw. A handful of rows (mostly electric
// engines) have a null displacementCc -- those sort after every known displacement in their
// fuel group rather than colliding at 0, which would wrongly claim to be the smallest.
const FUEL_SORT_ORDER: Record<string, number> = {
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
    return transmissionLabel(a).localeCompare(transmissionLabel(b));
  });
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
      {sorted.map((c) => (
        <div key={c.id} className="eq-item">
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
              <div className="cgrid-label">Transmission</div>
              <div className="cgrid-val cfg-link">{transmissionLabel(c)}</div>
            </div>
            <div className="cgrid-item">
              <div className="cgrid-label">Body</div>
              <div className="cgrid-val">{c.bodyName}</div>
            </div>
            {c.drivetrain ? (
              <div
                className="cgrid-item cgrid-item-btn"
                onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}
              >
                <div className="cgrid-label">Drivetrain</div>
                <div className="cgrid-val cfg-link">{drivetrainLabel(c)}</div>
              </div>
            ) : (
              <div className="cgrid-item">
                <div className="cgrid-label">Drivetrain</div>
                <div className="cgrid-val">FWD</div>
              </div>
            )}
            <div className="cgrid-item">
              <div className="cgrid-label">Consumption</div>
              <div className="cgrid-val">{consumptionLabel(c)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
