'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface ThemeSwitcherProps { compact?: boolean; className?: string; buttonClassName?: string; locale?: 'ru' | 'uz' }
const subscribe = () => () => {};
export function ThemeSwitcher({ className = '', buttonClassName = '', locale: localeOverride }: ThemeSwitcherProps) {
  const { locale } = useApp();
  const uz = (localeOverride || locale) === 'uz';
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const options = [
    { value: 'light', label: uz ? 'Yorug‘' : 'Светлая', icon: Sun },
    { value: 'dark', label: uz ? 'Qorong‘i' : 'Тёмная', icon: Moon },
    { value: 'system', label: uz ? 'Tizimga mos' : 'Как в системе', icon: Laptop },
  ];
  const label = uz ? 'Mavzuni tanlash' : 'Выбор темы';
  const Icon = mounted && resolvedTheme === 'dark' ? Moon : Sun;
  return <div ref={container} className={`relative inline-block text-left ${className}`}>
    <button ref={trigger} type="button" disabled={!mounted} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={label} title={label} className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${buttonClassName}`}><Icon aria-hidden="true" size={19}/></button>
    {open && <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-popover)]" role="group" aria-label={label}>
      {options.map(({ value, label, icon: OptionIcon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => { setTheme(value); setOpen(false); trigger.current?.focus(); }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"><OptionIcon size={16} aria-hidden="true"/><span className="flex-1">{label}</span>{theme === value && <Check size={16} aria-hidden="true"/>}</button>)}
    </div>}
  </div>;
}
