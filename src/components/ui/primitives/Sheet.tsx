import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { IconButton } from "./Button";
import { cn } from "./utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sideClassNames = {
  right:
    "inset-y-0 right-0 h-dvh w-[min(100%-1rem,28rem)] border-l pb-[max(var(--glowy-space-4),env(safe-area-inset-bottom))] pt-[max(var(--glowy-space-4),env(safe-area-inset-top))]",
  left: "inset-y-0 left-0 h-dvh w-[min(100%-1rem,28rem)] border-r pb-[max(var(--glowy-space-4),env(safe-area-inset-bottom))] pt-[max(var(--glowy-space-4),env(safe-area-inset-top))]",
  bottom:
    "inset-x-0 bottom-0 max-h-[min(85dvh,42rem)] rounded-t-glowy-panel border-t px-glowy-4 pb-[max(var(--glowy-space-4),env(safe-area-inset-bottom))] pt-glowy-6",
} as const;

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  children: ReactNode;
  showClose?: boolean;
  side?: keyof typeof sideClassNames;
}

export function SheetContent({
  children,
  className,
  showClose = true,
  side = "right",
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-glowy-canvas/80 backdrop-blur-sm" />
      <DialogPrimitive.Content
        {...props}
        className={cn(
          "fixed z-50 grid gap-glowy-4 overflow-y-auto border-glowy-border-subtle bg-glowy-surface p-glowy-6 text-glowy-text-primary shadow-glowy-panel",
          sideClassNames[side],
          className
        )}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <IconButton
              aria-label="Закрыть панель"
              className="absolute right-glowy-3 top-glowy-3"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      {...props}
      className={cn("pr-glowy-8 font-glowy-display text-lg", className)}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      {...props}
      className={cn("text-sm text-glowy-text-secondary", className)}
    />
  );
}
