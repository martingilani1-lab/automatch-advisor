import type { CatalogFault } from "../../lib/types";
import Badge from "./badge";

// Sorted critical -> moderate -> minor -> (no severity recorded), so the most serious faults
// always lead regardless of insertion order.
const SEVERITY_ORDER: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };
const SEVERITY_BADGE_VARIANT: Record<string, "critical" | "moderate" | "minor"> = {
  critical: "critical",
  moderate: "moderate",
  minor: "minor",
};

interface FaultsListProps {
  faults: CatalogFault[];
  gapsMode: boolean;
}

// Shared by the Engine and Gearbox panels -- catalog_component_faults keys a fault to
// EITHER an engine OR a unit (never both), so each panel pre-filters its own faults before
// handing them to this shared renderer.
export default function FaultsList({ faults, gapsMode }: FaultsListProps) {
  if (faults.length === 0) {
    return gapsMode ? <Badge variant="missing">no known faults recorded</Badge> : null;
  }
  const sorted = [...faults].sort(
    (a, b) => (SEVERITY_ORDER[a.severity ?? ""] ?? 3) - (SEVERITY_ORDER[b.severity ?? ""] ?? 3)
  );
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-secondary">
        Known faults ({faults.length})
      </p>
      <ul className="flex flex-col gap-2">
        {sorted.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-panel p-3"
          >
            <span className="text-sm text-primary">{f.fault}</span>
            {f.severity && <Badge variant={SEVERITY_BADGE_VARIANT[f.severity] ?? "warning"}>{f.severity}</Badge>}
          </li>
        ))}
      </ul>
    </div>
  );
}
