// Shared "<code> · <speeds>-speed <type>" header label for a gearbox widget, e.g.
// "VW DQ381 · 7-speed wet DCT" -- used by both /catalog (EngineGearboxPanel, Configurator's
// gearbox options) and /db-test (CarDetail's TransmissionAccordion), which is why this lives
// in app/catalog/lib rather than inline in one component (db-test already imports from
// app/catalog/lib/db for the same reason -- there's no separate shared lib for these two
// routes otherwise).
//
// transmission_units.family is an 8-value frozen vocabulary (see
// supabase/migrations/20260724120000_transmission_drivetrain_reference_tables.sql plus the
// later-added 'dct' -- CLAUDE.md "Known issues"): 'dct' is an intentional third state for a
// generic/unidentified dual-clutch row where the source data doesn't say dry or wet, not a
// placeholder to collapse into dct_dry/dct_wet.
const FAMILY_LABELS: Record<string, string> = {
  manual: "manual",
  dct_dry: "dry DCT",
  dct_wet: "wet DCT",
  dct: "DCT",
  torque_converter: "automatic",
  cvt: "CVT",
  amt: "automated manual",
  single_speed: "single-speed",
};

export function gearboxTypeLabel(family: string | null | undefined): string {
  if (!family) return "";
  return FAMILY_LABELS[family] ?? family;
}

export function gearboxHeaderLabel(code: string, speeds: number | null, family: string | null): string {
  const typeLabel = gearboxTypeLabel(family);
  // A single-speed unit (e.g. an EV reduction gear) has nothing meaningful to prefix with
  // "1-speed" -- the family label alone ("single-speed") already says it.
  const descriptor =
    family === "single_speed" || !typeLabel
      ? typeLabel
      : speeds != null
        ? `${speeds}-speed ${typeLabel}`
        : typeLabel;
  return descriptor ? `${code} · ${descriptor}` : code;
}
