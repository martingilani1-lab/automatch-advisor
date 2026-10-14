import type { CatalogConfig } from "../lib/types";
import { gearboxHeaderLabel } from "../lib/gearboxLabel";

export interface ConfigNavTarget {
  kind: "engine" | "unit" | "drivetrain";
  id: string;
}

interface ConfigurationsTableProps {
  configs: CatalogConfig[];
  onNavigate: (target: ConfigNavTarget) => void;
}

// Same priority as the fill-rate check behind this component (confirmed live:
// fuel_consumption_combined/battery_capacity_net_kwh/ev_range_wltp_km are 0% filled across
// all 1550 catalog_vehicle_configurations rows -- dead columns from an earlier, unfinished
// pass -- while fuel_consumption_l100km is 100% filled and energy_consumption_kwh100km
// covers the handful of PHEV rows): a pure EV shows its energy figure even if some stray
// l100km value exists; everything else prefers l100km, falling back to energy, then "–".
function consumptionLabel(c: CatalogConfig): string {
  if (c.engine.fuelType === "electric") {
    return c.energyConsumptionKwh100km != null ? `${c.energyConsumptionKwh100km} kWh/100 km` : "–";
  }
  if (c.fuelConsumptionL100km != null) return `${c.fuelConsumptionL100km} l/100 km`;
  if (c.energyConsumptionKwh100km != null) return `${c.energyConsumptionKwh100km} kWh/100 km`;
  return "–";
}

// transmission_units.code is near-universally "<Maker> <Model>" ("VW DQ381", "ZF 6HP",
// "generic:7-speed dct") -- strip the first whitespace- or colon-separated token so the
// Configurations table shows just the unit itself ("DQ381"), the maker already being
// implicit in which car this is. A code with no separator (e.g. the orphan "DQ400e") is
// returned unchanged -- nothing to strip.
function stripMakerPrefix(code: string): string {
  const colonIdx = code.indexOf(":");
  const spaceIdx = code.indexOf(" ");
  if (colonIdx !== -1 && (spaceIdx === -1 || colonIdx < spaceIdx)) return code.slice(colonIdx + 1);
  if (spaceIdx !== -1) return code.slice(spaceIdx + 1);
  return code;
}

function engineLabel(c: CatalogConfig): string {
  const hp = Math.round(c.engine.powerKw * 1.341);
  const name = c.engine.displayName ?? c.engine.code;
  return `${name} ${c.engine.powerKw} kW (${hp} hp)`;
}

function transmissionLabel(c: CatalogConfig): string {
  return gearboxHeaderLabel(stripMakerPrefix(c.gearbox.code), c.gearbox.speeds, c.gearbox.family);
}

// drivetrain_systems.generation is already a human-readable standalone label for nearly
// every live row ("quattro ultra", "HTRAC", "Torsen permanent", "Symmetrical AWD") -- shown
// as-is rather than synthesized into a combined "<brand> <generation>" string no live field
// actually provides (NULL over invention, CLAUDE.md rule 7). Falls back to `code` if a
// future row has no generation filled in yet; "FWD" for configs with no drivetrain system at
// all (the vast majority -- front-wheel-drive needs no reference-table row).
function drivetrainLabel(c: CatalogConfig): string {
  if (!c.drivetrain) return "FWD";
  return c.drivetrain.generation ?? c.drivetrain.code;
}

const FUEL_SORT_ORDER: Record<string, number> = {
  petrol: 0, lpg: 1, diesel: 2, hybrid: 3, phev: 4, electric: 5,
};

function sortConfigs(configs: CatalogConfig[]): CatalogConfig[] {
  return [...configs].sort((a, b) => {
    const fuelDiff = (FUEL_SORT_ORDER[a.engine.fuelType] ?? 99) - (FUEL_SORT_ORDER[b.engine.fuelType] ?? 99);
    if (fuelDiff !== 0) return fuelDiff;
    const powerDiff = a.engine.powerKw - b.engine.powerKw;
    if (powerDiff !== 0) return powerDiff;
    const bodyDiff = a.bodyName.localeCompare(b.bodyName);
    if (bodyDiff !== 0) return bodyDiff;
    return transmissionLabel(a).localeCompare(transmissionLabel(b));
  });
}

// A link-styled button rather than an <a href> -- switching tab/opening a widget is client
// state (see the parent's onNavigate), never an actual navigation, so there's nothing for a
// real href to point at.
function NavLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-left text-catalog-accent underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

// One row per catalog_vehicle_configurations row of the selected phase -- a table at
// md and above, a stacked card per row below it (same content, no data hidden on mobile).
export default function ConfigurationsTable({ configs, onNavigate }: ConfigurationsTableProps) {
  if (configs.length === 0) return null;
  const sorted = sortConfigs(configs);

  return (
    <section>
      <h2 className="text-lg font-medium text-catalog-text">Configurations</h2>

      <div className="mt-2 hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-catalog-muted">
              <th className="py-2 pr-4 font-medium">Engine</th>
              <th className="py-2 pr-4 font-medium">Transmission</th>
              <th className="py-2 pr-4 font-medium">Body</th>
              <th className="py-2 pr-4 font-medium">Drivetrain</th>
              <th className="py-2 pr-4 font-medium">Consumption</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-t border-catalog-border text-catalog-text">
                <td className="py-2 pr-4">
                  <NavLink onClick={() => onNavigate({ kind: "engine", id: c.engine.id })}>
                    {engineLabel(c)}
                  </NavLink>
                </td>
                <td className="py-2 pr-4">
                  <NavLink onClick={() => onNavigate({ kind: "unit", id: c.gearbox.id })}>
                    {transmissionLabel(c)}
                  </NavLink>
                </td>
                <td className="py-2 pr-4">{c.bodyName}</td>
                <td className="py-2 pr-4">
                  {c.drivetrain ? (
                    <NavLink onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}>
                      {drivetrainLabel(c)}
                    </NavLink>
                  ) : (
                    drivetrainLabel(c)
                  )}
                </td>
                <td className="py-2 pr-4">{consumptionLabel(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-col gap-3 md:hidden">
        {sorted.map((c) => (
          <div key={c.id} className="rounded-lg border border-catalog-border bg-catalog-surface p-3">
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-catalog-muted">Engine</span>
              <NavLink onClick={() => onNavigate({ kind: "engine", id: c.engine.id })}>
                {engineLabel(c)}
              </NavLink>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-catalog-muted">Transmission</span>
              <NavLink onClick={() => onNavigate({ kind: "unit", id: c.gearbox.id })}>
                {transmissionLabel(c)}
              </NavLink>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-catalog-muted">Body</span>
              <span className="text-sm text-catalog-text">{c.bodyName}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-catalog-muted">Drivetrain</span>
              {c.drivetrain ? (
                <NavLink onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}>
                  {drivetrainLabel(c)}
                </NavLink>
              ) : (
                <span className="text-sm text-catalog-text">{drivetrainLabel(c)}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-catalog-muted">Consumption</span>
              <span className="text-sm text-catalog-text">{consumptionLabel(c)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
