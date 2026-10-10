"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  error?: string;
  /** field has been blurred or submitted once; enables the "valid" tick */
  touched?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "type" | "name" | "autoComplete" | "inputMode" | "disabled" | "maxLength">;

/**
 * Floating-label input with a glowing focus ring and inline validation.
 * The label is a real <label> tied to the input, so it works with screen readers
 * and autofill; the float effect is pure CSS (`peer` + `:placeholder-shown`).
 */
export default function FloatingField({ id, label, value, error, touched, onChange, onBlur, ...input }: Props) {
  const valid = touched && !error && value.trim().length > 0;
  const errorId = `${id}-error`;

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder=" "
        required
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
        className={`peer field-input h-[4.4rem] w-full rounded-2xl border bg-white/[0.04] px-4 pb-1 pt-7 text-base text-white caret-cyan ${
          error ? "border-danger/80" : valid ? "border-success/50" : "border-white/15"
        }`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-base text-muted transition-all duration-200 ease-out peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:scale-[0.78] peer-focus:text-cyan peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.78]"
      >
        {label}
      </label>

      {valid && (
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-success" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}

      <p id={errorId} className={`px-1 text-sm text-[#ff9bb0] transition-all duration-200 ${error ? "mt-1.5 max-h-8 opacity-100" : "max-h-0 overflow-hidden opacity-0"}`} aria-live="polite">
        {error}
      </p>
    </div>
  );
}
