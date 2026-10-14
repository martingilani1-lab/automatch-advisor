"use client";

import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

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

// A segmented control built on the same Radix Tabs primitive as every other tab group on
// this page (BodyDimensionsTabs/MediaGallery's own per-body tabs, and the new page-level
// tab bar) -- no ToggleGroup package is installed, and Tabs already does exactly this job
// with no TabsContent required when used in controlled mode. Renders static text with no
// switcher at all when the generation has only one phase (nothing to switch between).
export default function PhaseSwitcher({ phases, selectedId, onSelect }: PhaseSwitcherProps) {
  if (phases.length <= 1) {
    const only = phases[0];
    return only ? <p className="text-sm text-catalog-muted">{phaseLabelText(only)}</p> : null;
  }

  return (
    <Tabs value={selectedId} onValueChange={onSelect}>
      <TabsList>
        {phases.map((p) => (
          <TabsTrigger key={p.id} value={p.id}>
            {phaseLabelText(p)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
