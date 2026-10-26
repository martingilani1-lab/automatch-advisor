"use client";

// Engines tab comparison: a floating action bar once 2-3 engines are ticked, and a full-screen
// side-by-side view. Visual language per Martin's 2026-10-26 brief, deliberately its own (not
// the Garage orange accent the rest of the vehicle page uses): zinc-950 page, zinc-900 cards,
// BLUE as the only UI accent, and emerald/orange/red reserved strictly for data states
// (Good/Average/Poor reliability). All derived values -- verdict tag, fault ordering, Smart
// Choice -- come from ./lib/engineCompare.ts, so the rules live in one tested place.

import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { IconBulb, IconX } from "@tabler/icons-react";

import type { DetailEngine } from "./types";
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

const TONE_CLASSES: Record<RelTone, string> = {
  good: "border-emerald-500/60 text-emerald-500",
  average: "border-orange-500/60 text-orange-500",
  poor: "border-red-500/60 text-red-500",
  unknown: "border-zinc-700 text-zinc-500",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  moderate: "bg-orange-500",
  minor: "bg-zinc-500",
};

interface CompareBarProps {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}

// Floating Action Bar -- slides up from the bottom as soon as 2+ engines are selected. With a
// single engine ticked it stays mounted but off-screen, so the slide-in plays on the 2nd tick
// instead of popping in.
export function CompareBar({ count, onCompare, onClear }: CompareBarProps) {
  const visible = count >= 2;
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-[150%]"
      }`}
    >
      <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-800/90 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Comparing {count} engines</div>
          <div className="text-xs text-zinc-400">
            {count < MAX_COMPARE ? `Add up to ${MAX_COMPARE - count} more` : `Maximum of ${MAX_COMPARE}`} ·{" "}
            <button type="button" onClick={onClear} tabIndex={visible ? 0 : -1} className="cursor-pointer border-0 bg-transparent p-0 text-xs text-zinc-400 underline-offset-2 hover:text-white hover:underline">
              Clear
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onCompare}
          tabIndex={visible ? 0 : -1}
          className="shrink-0 cursor-pointer rounded-xl border-0 bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/5 py-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-100">{children}</div>
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

  const cols = engines.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div role="dialog" aria-modal="true" aria-label="Engine comparison" className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-blue-500">Engine comparison</div>
            <h2 className="mt-1 text-xl font-semibold text-white">{carLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="cursor-pointer rounded-lg border border-white/10 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Mobile: columns become a horizontal swipe (snap per engine) so they stay side by
            side as asked; md+ a plain 2/3-column grid. */}
        <div className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:overflow-visible ${cols}`}>
          {engines.map((e) => {
            const isSmart = smart?.engineId === e.id;
            const tone = reliabilityTone(e.reliability_rating);
            const timing = timingLabel(e.timing_type);
            const cons = consumptionLabel(e.consumption);
            const traps = topFaults(e.faults);
            return (
              <section
                key={e.id}
                className={`relative w-[82%] shrink-0 snap-center rounded-2xl border bg-zinc-900 p-5 md:w-auto ${
                  isSmart ? "border-blue-500/70 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_32px_-6px_rgba(59,130,246,0.45)]" : "border-white/5"
                }`}
              >
                {isSmart && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500">
                    <IconBulb size={14} /> Smart Choice
                  </div>
                )}
                <h3 className="text-lg font-bold leading-snug text-white">{e.engine}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{engineVerdict(e)}</span>
                  <span className={`rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
                    {e.reliability !== "—" ? e.reliability : "Not rated"}
                  </span>
                </div>
                {isSmart && smart && <p className="mt-2 text-xs text-blue-400/90">{smart.reasons.join(" · ")}</p>}

                <div className="mt-4">
                  <Row label="Timing system">
                    {timing ? <span className="font-semibold">{timing}</span> : <span className="text-zinc-500">Unknown</span>}
                  </Row>
                  <Row label="Consumption (official combined)">
                    {cons ?? <span className="text-zinc-500">No data</span>}
                  </Row>
                  <Row label="Power / torque">
                    {e.power_kw} kW{e.torque_nm != null ? ` · ${e.torque_nm} Nm` : ""}
                  </Row>
                  <Row label="Expensive traps">
                    {traps.length ? (
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {traps.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-zinc-400">
                            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[(f.severity || "").toLowerCase()] ?? "bg-zinc-600"}`} />
                            <span>{f.fault}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-zinc-500">No known faults recorded</span>
                    )}
                  </Row>
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">
          {smart
            ? "Smart Choice weighs the reliability rating most, then the number and severity of known faults, then official consumption."
            : "No Smart Choice: the engines are too close to call, or not enough of them have a reliability rating."}{" "}
          Use-case tags are derived from fuel type and power. Consumption is the manufacturer&apos;s combined figure, not a real-world measurement.
        </p>
      </div>
    </div>
  );
}
