import type { CatalogConfig, CatalogFault } from "../lib/types";
import { groupConfigurations } from "../lib/groupConfigurations";
import EnginePanel from "./EnginePanel";

interface EngineListProps {
  configs: CatalogConfig[];
  faults: CatalogFault[];
  gapsMode: boolean;
}

// Every real engine this phase offers, shown at once (groupConfigurations collapses body x
// drivetrain x engine x gearbox configs down to one widget per distinct engine) -- gearboxes
// are their own separate section (see GearboxList.tsx), not nested under their engine(s).
export default function EngineList({ configs, faults, gapsMode }: EngineListProps) {
  const groups = groupConfigurations(configs);
  if (groups.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-medium text-primary">Engines</h2>
      <div className="mt-2 flex flex-col gap-4">
        {groups.map((group) => (
          <EnginePanel key={group.engine.id} group={group} faults={faults} gapsMode={gapsMode} />
        ))}
      </div>
    </section>
  );
}
