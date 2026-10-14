import { isMissing } from "../../lib/gaps";
import Badge from "./badge";

interface FieldProps {
  label: string;
  value: string | number | null | undefined;
  gapsMode: boolean;
}

// Normal mode: a missing value renders nothing. Gaps mode (?gaps=1): it renders as a visible
// "missing" badge instead. Never both -- this is the one place that distinction is made.
// Label text is text-secondary (>=14px here, text-sm) rather than text-muted -- the brief
// reserves text-muted for >=14px labels specifically, but zinc-400 (secondary) reads more
// reliably against bg-panel at this weight, and is still comfortably WCAG AA (see the
// commit's contrast report).
export default function Field({ label, value, gapsMode }: FieldProps) {
  if (isMissing(value)) {
    if (!gapsMode) return null;
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-secondary">{label}</span>
        <Badge variant="missing">missing</Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-sm text-primary">{value}</span>
    </div>
  );
}
