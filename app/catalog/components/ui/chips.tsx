import Badge from "./badge";

// Shared small pill-chip row -- body names, drivetrain labels, engine names, etc. --
// used by the Engine and Gearbox panels.
export default function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="default">{item}</Badge>
      ))}
    </div>
  );
}
