import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-catalog-border bg-catalog-surface text-catalog-text",
        missing: "border-amber-700/50 bg-amber-950/40 text-amber-400",
        accent: "border-catalog-accent/40 bg-catalog-accent/10 text-catalog-accent",
        warning: "border-orange-700/50 bg-orange-950/40 text-orange-400",
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
