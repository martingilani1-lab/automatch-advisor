interface RatingProps {
  // catalog_engines/transmission_units/drivetrain_systems.reliability_rating -- a smallint
  // 1-5, or null (NULL over invention, CLAUDE.md rule 7 -- never a guessed tier).
  value: number | null;
  label: string;
}

// 5-dot reliability indicator: filled dots orange-500, empty dots zinc-500 (not the spec's
// literal zinc-700 -- that measures 1.91:1 against bg-app and 1.70:1 against bg-panel, well
// under WCAG's 3:1 non-text-contrast minimum for a meaningful UI graphic; zinc-500 clears it
// at 4.12:1 / 3.67:1 while still reading as clearly "unfilled" next to the orange dots).
// Replaces the word-label ("Good"/"Excellent") Field row the previous theme used -- same
// underlying 1-5 value, a visual rating rather than text.
export default function Rating({ value, label }: RatingProps) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-secondary">{label}</span>
      <div className="flex items-center gap-1" role="img" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2 w-2 rounded-full ${n <= value ? "bg-orange-500" : "bg-zinc-500"}`}
          />
        ))}
      </div>
    </div>
  );
}
