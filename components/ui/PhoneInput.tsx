'use client';

import React, { useState, useId } from 'react';

export interface CountryOption {
  code: string;
  name: string;
  prefix: string;
  flag: string;
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'UZ', name: 'Узбекистан', prefix: '+998', flag: '🇺🇿', placeholder: '90 123 45 67' },
  { code: 'KZ', name: 'Казахстан', prefix: '+7', flag: '🇰🇿', placeholder: '701 123 45 67' },
  { code: 'RU', name: 'Россия', prefix: '+7', flag: '🇷🇺', placeholder: '900 123 45 67' },
  { code: 'KG', name: 'Кыргызстан', prefix: '+996', flag: '🇰🇬', placeholder: '555 123 456' },
  { code: 'INT', name: 'Другая страна', prefix: '+', flag: '🌐', placeholder: '1 234 567 890' },
];

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (fullPhone: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function PhoneInput({
  label = 'Номер телефона руководителя',
  value,
  onChange,
  error,
  helperText,
  required = false,
}: PhoneInputProps) {
  const inputId = useId();
  const [countryCode, setCountryCode] = useState('UZ');
  const chosen = COUNTRIES.find((country) => country.code === countryCode)!;
  const selectedCountry = !value || value.startsWith(chosen.prefix) ? chosen : COUNTRIES.find((country) => country.prefix !== '+' && value.startsWith(country.prefix)) || COUNTRIES[4];
  const localNumber = value.startsWith(selectedCountry.prefix) ? value.slice(selectedCountry.prefix.length).trimStart() : value;

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const country = COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
    setCountryCode(country.code);
    const combined = `${country.prefix} ${localNumber}`.trim();
    onChange(combined);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const combined = `${selectedCountry.prefix} ${raw}`.trim();
    onChange(combined);
  };

  return (
    <div className="w-full space-y-1 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-secondary)]">
          {label} {required && <span className="text-[var(--danger-text)]">*</span>}
        </label>
      )}

      <div className="flex items-center rounded-[6px] border border-[var(--border)] bg-[var(--surface)] focus-within:ring-1 focus-within:ring-[var(--focus-ring)] focus-within:border-[var(--accent)] overflow-hidden shadow-2xs min-h-[44px] sm:min-h-[38px]">
        <select
          aria-label="Код страны"
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className="max-w-[45%] min-h-[44px] sm:min-h-[38px] bg-[var(--surface-secondary)] border-r border-[var(--border)] text-xs text-[var(--text-secondary)] font-medium px-2.5 py-2 h-full focus:outline-hidden cursor-pointer"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-[var(--surface)] text-[var(--text-primary)]">
              {c.flag} {c.prefix} ({c.name})
            </option>
          ))}
        </select>

        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helperText ? `${inputId}-description` : undefined}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={`Например: ${selectedCountry.placeholder}`}
          className="min-w-0 w-full px-3 py-2 text-base sm:text-xs text-[var(--text-primary)] bg-[var(--surface)] focus:outline-hidden placeholder:text-[var(--text-muted)]"
        />
      </div>

      {error && <p id={`${inputId}-description`} role="alert" className="text-[11px] text-[var(--danger-text)] font-medium">{error}</p>}
      {helperText && !error && <p id={`${inputId}-description`} className="text-[11px] text-[var(--text-muted)]">{helperText}</p>}
    </div>
  );
}
