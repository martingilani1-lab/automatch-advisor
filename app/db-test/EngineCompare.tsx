"use client";

// Engines tab comparison: a floating action bar once 2-3 engines are ticked, and a full-screen
// side-by-side view. Restyled to match this page's own native look (.eng-card/.eng-badge/
// .sub-label, the dark #1c1c1e/#2a2a2e palette every other tab already uses) instead of the
// separate Tailwind zinc/blue design this shipped with -- that design was deliberately its own
// per the brief it was built under, but read as visually foreign once it sat next to the
// native-styled Engines/Configurations/Trims tabs around it. All derived values -- verdict
// tag, fault ordering, Smart Choice -- still come from ./lib/engineCompare.ts; only the markup
// and styling below changed, same props, same behavior.

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { IconBulb, IconX } from "@tabler/icons-react";

import type { DetailEngine } from "./types";
import { eurRange, km, yearlyMaintenanceLabel } from "@/app/catalog/lib/engineMaintenance";
import {
  MAX_COMPARE,
  consumptionLabel,
  engineVerdict,
  pickSmartChoice,
  reliabilityTone,
  timingLabel,
  topFaults,
  type RelTone,
} from "./lib/engineCompare";

// Same 3-tone scale reliabilityTone() already classifies into (good/average/poor/unknown),
// just given real colors here -- matching the REL_COLORS values this page already uses
// elsewhere for "Excellent"/"Average"/"Poor" badges, not a new palette.
const TONE_COLORS: Record<RelTone, string> = {
  good: "#6bdb8a",
  average: "#ff9944",
  poor: "#ff6b35",
  unknown: "#6b6b72",
};

// Same severity palette as FAULT_ITEM_SEVERITY_COLORS in CarDetail.tsx (critical/moderate/
// minor) -- duplicated rather than imported, same "small color map, fine to repeat per
// display spot" convention this file already follows for REL_COLORS-adjacent maps elsewhere.
const SEVERITY_DOT_COLOR: Record<string, string> = { critical: "#f44336", moderate: "#ff9800", minor: "#4a9eff" };

interface CompareBarProps {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}

// Floating bar -- slides up from the bottom as soon as 2+ engines are selected. With a single
// engine ticked it stays mounted but off-screen, so the slide-in plays on the 2nd tick instead
// of popping in.
export function CompareBar({ count, onCompare, onClear }: CompareBarProps) {
  const visible = count >= 2;
  return (
    <div aria-hidden={!visible} className={`compare-bar${visible ? " visible" : ""}`}>
      <div className="compare-bar-inner">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#f0f0f0" }}>Comparing {count} engines</div>
          <div className="tg" style={{ marginTop: 2 }}>
            {count < MAX_COMPARE ? `Add up to ${MAX_COMPARE - count} more` : `Maximum of ${MAX_COMPARE}`} ·{" "}
            <button
              type="button"
              onClick={onClear}
              tabIndex={visible ? 0 : -1}
              className="compare-bar-clear"
            >
              Clear
            </button>
          </div>
        </div>
        <button type="button" onClick={onCompare} tabIndex={visible ? 0 : -1} className="compare-bar-cta">
          Compare Engines
        </button>
      </div>
    </div>
  );
}

interface EngineCompareViewProps {
  engines: DetailEngine[];
  carLabel: string;
  onClose: () => void;
}

function CompareRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="compare-row">
      <div className="sub-label" style={{ margin: 0 }}>{label}</div>
      <div style={{ fontSize: ".82rem", color: "#f0f0f0", marginTop: 4 }}>{children}</div>
    </div>
  );
}

