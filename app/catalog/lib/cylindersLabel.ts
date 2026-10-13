// Human-readable catalog_engines.cylinders formatting, shared by /catalog and /db-test -- same
// shared-helper precedent as gearboxLabel.ts's gearboxHeaderLabel. The raw DB code (L4, VR6,
// B6, ...) isn't something a buyer reads at a glance, so this maps it to "<count>, <layout>".
// An unrecognized code falls back to the raw value itself (never invented, CLAUDE.md rule 7);
// a null input returns null so the caller can hide the field entirely, never show "N/A".
const CYLINDER_LAYOUT_LABELS: Record<string, string> = {
  L3: "3, inline",
  L4: "4, inline",
  L5: "5, inline",
  V6: "6, V",
  VR5: "5, VR",
  VR6: "6, VR",
  V8: "8, V",
  W12: "12, W",
  B4: "4, boxer",
  B6: "6, boxer",
};

export function cylindersLabel(raw: string | null): string | null {
  if (raw == null) return null;
  return CYLINDER_LAYOUT_LABELS[raw] ?? raw;
}
