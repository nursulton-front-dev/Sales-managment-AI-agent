'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Building2, LogOut, Menu, User, Coins } from 'lucide-react';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, plan, trialDaysLeft, tokenBalance, logout } = useApp();

  const formattedTokens =
    typeof tokenBalance === 'number'
      ? tokenBalance.toLocaleString('ru-RU')
      : '0';

  return (
    <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-150">
      {/* Left side: Hamburger (mobile) + Company & Plan */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Открыть меню навигации"
            className="lg:hidden w-10 h-10 -ml-2 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="w-8 h-8 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hidden xs:flex items-center justify-center font-bold text-xs shrink-0">
          <Building2 className="w-4 h-4" />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm truncate max-w-[110px] sm:max-w-[220px]">
            {user?.companyName || 'Моя компания'}
          </span>

          {/* Plan badge */}
          {plan === 'TRIAL' ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-medium bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
              <span className="hidden sm:inline">Триал · </span>{trialDaysLeft} дн.
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] font-mono uppercase">
              {plan}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Token balance, ThemeSwitcher, User profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Token Balance */}
        <Link
          href="/dashboard/billing"
          title="Тарифы и баланс токенов"
          className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-[6px] hover:bg-[var(--surface-secondary)] transition-colors text-xs"
        >
          <span className="text-[var(--text-secondary)] hidden md:inline">Баланс:</span>
          <span className="font-semibold text-[var(--text-primary)] font-mono text-xs sm:text-sm">
            {formattedTokens}
            <span className="text-[10px] sm:text-[11px] font-sans font-normal text-[var(--text-muted)] ml-1">
              ток.
            </span>
          </span>
        </Link>

        {/* Theme Switcher: available on desktop & mobile */}
        <ThemeSwitcher compact={true} />

        {/* User Profile / Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 border-l border-[var(--border)] pl-2 sm:pl-3">
          <div
            className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] text-xs font-semibold shrink-0"
            title={user?.email || 'Пользователь'}
          >
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>

          <div className="hidden xl:block text-left text-xs max-w-[140px] truncate">
            <div className="font-medium text-[var(--text-primary)] leading-tight truncate">
              {user?.name || 'Пользователь'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              {user?.email || 'user@example.com'}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            aria-label="Выйти из системы"
            title="Выйти из системы"
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
