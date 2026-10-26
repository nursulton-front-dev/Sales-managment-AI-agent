'use client';

import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Menu } from 'lucide-react';

export function Header({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { user, plan, tokenBalance, workspaceLoading, workspaceError } = useApp();
  const known = !workspaceLoading && !workspaceError && user;
  return <header className="h-16 shrink-0 bg-[var(--surface)] border-b px-3 sm:px-6 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <button onClick={onMobileMenuToggle} type="button" aria-label="Открыть меню навигации" className="lg:hidden p-2 rounded-md"><Menu size={20} /></button>
      <span className="font-semibold truncate text-sm max-w-24 sm:max-w-64">{known ? user.companyName : 'Загрузка…'}</span>
      {known && <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-[var(--surface-secondary)] text-xs font-medium">{plan}</span>}
    </div>
    <div className="flex items-center gap-1 sm:gap-4 shrink-0">
      <Link href="/dashboard/billing" aria-label="Тарифы и баланс" className="flex items-center text-sm gap-1 tabular-nums"><strong>{known ? tokenBalance.toLocaleString('ru-RU') : '—'}</strong><span className="hidden md:inline text-[var(--text-secondary)]">токенов</span></Link>
      <Link href="/dashboard/billing" className="hidden md:flex items-center px-4 py-2 border border-[var(--accent)] rounded-md text-sm font-medium text-[var(--accent-link)]">Пополнить</Link>
      <ThemeSwitcher compact />
      <Link href="/dashboard/profile" aria-label="Открыть профиль" className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-[var(--surface-secondary)] font-semibold">{user?.name?.slice(0, 1).toUpperCase() || '—'}</Link>
    </div>
  </header>;
}
