import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { IconButton } from "./Button";
import { cn } from "./utils";

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      {...props}
      className={cn(
        "fixed inset-x-glowy-4 bottom-[max(var(--glowy-space-4),env(safe-area-inset-bottom))] z-[100] grid w-auto gap-glowy-3 sm:left-auto sm:w-96",
        className
      )}
    />
  );
}

const toastClassNames = {
  info: "border-glowy-primary",
  success: "border-glowy-status-success",
  warning: "border-glowy-status-warning",
  danger: "border-glowy-status-danger",
} as const;

export interface ToastProps
  extends ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  tone?: keyof typeof toastClassNames;
}

export function Toast({
  children,
  className,
  tone = "info",
  ...props
}: ToastProps) {
  return (
    <ToastPrimitive.Root
      {...props}
      className={cn(
        "grid grid-cols-[1fr_auto] items-start gap-glowy-3 rounded-glowy-panel border bg-glowy-surface p-glowy-4 text-glowy-text-primary shadow-glowy-panel data-[state=closed]:animate-out data-[state=open]:animate-in",
        toastClassNames[tone],
        className
      )}
    >
      {children}
    </ToastPrimitive.Root>
  );
}

export function ToastTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title {...props} className={cn("font-bold", className)} />;
}

export function ToastDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      {...props}
      className={cn("text-sm text-glowy-text-secondary", className)}
    />
  );
}

export function ToastAction({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      {...props}
      className={cn("text-sm font-bold text-glowy-primary", className)}
    >
      {children}
    </ToastPrimitive.Action>
  );
}

export interface ToastCloseProps
  extends Omit<ComponentPropsWithoutRef<typeof ToastPrimitive.Close>, "children"> {
  "aria-label"?: string;
  children?: ReactNode;
}

export function ToastClose({
  children,
  className,
  "aria-label": ariaLabel = "Закрыть уведомление",
  ...props
}: ToastCloseProps) {
  return (
    <ToastPrimitive.Close asChild {...props}>
      <IconButton
        aria-label={ariaLabel}
        className={cn("-mr-glowy-2 -mt-glowy-2", className)}
        variant="ghost"
      >
        {children ?? <X aria-hidden="true" className="size-4" />}
      </IconButton>
    </ToastPrimitive.Close>
  );
}
