"use client";

import { useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

// One configuration's value of a metric that varies by engine / gearbox (curb weight, towing,
// city consumption ...), already labelled for the tooltip.
export interface BreakdownItem {
  label: string;
  value: number;
}

interface RangeWithBreakdownProps {
  items: BreakdownItem[];
  unit: string;
}

// "1520 – 1570 kg (i)" -- a metric stored per configuration, shown in the Dimensions grid as its
// range for this body, with the per-configuration breakdown in a tooltip (Martin, 2026-11-04:
// replaces the long "By configuration" list). Hover or keyboard focus opens it on desktop; a tap
// toggles it on touch screens, where hover doesn't exist. A single distinct value is shown as
// that value, still with the breakdown so it's clear which configurations it covers.
// Identical label + value pairs (e.g. the same engine on manual and DSG at the same weight) are
// listed once.
export default function RangeWithBreakdown({ items, unit }: RangeWithBreakdownProps) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return <>—</>;

  const values = items.map((i) => i.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const text = min === max ? `${min} ${unit}` : `${min} – ${max} ${unit}`;

  const seen = new Set<string>();
  const lines = items
    .filter((i) => {
      const key = `${i.label}|${i.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.value - b.value || a.label.localeCompare(b.label));

  return (
    <span className="range-info">
      {text}
      <button
        type="button"
        className="range-info-btn"
        aria-label="Show values per configuration"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <IconInfoCircle size={13} stroke={1.75} />
      </button>
      {open && (
        <span className="range-tip" role="tooltip">
          {lines.map((l) => (
            <span key={`${l.label}|${l.value}`} className="range-tip-line">
              {l.label}: {l.value} {unit}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
