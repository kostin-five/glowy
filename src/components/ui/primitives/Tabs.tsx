import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";

import { cn, focusRingClassName } from "./utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      {...props}
      className={cn(
        "inline-flex max-w-full gap-glowy-1 overflow-x-auto rounded-glowy-control bg-glowy-surface-raised p-glowy-1",
        className
      )}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      {...props}
      className={cn(
        focusRingClassName,
        "min-h-glowy-touch-target shrink-0 rounded-glowy-control px-glowy-3 text-sm font-bold text-glowy-text-secondary data-[state=active]:bg-glowy-surface data-[state=active]:text-glowy-text-primary data-[state=active]:shadow-glowy-panel disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...props} className={cn("pt-glowy-4", className)} />;
}
