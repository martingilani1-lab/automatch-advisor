import { isMissing } from "../../lib/gaps";
import Badge from "./badge";

interface FieldProps {
  label: string;
  value: string | number | null | undefined;
  gapsMode: boolean;
}

// Normal mode: a missing value renders nothing. Gaps mode (?gaps=1): it renders as a visible
// "missing" badge instead. Never both -- this is the one place that distinction is made.
export default function Field({ label, value, gapsMode }: FieldProps) {
  if (isMissing(value)) {
    if (!gapsMode) return null;
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-catalog-muted">{label}</span>
        <Badge variant="missing">missing</Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-catalog-muted">{label}</span>
      <span className="text-sm text-catalog-text">{value}</span>
    </div>
  );
}
