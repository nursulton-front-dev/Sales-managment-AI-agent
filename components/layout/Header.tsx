'use client';

import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Menu, MessageSquare, Zap } from 'lucide-react';

export function Header({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle?: () => void;
}) {
  const { user, plan, tokenBalance, workspaceLoading, workspaceError } = useApp();
  const known = !workspaceLoading && !workspaceError && user;

  return (
    <header className="h-16 shrink-0 bg-[var(--surface)] dark:bg-[#101B2E] border-b border-[var(--border)] dark:border-[#29374C] px-3.5 sm:px-6 flex items-center justify-between gap-3 shadow-2xs">
      {/* Left: Organization Title and Plan Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          type="button"
          aria-label="Открыть меню навигации"
          className="lg:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
        >
          <Menu size={20} />
        </button>
        <span className="font-bold truncate text-xs sm:text-sm max-w-28 sm:max-w-64 text-[var(--text-primary)] dark:text-[#F4F7FB]">
          {known ? user.companyName : 'Загрузка…'}
        </span>
        {known && (
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-[11px] font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0]">
            {plan}
          </span>
        )}
      </div>

      {/* Right: Response Balance, Topup Button, Theme Switcher, Avatar */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link
          href="/dashboard/billing"
          aria-label="Тарифы и баланс"
          className="flex items-center text-xs sm:text-sm gap-1.5 tabular-nums text-[var(--text-primary)] dark:text-[#F4F7FB] px-2.5 py-1 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C]"
        >
          <Zap size={14} className="text-[#FF7277]" />
          <strong>{known ? tokenBalance.toLocaleString('ru-RU') : '—'}</strong>
          <span className="hidden md:inline text-[var(--text-secondary)] dark:text-[#AABAD0] text-xs">
            ответов
          </span>
        </Link>

        <Link
          href="/dashboard/billing"
          className="hidden md:flex items-center px-3.5 py-1.5 bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] rounded-xl text-xs font-semibold shadow-2xs transition-all"
        >
          Пополнить
        </Link>

        <ThemeSwitcher compact />

        <Link
          href="/dashboard/profile"
          aria-label="Открыть профиль"
          className="size-9 flex items-center justify-center rounded-xl bg-[var(--surface-secondary)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] font-bold text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] hover:border-[var(--border-strong)] transition-all"
        >
          {user?.name?.slice(0, 1).toUpperCase() || '—'}
        </Link>
      </div>
    </header>
  );
}