export function EngineCompareView({ engines, carLabel, onClose }: EngineCompareViewProps) {
  const smart = useMemo(() => pickSmartChoice(engines), [engines]);

  // Escape closes; the page behind must not scroll while the overlay is up.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Engine comparison" className="compare-overlay">
      <div className="compare-overlay-inner">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <div className="tg" style={{ textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>Engine comparison</div>
            <h2 className="cmodel" style={{ marginTop: 2 }}>{carLabel}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close comparison" className="compare-close-btn">
            <IconX size={18} />
          </button>
        </div>

        {/* Mobile: columns become a horizontal swipe (snap per engine) so they stay side by
            side as asked; wider viewports get a plain fixed-column grid. */}
        <div className="compare-grid" style={{ gridTemplateColumns: engines.length === 3 ? "repeat(3, minmax(260px, 1fr))" : "repeat(2, minmax(260px, 1fr))" }}>
          {engines.map((e) => {
            const isSmart = smart?.engineId === e.id;
            const tone = TONE_COLORS[reliabilityTone(e.reliability_rating)];
            const timing = timingLabel(e.timing_type);
            const cons = consumptionLabel(e.consumption);
            const traps = topFaults(e.faults);
            const yearly = yearlyMaintenanceLabel(e.maintenance);
            const m = e.maintenance;
            const oil = m.oilChangeIntervalKm != null ? `every ${km(m.oilChangeIntervalKm)}${m.oilChangeIntervalMonths != null ? ` / ${m.oilChangeIntervalMonths} mo` : ""}` : null;
            const timingCost = eurRange(m.timingServiceCostEurMin, m.timingServiceCostEurMax);
            const timingEvery = e.timing_type === "chain"
              ? "No fixed interval"
              : e.timing_replacement_km != null
                ? `every ${km(e.timing_replacement_km)}${m.timingReplacementYears != null ? ` / ${m.timingReplacementYears} years` : ""}`
                : null;
            return (
              <section
                key={e.id}
                className="compare-card"
                style={isSmart ? { borderColor: "#60a5fa" } : undefined}
              >
                {isSmart && (
                  <div className="eng-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44", marginBottom: 10 }}>
                    <IconBulb size={12} /> Smart Choice
                  </div>
                )}
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f0", lineHeight: 1.3 }}>{e.engine}</div>
                <div className="eng-tags" style={{ marginTop: 8 }}>
                  <span className="cfuel-tag">{engineVerdict(e)}</span>
                  <span className="eng-badge" style={{ background: tone + "22", color: tone, border: `1px solid ${tone}44` }}>
                    {e.reliability !== "—" ? e.reliability : "Not rated"}
                  </span>
                </div>
                {isSmart && smart && <p style={{ fontSize: ".72rem", color: "#60a5fa", marginTop: 8, lineHeight: 1.5 }}>{smart.reasons.join(" · ")}</p>}

                <div style={{ marginTop: 10 }}>
                  <CompareRow label="Timing system">
                    {timing ?? <span className="tg">Unknown</span>}
                  </CompareRow>
                  <CompareRow label="Consumption (official combined)">
                    {cons ?? <span className="tg">No data</span>}
                  </CompareRow>
                  <CompareRow label="Power / torque">
                    {e.power_kw} kW{e.torque_nm != null ? ` · ${e.torque_nm} Nm` : ""}
                  </CompareRow>
                  <CompareRow label="Yearly maintenance">
                    {yearly ? <span style={{ fontWeight: 700 }}>{yearly}</span> : <span className="tg">No data</span>}
                    {oil && <div className="tg" style={{ marginTop: 3 }}>Oil {oil}</div>}
                  </CompareRow>
                  <CompareRow label={e.timing_type === "chain" ? "Timing chain job" : "Timing belt kit"}>
                    {timingCost ?? <span className="tg">No data</span>}
                    {timingEvery && <div className="tg" style={{ marginTop: 3 }}>{timingEvery}</div>}
                  </CompareRow>
                  <CompareRow label="Expensive traps">
                    {traps.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {traps.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                            <span
                              style={{
                                marginTop: 6,
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background: SEVERITY_DOT_COLOR[(f.severity || "").toLowerCase()] ?? "#6b6b72",
                              }}
                            />
                            <span style={{ color: "#9999aa" }}>{f.fault}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="tg">No known faults recorded</span>
                    )}
                  </CompareRow>
                </div>
              </section>
            );
          })}
        </div>

        <p className="tg" style={{ marginTop: 20, lineHeight: 1.6 }}>
          {smart
            ? "Smart Choice weighs the reliability rating most, then the number and severity of known faults, then yearly maintenance cost and official consumption."
            : "No Smart Choice: the engines are too close to call, or not enough of them have a reliability rating."}{" "}
          Use-case tags are derived from fuel type and power. Consumption is the manufacturer&apos;s combined figure, not a real-world measurement. Maintenance prices are typical independent-workshop prices in SK/CZ.
        </p>
      </div>
    </div>
  );
}
