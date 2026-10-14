import Badge from "./badge";

interface ProsConsListProps {
  pros: string[];
  cons: string[];
  gapsMode: boolean;
}

// Shared by the Engine, Gearbox and Drivetrain panels -- each has its own pros/cons text
// columns (catalog_engines/transmission_units/drivetrain_systems) but renders them identically.
export default function ProsConsList({ pros, cons, gapsMode }: ProsConsListProps) {
  if (pros.length === 0 && cons.length === 0) {
    return gapsMode ? <Badge variant="missing">no pros/cons recorded</Badge> : null;
  }
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {pros.length > 0 && (
        <ul className="flex flex-col gap-1">
          {pros.map((p, i) => (
            <li key={i} className="text-xs text-catalog-text">
              <span className="text-catalog-accent">+</span> {p}
            </li>
          ))}
        </ul>
      )}
      {cons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {cons.map((c, i) => (
            <li key={i} className="text-xs text-catalog-muted">
              <span className="text-orange-400">–</span> {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
