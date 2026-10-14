"use client";

import * as RadixTabs from "@radix-ui/react-tabs";

export interface PhaseSwitcherOption {
  id: string;
  phaseLabel: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

interface PhaseSwitcherProps {
  phases: PhaseSwitcherOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function phaseLabelText(p: PhaseSwitcherOption): string {
  const label = p.phaseLabel ?? "";
  if (p.yearFrom == null) return label;
  // Open-ended year_to (still in production) shows a trailing "–" with nothing after it.
  const years = `${p.yearFrom}–${p.yearTo ?? ""}`;
  return label ? `${label} ${years}` : years;
}

// A segmented pill control -- visually distinct from the page's own underline-style tab bar
// (ui/tabs.tsx), so this uses Radix's Tabs primitives directly rather than that shared
// TabsList/TabsTrigger (whose default classes are tuned for the underline look, not a
// pill segment). Renders static text with no switcher at all when the generation has only
// one phase (nothing to switch between).
export default function PhaseSwitcher({ phases, selectedId, onSelect }: PhaseSwitcherProps) {
  if (phases.length <= 1) {
    const only = phases[0];
    return only ? <p className="text-sm text-secondary">{phaseLabelText(only)}</p> : null;
  }

  return (
    <RadixTabs.Root value={selectedId} onValueChange={onSelect}>
      <RadixTabs.List className="inline-flex gap-1 rounded-lg border border-white/5 bg-panel p-1">
        {phases.map((p) => (
          <RadixTabs.Trigger
            key={p.id}
            value={p.id}
            className="rounded-md border-0 bg-transparent px-3 py-1.5 text-sm text-secondary transition-colors data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:text-white"
          >
            {phaseLabelText(p)}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
