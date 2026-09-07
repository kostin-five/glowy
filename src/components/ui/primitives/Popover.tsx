import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        {...props}
        className={cn(
          "z-50 w-72 rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-glowy-4 text-glowy-text-primary shadow-glowy-panel",
          className
        )}
        sideOffset={sideOffset}
      />
    </PopoverPrimitive.Portal>
  );
}
