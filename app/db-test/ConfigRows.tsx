import type { CatalogConfig } from "@/app/catalog/lib/types";
import { consumptionLabel, drivetrainLabel, engineLabel, sortConfigs, transmissionLabel } from "@/app/catalog/lib/configDisplay";
import type { ConfigNavTarget } from "@/app/catalog/components/ConfigurationsTable";

interface ConfigRowsProps {
  configs: CatalogConfig[];
  onNavigate: (target: ConfigNavTarget) => void;
}

// db-test's own native-styled Configurations tab -- same data/sorting/formatting as
// /catalog's ConfigurationsTable.tsx (both import from ../catalog/lib/configDisplay.ts), but
// rendered with this page's existing hand-rolled classes (.eq-item, .cgrid/.cgrid-item-btn --
// the same clickable-tile pattern GearboxAccordion's "Maintenance" toggle already uses)
// instead of the Tailwind catalog-* table, which looked visually foreign dropped into this
// page's card/pill design.
export default function ConfigRows({ configs, onNavigate }: ConfigRowsProps) {
  if (configs.length === 0) return null;
  const sorted = sortConfigs(configs);

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
            {engineLabel(c)}
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
