import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn, focusRingClassName } from "./utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      {...props}
      className={cn(
        focusRingClassName,
        "flex min-h-glowy-touch-target w-full items-center justify-between gap-glowy-2 rounded-glowy-control border border-glowy-border-subtle bg-glowy-surface px-glowy-3 text-left text-glowy-text-primary data-[placeholder]:text-glowy-text-muted disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {children}
      <SelectPrimitive.Icon aria-hidden="true" className="text-glowy-text-muted">
        <ChevronDown className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  children,
  className,
  position = "popper",
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        {...props}
        className={cn(
          "z-50 max-h-80 min-w-48 overflow-hidden rounded-glowy-control border border-glowy-border-subtle bg-glowy-surface text-glowy-text-primary shadow-glowy-panel",
          className
        )}
        position={position}
      >
        <SelectPrimitive.Viewport className="grid gap-glowy-1 p-glowy-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      {...props}
      className={cn(
        focusRingClassName,
        "relative flex min-h-glowy-touch-target cursor-default select-none items-center rounded-glowy-control py-glowy-2 pl-glowy-8 pr-glowy-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-glowy-surface-raised",
        className
      )}
    >
      <span className="absolute left-glowy-3 inline-flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      {...props}
      className={cn("px-glowy-3 py-glowy-2 text-xs font-bold text-glowy-text-muted", className)}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator {...props} className={cn("my-glowy-1 h-px bg-glowy-border-subtle", className)} />;
}
