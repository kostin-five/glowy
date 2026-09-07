import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "./utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          "rounded-glowy-panel border border-glowy-border-subtle bg-glowy-surface p-glowy-6 shadow-glowy-panel",
          className
        )}
      />
    );
  }
);

const badgeClassNames = {
  neutral: "bg-glowy-surface-raised text-glowy-text-secondary",
  success: "bg-glowy-status-success text-glowy-status-success-foreground",
  warning: "bg-glowy-status-warning text-glowy-status-warning-foreground",
  danger: "bg-glowy-status-danger text-glowy-status-danger-foreground",
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof badgeClassNames;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex min-h-6 items-center rounded-glowy-pill px-glowy-2 text-xs font-bold",
        badgeClassNames[tone],
        className
      )}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-glowy-control bg-glowy-surface-raised",
        className
      )}
    />
  );
}

export interface EmptyStateProps extends HTMLAttributes<HTMLElement> {
  action?: ReactNode;
  description?: string;
  title: string;
}

export function EmptyState({
  action,
  className,
  description,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <section
      {...props}
      className={cn(
        "grid justify-items-start gap-glowy-3 rounded-glowy-panel border border-dashed border-glowy-border-subtle bg-glowy-surface p-glowy-6 text-left",
        className
      )}
    >
      <div className="grid gap-glowy-1">
        <h2 className="font-glowy-display text-base text-glowy-text-primary">{title}</h2>
        {description ? <p className="text-sm text-glowy-text-muted">{description}</p> : null}
      </div>
      {action}
    </section>
  );
}

const alertClassNames = {
  info: "border-glowy-primary bg-glowy-surface-raised text-glowy-text-primary",
  success:
    "border-glowy-status-success bg-glowy-surface-raised text-glowy-text-primary",
  warning:
    "border-glowy-status-warning bg-glowy-surface-raised text-glowy-text-primary",
  danger:
    "border-glowy-status-danger bg-glowy-surface-raised text-glowy-text-primary",
} as const;

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  description?: ReactNode;
  title: string;
  tone?: keyof typeof alertClassNames;
}

export function Alert({
  children,
  className,
  description,
  title,
  tone = "info",
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      className={cn(
        "grid gap-glowy-1 rounded-glowy-control border bg-glowy-surface p-glowy-4",
        alertClassNames[tone],
        className
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <p className="font-bold">{title}</p>
      {description ? <div className="text-sm text-glowy-text-secondary">{description}</div> : null}
      {children}
    </div>
  );
}
