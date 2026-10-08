export function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export interface GapField {
  label: string;
  value: string | number | null | undefined;
}

// Each section computes its own gap count from the field list it's about to render --
// a plain array pass, not a shared/global gap-tracking store (there's exactly one place
// per section that needs this number: the heading badge rendered right above the fields).
export function countGaps(fields: GapField[]): number {
  return fields.filter((f) => isMissing(f.value)).length;
}
