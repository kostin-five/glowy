import { LoaderCircle } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn, focusRingClassName } from "./utils";

const variantClassNames = {
  primary:
    "bg-glowy-primary text-glowy-primary-foreground hover:-translate-y-0.5 hover:shadow-glowy-glow",
  secondary:
    "border border-glowy-border-subtle bg-glowy-surface-raised text-glowy-text-primary hover:border-glowy-border-strong",
  ghost:
    "bg-transparent text-glowy-text-primary hover:bg-glowy-surface-raised",
  destructive:
    "bg-glowy-status-danger text-glowy-status-danger-foreground hover:-translate-y-0.5",
} as const;

const sizeClassNames = {
  compact: "min-h-glowy-touch-target px-glowy-3 text-sm",
  default: "min-h-glowy-touch-target px-glowy-4 text-sm",
  large: "min-h-glowy-touch-target px-glowy-6 text-base",
  icon: "size-glowy-touch-target p-0",
} as const;

export type ButtonVariant = keyof typeof variantClassNames;
export type ButtonSize = keyof typeof sizeClassNames;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    loading = false,
    size = "default",
    type,
    variant = "primary",
    ...props
  },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      aria-busy={loading || undefined}
      className={cn(
        focusRingClassName,
        "inline-flex shrink-0 items-center justify-center gap-glowy-2 rounded-glowy-control font-bold transition-[transform,background-color,border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClassNames[variant],
        sizeClassNames[size],
        className
      )}
      disabled={disabled || loading}
      type={type ?? "button"}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : null}
      <span className={loading ? "sr-only" : undefined}>{children}</span>
    </button>
  );
});

export interface IconButtonProps
  extends Omit<ButtonProps, "children" | "size" | "aria-label"> {
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ children, className, ...props }, ref) {
    return (
      <Button
        {...props}
        ref={ref}
        className={cn("shrink-0", className)}
        size="icon"
      >
        {children}
      </Button>
    );
  }
);
