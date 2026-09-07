import {
  cloneElement,
  forwardRef,
  useId,
  type AriaAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type TextareaHTMLAttributes,
} from "react";

import { cn, focusRingClassName, mergeIdReferences } from "./utils";

const controlClassName = cn(
  focusRingClassName,
  "min-h-glowy-touch-target w-full rounded-glowy-control border border-glowy-border-subtle bg-glowy-surface px-glowy-3 py-glowy-2 text-glowy-text-primary placeholder:text-glowy-text-muted disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-glowy-status-danger"
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input {...props} ref={ref} className={cn(controlClassName, className)} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(controlClassName, "min-h-28 resize-y", className)}
      rows={rows}
    />
  );
});

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(function Label({ className, ...props }, ref) {
  return (
    <label
      {...props}
      ref={ref}
      className={cn("text-sm font-bold text-glowy-text-primary", className)}
    />
  );
});

type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  id?: string;
};

export interface FieldProps {
  children: ReactElement<FieldControlProps>;
  className?: string;
  description?: string;
  error?: string;
  label: string;
}

export function Field({
  children,
  className,
  description,
  error,
  label,
}: FieldProps) {
  const generatedId = useId();
  const controlId = children.props.id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  const control = cloneElement(children, {
    "aria-describedby": mergeIdReferences(
      children.props["aria-describedby"],
      descriptionId,
      errorId
    ),
    "aria-errormessage": errorId,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    id: controlId,
  });

  return (
    <div className={cn("grid gap-glowy-2", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      {control}
      {description ? (
        <p className="text-sm text-glowy-text-muted" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-bold text-glowy-status-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
