import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { IconButton } from "./Button";
import { cn } from "./utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  children: ReactNode;
  showClose?: boolean;
}

export function DialogContent({
  children,
  className,
  showClose = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-glowy-canvas/80 backdrop-blur-sm" />
      <DialogPrimitive.Content
        {...props}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-glowy-4 overflow-y-auto rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-glowy-6 text-glowy-text-primary shadow-glowy-panel",
          className
        )}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <IconButton
              aria-label="Закрыть диалог"
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

export function DialogTitle({
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

export function DialogDescription({
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
