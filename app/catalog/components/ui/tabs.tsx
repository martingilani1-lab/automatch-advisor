"use client";

import * as RadixTabs from "@radix-ui/react-tabs";

import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn("flex gap-1 border-b border-catalog-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "px-3 py-2 text-sm text-catalog-muted border-b-2 border-transparent transition-colors",
        "data-[state=active]:text-catalog-text data-[state=active]:border-catalog-accent",
        "hover:text-catalog-text",
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
