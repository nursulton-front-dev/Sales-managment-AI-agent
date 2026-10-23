'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
}

export function ThemeSwitcher({ compact = false, className = '' }: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const options = [
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
    { value: 'system', label: 'Как в системе', icon: Laptop },
  ] as const;

  // Placeholder while mounting to guarantee 0 layout shift and 0 SSR mismatch
  if (!mounted) {
    return (
      <div
        className={`h-8 w-8 sm:w-auto sm:px-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] flex items-center justify-center gap-1.5 text-xs opacity-75 ${className}`}
        aria-label="Переключение темы оформления"
      >
        <Laptop className="w-3.5 h-3.5" />
        {!compact && <span className="hidden sm:inline text-xs font-medium">Тема</span>}
      </div>
    );
  }

  const currentOption = options.find((o) => o.value === theme) || options[2];
  const CurrentIcon = currentOption.icon;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Тема оформления: ${currentOption.label}. Нажмите для выбора.`}
        className="h-8 px-2 sm:px-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        {!compact && (
          <span className="hidden sm:inline text-xs">
            {currentOption.label}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Режимы темы оформления"
          className="absolute right-0 mt-1.5 w-44 rounded-[8px] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg py-1 z-50 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] mb-0.5">
            Тема оформления
          </div>
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-medium'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{option.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
