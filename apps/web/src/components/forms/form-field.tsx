import { type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string;
}

/**
 * FormField — accessible wrapper for any input/select/textarea.
 *
 * - Associates <label> with input via htmlFor/id.
 * - Renders validation errors with role="alert" for screen readers.
 * - Renders optional hint text below the input.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(error && "text-destructive")}>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
