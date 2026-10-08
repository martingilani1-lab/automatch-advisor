import Badge from "./ui/badge";

interface SectionGapsBadgeProps {
  count: number;
}

export default function SectionGapsBadge({ count }: SectionGapsBadgeProps) {
  if (count === 0) return null;
  return <Badge variant="missing">{count} missing</Badge>;
}
