"use client";

import { forwardRef, useCallback, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Current value in cents (integer). */
  valueCents: number;
  /** Called with the new value in cents after every keystroke. */
  onValueChange: (cents: number) => void;
  locale?: string;
  currency?: string;
}

/**
 * CurrencyInput
 *
 * A controlled input that displays a locale-aware currency string
 * (e.g. "R$ 1.234,56") but operates on integer cents under the hood.
 *
 * Security properties:
 *  - Never stores or passes a float to the form — always integer cents.
 *  - All non-digit characters are stripped before parsing.
 *  - Controlled by React — no uncontrolled DOM state.
 *  - Max value enforced at 999_999_999_99 cents (~R$ 9.99 billion).
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      valueCents,
      onValueChange,
      locale = "pt-BR",
      currency = "BRL",
      className,
      ...props
    },
    ref,
  ) => {
    const MAX_CENTS = 999_999_999_99;

    const formatDisplay = useCallback(
      (cents: number): string => {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
        }).format(cents / 100);
      },
      [locale, currency],
    );

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        // Strip everything that isn't a digit
        const digits = e.target.value.replace(/\D/g, "");
        if (digits === "") {
          onValueChange(0);
          return;
        }
        const parsed = parseInt(digits, 10);
        if (isNaN(parsed)) return;
        // Cap at maximum value
        onValueChange(Math.min(parsed, MAX_CENTS));
      },
      [onValueChange, MAX_CENTS],
    );

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={valueCents === 0 ? "" : formatDisplay(valueCents)}
        onChange={handleChange}
        className={cn("text-right font-mono tabular-nums", className)}
        placeholder={formatDisplay(0)}
        // Prevent browser autocomplete from injecting floats
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
