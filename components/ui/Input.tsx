import React, { InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? descriptionId : undefined}
          className={`w-full px-3 py-2 sm:py-2 min-h-[44px] sm:min-h-[38px] text-base sm:text-sm text-[var(--text-primary)] bg-[var(--surface)] border rounded-[6px] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] disabled:bg-[var(--surface-secondary)] disabled:text-[var(--text-muted)] ${
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger-border)] focus:border-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]'
          } ${className}`}
          {...props}
        />
        {error && <p id={descriptionId} role="alert" className="text-xs text-[var(--danger-text)] font-medium">{error}</p>}
        {helperText && !error && <p id={descriptionId} className="text-xs text-[var(--text-muted)]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
