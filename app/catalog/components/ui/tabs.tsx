"use client";

import * as RadixTabs from "@radix-ui/react-tabs";

import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-1 border-b border-white/5", className)}
      {...props}
    />
  );
}

// Active tab: white text with a 2px orange-600 underline. Inactive: zinc-400, hover white.
export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        // catalog.css deliberately skips tailwindcss/preflight (see its own header comment),
        // so a bare <button> (what Radix's Trigger renders) keeps the browser's default
        // bordered/backgrounded chrome unless explicitly reset here -- border-t-0/border-x-0
        // reset only the sides border-b-2 below doesn't touch, so there's no ordering
        // ambiguity between the two on border-bottom-width.
        "border-t-0 border-x-0 bg-transparent px-3 py-2 text-sm text-secondary border-b-2 border-transparent transition-colors",
        "data-[state=active]:text-primary data-[state=active]:border-accent",
        "hover:text-primary",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn("pt-4", className)} {...props} />;
}
