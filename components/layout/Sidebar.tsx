'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  TrendingUp,
  Users2,
  CalendarCheck2,
  MessageSquare,
  Bot,
  Plug,
  CreditCard,
  Building2,
  LifeBuoy,
  User,
  Shield,
  Play,
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

  const workItems = [
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
  ];

  const companyItems = [
    {
      title: 'Тарифы и баланс',
      href: '/dashboard/billing',
      icon: CreditCard,
    },
    {
      title: 'Компания и команда',
      href: '/dashboard/company',
      icon: Building2,
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
    <div className="flex flex-col h-full min-h-0 bg-[var(--surface)] text-[var(--text-primary)]">
      {/* 1. Fixed Top Brand Header */}
      <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-[var(--border)]">
        <BrandLogo
          variant="full"
          width={150}
          href="/dashboard"
          ariaLabel="Chorla AI"
        />

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

      {/* 2. Scrollable Middle Navigation Menu (takes available space, scrollable if height is small) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {/* Section: РАБОТА */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)] tracking-wider uppercase select-none">
            Работа
          </div>
          <nav aria-label="Раздел Работа" className="space-y-0.5">
            {workItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`h-9 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
                  }`}
                >
                  <Icon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      isActive ? 'text-[var(--accent-soft-text)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section: КОМПАНИЯ */}
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-[var(--text-muted)] tracking-wider uppercase select-none">
            Компания
          </div>
          <nav aria-label="Раздел Компания" className="space-y-0.5">
            {companyItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`h-9 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
                  }`}
                >
                  <Icon
                    className={`w-[17px] h-[17px] shrink-0 ${
                      isActive ? 'text-[var(--accent-soft-text)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Fixed Bottom Actions: Test-drive, Support, Profile, Admin */}
      <div className="p-3 shrink-0 border-t border-[var(--border)] space-y-0.5 bg-[var(--surface)]">
        {/* Test-Drive (Sandbox) trigger */}
        <button
          type="button"
          onClick={() => {
            if (onMobileClose) onMobileClose();
            openSandbox(activeAgent?.id);
          }}
          className="w-full h-9 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <Play className="w-[17px] h-[17px] shrink-0 text-[var(--text-muted)]" />
          <span className="truncate">Тест-драйв</span>
        </button>

        {/* Support */}
        <Link
          href="/dashboard/support"
          onClick={onMobileClose}
          className={`h-9 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
            pathname === '/dashboard/support'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
          }`}
        >
          <LifeBuoy
            className={`w-[17px] h-[17px] shrink-0 ${
              pathname === '/dashboard/support'
                ? 'text-[var(--accent-soft-text)]'
                : 'text-[var(--text-muted)]'
            }`}
          />
          <span className="truncate">Поддержка</span>
        </Link>

        {/* Profile */}
        <Link
          href="/dashboard/profile"
          onClick={onMobileClose}
          className={`h-9 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
            pathname === '/dashboard/profile'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
          }`}
        >
          <User
            className={`w-[17px] h-[17px] shrink-0 ${
              pathname === '/dashboard/profile'
                ? 'text-[var(--accent-soft-text)]'
                : 'text-[var(--text-muted)]'
            }`}
          />
          <span className="truncate">Профиль</span>
        </Link>

        {/* SuperAdmin Access Platform link */}
        {isSuperAdmin && (
          <div className="pt-2 mt-1 border-t border-[var(--border)]">
            <Link
              href="/admin"
              onClick={onMobileClose}
              className={`h-9 px-3 flex items-center justify-between rounded-[6px] text-xs transition-colors cursor-pointer ${
                pathname === '/admin' || pathname?.startsWith('/admin/')
                  ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Shield className="w-[17px] h-[17px] shrink-0 text-[var(--accent)]" />
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
      {/* Desktop static left rail (full height 100%, shrink-0, overflow-hidden) */}
      <aside className="hidden lg:flex w-60 border-r border-[var(--border)] shrink-0 h-full overflow-hidden bg-[var(--surface)]">
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
            className="relative w-72 max-w-[85vw] h-full shadow-2xl z-50 border-r border-[var(--border)] transform transition-transform duration-200 ease-out overflow-hidden"
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
