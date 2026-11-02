// My Garage vocabularies -- mirror the CHECK constraints in
// supabase/migrations/20261102150000_create_garage.sql. Change both together: reminders match
// a service record to a catalog interval by `kind`, so the lists must agree exactly.

export const SERVICE_KINDS = [
  "oil_change", "timing_belt", "spark_plugs", "air_filter", "fuel_filter", "cabin_filter",
  "gearbox_service", "awd_service", "brake_fluid", "brakes", "coolant", "tyres", "battery",
  "stk", "ek", "other",
] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  oil_change: "Oil + filter",
  timing_belt: "Timing belt kit",
  spark_plugs: "Spark plugs",
  air_filter: "Air filter",
  fuel_filter: "Fuel filter",
  cabin_filter: "Cabin filter",
  gearbox_service: "Gearbox oil service",
  awd_service: "AWD (Haldex/quattro) service",
  brake_fluid: "Brake fluid",
  brakes: "Brakes (pads/discs)",
  coolant: "Coolant",
  tyres: "Tyres",
  battery: "Battery",
  stk: "STK (technical inspection)",
  ek: "EK (emissions check)",
  other: "Other",
};

export const DEADLINE_KINDS = ["stk", "ek", "insurance", "vignette", "other"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

export const DEADLINE_LABELS: Record<DeadlineKind, string> = {
  stk: "STK valid until",
  ek: "EK valid until",
  insurance: "Insurance – next payment",
  vignette: "Vignette valid until",
  other: "Other deadline",
};
