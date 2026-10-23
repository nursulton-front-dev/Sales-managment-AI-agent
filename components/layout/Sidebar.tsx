'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  TrendingUp,
  Users2,
  CalendarCheck2,
  MessageSquare,
  Bot,
  Plug,
  CreditCard,
  Settings,
  Shield,
  Play,
  Building2,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { openSandbox, activeAgent, user } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.email?.toLowerCase() === 'maxramovnursulton1@gmail.com';

  const navItems = [
    {
      title: 'Обзор',
      href: '/dashboard',
      icon: TrendingUp,
      exact: true,
    },
    {
      title: 'Лиды и записи',
      href: '/dashboard/leads',
      icon: CalendarCheck2,
    },
    {
      title: 'Диалоги',
      href: '/dashboard/conversations',
      icon: MessageSquare,
    },
    {
      title: 'ИИ-сотрудники',
      href: '/dashboard/agents',
      icon: Bot,
    },
    {
      title: 'Интеграции',
      href: '/dashboard/integrations',
      icon: Plug,
    },
    {
      title: 'Тарифы и баланс',
      href: '/dashboard/billing',
      icon: CreditCard,
    },
  ];

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileOpen && onMobileClose) {
        onMobileClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  // Prevent background body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-[var(--surface)] text-[var(--text-primary)]">
      <div>
        {/* Brand Header with Red Square Icon */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border)]">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] rounded-[6px]"
          >
            <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-[var(--text-primary)] text-sm tracking-tight">
              AI Business OS
            </span>
          </Link>

          {/* Close button on mobile */}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Закрыть меню навигации"
              className="lg:hidden w-10 h-10 -mr-2 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1" aria-label="Основная навигация">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`h-10 px-3 flex items-center gap-3 rounded-[6px] text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.16)] text-[#DC2626] dark:text-[#FCA5A5] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isActive ? 'text-[#DC2626] dark:text-[#FCA5A5]' : 'text-[var(--text-muted)]'
                  }`}
                />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions: Test-drive, Settings, Admin Platform */}
      <div className="p-3 border-t border-[var(--border)] space-y-1">
        {/* Test-Drive (Sandbox) trigger */}
        <button
          type="button"
          onClick={() => {
            if (onMobileClose) onMobileClose();
            openSandbox(activeAgent?.id);
          }}
          className="w-full h-10 px-3 flex items-center gap-3 rounded-[6px] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <Play className="w-[18px] h-[18px] shrink-0 text-[var(--text-muted)]" />
          <span className="truncate">Тест-драйв</span>
        </button>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          onClick={onMobileClose}
          className={`h-10 px-3 flex items-center gap-3 rounded-[6px] text-sm transition-colors cursor-pointer ${
            pathname === '/dashboard/settings'
              ? 'bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.16)] text-[#DC2626] dark:text-[#FCA5A5] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
          }`}
        >
          <Settings
            className={`w-[18px] h-[18px] shrink-0 ${
              pathname === '/dashboard/settings'
                ? 'text-[#DC2626] dark:text-[#FCA5A5]'
                : 'text-[var(--text-muted)]'
            }`}
          />
          <span className="truncate">Настройки</span>
        </Link>

        {/* SuperAdmin Access Platform block */}
        {isSuperAdmin && (
          <div className="pt-2 mt-1 border-t border-[var(--border)]">
            <Link
              href="/admin"
              onClick={onMobileClose}
              className={`h-10 px-3 flex items-center justify-between rounded-[6px] text-sm transition-colors cursor-pointer ${
                pathname === '/admin'
                  ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Shield className="w-[18px] h-[18px] shrink-0 text-[#DC2626]" />
                <span className="truncate font-medium">Платформа</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                admin
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static left rail */}
      <aside className="hidden lg:flex w-60 border-r border-[var(--border)] flex-col justify-between shrink-0 min-h-screen bg-[var(--surface)]">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Меню навигации"
            className="relative w-72 max-w-[85vw] h-full shadow-2xl z-50 border-r border-[var(--border)] transform transition-transform duration-200 ease-out"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
