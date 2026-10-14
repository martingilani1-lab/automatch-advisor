import Badge from "./badge";

interface ProsConsListProps {
  pros: string[];
  cons: string[];
  gapsMode: boolean;
}

// Shared by the Engine, Gearbox and Drivetrain panels -- each has its own pros/cons text
// columns (catalog_engines/transmission_units/drivetrain_systems) but renders them identically.
// Marker color carries the pro/con meaning (emerald/amber); body text stays zinc-300 either
// way, matching the brief exactly.
export default function ProsConsList({ pros, cons, gapsMode }: ProsConsListProps) {
  if (pros.length === 0 && cons.length === 0) {
    return gapsMode ? <Badge variant="missing">no pros/cons recorded</Badge> : null;
  }
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {pros.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pros.map((p, i) => (
            <li key={i} className="text-xs text-zinc-300">
              <span className="text-emerald-400">+</span> {p}
            </li>
          ))}
        </ul>
      )}
      {cons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {cons.map((c, i) => (
            <li key={i} className="text-xs text-zinc-300">
              <span className="text-amber-400">–</span> {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
