import type { CatalogConfig, CatalogFault } from "../lib/types";
import { groupByGearbox } from "../lib/groupConfigurations";
import GearboxPanel from "./GearboxPanel";

interface GearboxListProps {
  configs: CatalogConfig[];
  faults: CatalogFault[];
  gapsMode: boolean;
}

// Every real gearbox this phase offers, shown as its own section independent of Engines
// (groupByGearbox collapses body x drivetrain x engine x gearbox configs down to one widget
// per distinct gearbox) -- a gearbox's own rating/pros/cons/faults/notes describe the unit
// itself, which can be shared across several different engines.
export default function GearboxList({ configs, faults, gapsMode }: GearboxListProps) {
  const groups = groupByGearbox(configs);
  if (groups.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-medium text-catalog-text">Gearboxes</h2>
      <div className="mt-2 flex flex-col gap-4">
        {groups.map((group) => (
          <GearboxPanel key={group.gearbox.id} group={group} faults={faults} gapsMode={gapsMode} />
        ))}
      </div>
    </section>
  );
}
