"use client";

import { motion } from "framer-motion";

import { cn } from "./cn";

interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  groupId: string;
  options: SegmentedControlOption[];
  value: string | null;
  onChange: (value: string) => void;
}

// A single-option set (e.g. Golf VII's drivetrain step when Haldex is the only system paired
// with the current engine+gearbox) renders as a static label, not a disabled 2-way toggle --
// the configurator must never imply a choice that doesn't exist in catalog_vehicle_configurations.
export default function SegmentedControl({ groupId, options, value, onChange }: SegmentedControlProps) {
  if (options.length === 1) {
    return (
      <span className="rounded-md border border-catalog-border bg-catalog-surface px-3 py-1.5 text-sm text-catalog-text">
        {options[0].label}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "text-black" : "text-catalog-muted hover:text-catalog-text"
            )}
          >
            {active && (
              <motion.span
                layoutId={`${groupId}-active`}
                className="absolute inset-0 rounded-md bg-catalog-accent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
