import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

// Fault-severity colors match the brief's spec exactly (critical/moderate/minor); the other
// variants (missing/accent/warning/default) map onto the same semantic tokens where the
// brief doesn't name a specific pairing for them.
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-white/5 bg-panel-2 text-secondary",
        missing: "border-warning/30 bg-warning/10 text-warning",
        accent: "border-accent-2/40 bg-accent-2/10 text-accent-2-text",
        warning: "border-warning/30 bg-warning/10 text-warning",
        critical: "border-danger/40 bg-danger/10 text-danger-text",
        moderate: "border-warning/30 bg-warning/10 text-warning",
        minor: "border-zinc-700 bg-zinc-800 text-minor",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export default function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
