'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function ThemeSwitcher({
  compact = false,
  className = '',
  buttonClassName = '',
}: ThemeSwitcherProps) {
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

  // Close on Escape key
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

  if (!mounted) {
    return (
      <div
        className={`h-10 w-10 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] flex items-center justify-center opacity-70 ${buttonClassName || className}`}
        aria-label="Переключение темы оформления"
      >
        <Sun className="w-4 h-4" />
      </div>
    );
  }

  const currentOption = options.find((o) => o.value === theme) || options[2];
  const DisplayIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Тема оформления: ${currentOption.label}. Нажмите для выбора.`}
        title={`Тема оформления: ${currentOption.label}`}
        className={`h-10 w-10 rounded-[6px] border border-[#D8DFE8] dark:border-slate-700 bg-white dark:bg-[#111C2E] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#171A21] dark:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 ${buttonClassName}`}
      >
        <DisplayIcon className="w-4 h-4 text-[#526079] dark:text-[#A5B4C8]" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Режимы темы оформления"
          className="absolute right-0 mt-2 w-48 rounded-[8px] border border-[#D8DFE8] dark:border-slate-800 bg-white dark:bg-[#111C2E] shadow-xl py-1.5 z-50 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#526079] dark:text-slate-400 border-b border-[#D8DFE8]/60 dark:border-slate-800 mb-1">
            Тема оформления
          </div>
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-[#DC2626] font-semibold'
                    : 'text-[#171A21] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800/50 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 opacity-75" />
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
