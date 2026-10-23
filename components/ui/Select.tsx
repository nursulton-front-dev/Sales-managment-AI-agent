import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2 min-h-[44px] sm:min-h-[38px] text-base sm:text-xs text-[var(--text-primary)] bg-[var(--surface)] border rounded-[6px] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] disabled:bg-[var(--surface-secondary)] disabled:text-[var(--text-muted)] cursor-pointer ${
            error
              ? 'border-[var(--danger)] focus:ring-[var(--danger-border)] focus:border-[var(--danger)]'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--surface)] text-[var(--text-primary)]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-[var(--danger-text)] font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-[var(--text-muted)]">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
