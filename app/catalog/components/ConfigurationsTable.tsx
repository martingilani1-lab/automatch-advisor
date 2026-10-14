import type { CatalogConfig } from "../lib/types";
import { consumptionLabel, drivetrainLabel, engineLabel, sortConfigs, transmissionLabel } from "../lib/configDisplay";

export interface ConfigNavTarget {
  kind: "engine" | "unit" | "drivetrain";
  id: string;
}

interface ConfigurationsTableProps {
  configs: CatalogConfig[];
  onNavigate: (target: ConfigNavTarget) => void;
}

// A link-styled button rather than an <a href> -- switching tab/opening a widget is client
// state (see the parent's onNavigate), never an actual navigation, so there's nothing for a
// real href to point at. accent-2 (blue) marks it as clickable, distinct from the orange
// accent primary CTAs use elsewhere on this page.
function NavLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="border-0 bg-transparent p-0 text-left text-blue-400 underline-offset-4 hover:text-blue-300 hover:underline"
    >
      {children}
    </button>
  );
}

// One row per catalog_vehicle_configurations row of the selected phase -- a table at
// md and above, a stacked card per row below it (same content, no data hidden on mobile).
// Formatting/sorting logic lives in ../lib/configDisplay.ts, shared with /db-test's own
// native-styled equivalent (CarDetail.tsx) so both pages agree on the exact same text.
export default function ConfigurationsTable({ configs, onNavigate }: ConfigurationsTableProps) {
  if (configs.length === 0) return null;
  const sorted = sortConfigs(configs);

  return (
    <section>
      <h2 className="text-lg font-medium text-primary">Configurations</h2>

      <div className="mt-2 hidden overflow-x-auto rounded-xl border border-white/5 md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-panel-2 text-xs uppercase text-secondary">
              <th className="py-2 px-4 font-medium">Engine</th>
              <th className="py-2 px-4 font-medium">Transmission</th>
              <th className="py-2 px-4 font-medium">Body</th>
              <th className="py-2 px-4 font-medium">Drivetrain</th>
              <th className="py-2 px-4 font-medium">Consumption</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-panel">
            {sorted.map((c) => (
              <tr key={c.id} className="text-primary hover:bg-zinc-800/40">
                <td className="py-2 px-4">
                  <NavLink onClick={() => onNavigate({ kind: "engine", id: c.engine.id })}>
                    {engineLabel(c)}
                  </NavLink>
                </td>
                <td className="py-2 px-4">
                  <NavLink onClick={() => onNavigate({ kind: "unit", id: c.gearbox.id })}>
                    {transmissionLabel(c)}
                  </NavLink>
                </td>
                <td className="py-2 px-4">{c.bodyName}</td>
                <td className="py-2 px-4">
                  {c.drivetrain ? (
                    <NavLink onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}>
                      {drivetrainLabel(c)}
                    </NavLink>
                  ) : (
                    drivetrainLabel(c)
                  )}
                </td>
                <td className="py-2 px-4">{consumptionLabel(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-col gap-3 md:hidden">
        {sorted.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/5 bg-panel p-3">
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-secondary">Engine</span>
              <NavLink onClick={() => onNavigate({ kind: "engine", id: c.engine.id })}>
                {engineLabel(c)}
              </NavLink>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-secondary">Transmission</span>
              <NavLink onClick={() => onNavigate({ kind: "unit", id: c.gearbox.id })}>
                {transmissionLabel(c)}
              </NavLink>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-secondary">Body</span>
              <span className="text-sm text-primary">{c.bodyName}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-secondary">Drivetrain</span>
              {c.drivetrain ? (
                <NavLink onClick={() => onNavigate({ kind: "drivetrain", id: c.drivetrain!.id })}>
                  {drivetrainLabel(c)}
                </NavLink>
              ) : (
                <span className="text-sm text-primary">{drivetrainLabel(c)}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm text-secondary">Consumption</span>
              <span className="text-sm text-primary">{consumptionLabel(c)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
