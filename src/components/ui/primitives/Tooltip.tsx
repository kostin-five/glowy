import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        {...props}
        className={cn(
          "z-50 max-w-64 rounded-glowy-control bg-glowy-text-primary px-glowy-3 py-glowy-2 text-sm text-glowy-primary-foreground shadow-glowy-panel",
          className
        )}
        sideOffset={sideOffset}
      />
    </TooltipPrimitive.Portal>
  );
}
