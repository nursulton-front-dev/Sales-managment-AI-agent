'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Shield,
  LayoutDashboard,
  Building2,
  CreditCard,
  LifeBuoy,
  Cpu,
  History,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('founder@platform.local');
  const [adminRole, setAdminRole] = useState<'super_admin' | 'support' | 'finance'>('super_admin');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Check admin session
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('ai_admin_session');
      const savedRole = (localStorage.getItem('ai_admin_role') as any) || 'super_admin';
      const savedEmail = localStorage.getItem('ai_admin_email') || 'founder@platform.local';

      if (savedAuth === 'true') {
        setIsAdminAuthenticated(true);
        setAdminRole(savedRole);
        setAdminEmail(savedEmail);
      } else {
        setIsAdminAuthenticated(false);
      }
    } catch {
      setIsAdminAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('ai_admin_session');
    localStorage.removeItem('ai_admin_role');
    localStorage.removeItem('ai_admin_email');
    setIsAdminAuthenticated(false);
    router.push('/dashboard');
  };

  const navItems = [
    {
      title: 'Обзор платформы',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
      roles: ['super_admin', 'support', 'finance'],
    },
    {
      title: 'Организации',
      href: '/admin/organizations',
      icon: Building2,
      roles: ['super_admin', 'support', 'finance'],
    },
    {
      title: 'Платежи и токены',
      href: '/admin/billing',
      icon: CreditCard,
      roles: ['super_admin', 'finance'],
    },
    {
      title: 'Очередь поддержки',
      href: '/admin/support',
      icon: LifeBuoy,
      roles: ['super_admin', 'support'],
    },
    {
      title: 'Агенты и операции',
      href: '/admin/operations',
      icon: Cpu,
      roles: ['super_admin'],
    },
    {
      title: 'Журнал аудита',
      href: '/admin/audit',
      icon: History,
      roles: ['super_admin'],
    },
  ];

  // Prevent background scroll when mobile drawer open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0 bg-[#18232D] text-slate-100">
      {/* 1. Header (shrink-0) */}
      <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-white/10">
        <Link
          href="/admin"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-tight block leading-tight">
              Панель платформы
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              AI Business OS Admin
            </span>
          </div>
        </Link>

        {mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Закрыть меню"
            className="lg:hidden w-8 h-8 rounded-[6px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Navigation items (scrollable middle, flex-1, min-h-0) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        <nav aria-label="Административная навигация">
          {navItems.map((item) => {
            const hasAccess = item.roles.includes(adminRole);
            if (!hasAccess) return null;

            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/');

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`h-10 px-3 flex items-center gap-3 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#DC2626] text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom pinned user & exit block (shrink-0) */}
      <div className="p-3 shrink-0 border-t border-white/10 space-y-2 bg-[#18232D]">
        {/* Role badge */}
        <div className="p-2.5 rounded-[6px] bg-white/5 border border-white/5 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span>Администратор</span>
            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] uppercase bg-white/10 text-slate-200">
              {adminRole}
            </span>
          </div>
          <div className="text-white font-medium truncate" title={adminEmail}>
            {adminEmail}
          </div>
        </div>

        {/* Back to Client App */}
        <Link
          href="/dashboard"
          className="w-full h-9 px-3 flex items-center justify-center gap-2 rounded-[6px] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Вернуться в кабинет</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-[var(--background)] text-[var(--text-primary)] font-sans antialiased">
      {/* Desktop static left rail */}
      <aside className="hidden lg:flex w-64 shrink-0 h-full overflow-hidden border-r border-[var(--border)]">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-50 transform transition-transform duration-200 ease-out overflow-hidden">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Right Column (Header + Scrollable Main Content) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Открыть меню навигации"
              className="lg:hidden p-2 rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Кабинет основателей
              </span>
              <span className="text-[var(--text-muted)]">/</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                AI Business OS Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeSwitcher />
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">В кабинет</span>
            </Link>
            <button
              onClick={handleAdminLogout}
              title="Выйти из админ-панели"
              className="p-2 text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[rgba(220,38,38,0.14)] rounded-[6px] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Isolated Scrollable Main Container */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
