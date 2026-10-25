'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { BrandLogo } from '@/components/ui/BrandLogo';
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
  Trash2,
  Lock,
  Loader2,
  CheckCircle2,
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

  // DB Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleOpenResetModal = () => {
    setIsResetModalOpen(true);
    setResetPassword('');
    setResetError(null);
    setResetSuccess(null);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetPassword) {
      setResetError('Введите пароль администратора');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Неверный пароль или сбой очистки БД');
      }

      setResetSuccess('База данных успешно очищена! Перезагрузка страницы…');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setResetError(err.message || 'Ошибка при очистке базы данных');
    } finally {
      setIsResetting(false);
    }
  };

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
          className="flex items-center gap-3 focus:outline-none"
        >
          <BrandLogo variant="mark" width={28} theme="white" ariaLabel="Chorla AI" />
          <div>
            <span className="font-bold text-white text-sm tracking-tight block leading-tight">
              Панель платформы
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Chorla AI Admin
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
          {adminRole === 'super_admin' && (
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="mt-2 w-full h-7 px-2 flex items-center justify-center gap-1.5 rounded-[4px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-semibold transition-colors cursor-pointer"
              title="Очистить тестовые данные в базе данных"
            >
              <Trash2 className="w-3 h-3" />
              <span>Очистить БД</span>
            </button>
          )}
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
                Chorla AI Platform
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

      {/* Confirmation Password Modal for Database Wipe */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          style={{ animationDuration: '180ms' }}
        >
          <div
            className="w-full max-w-[440px] bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-[8px] p-6 shadow-2xl relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-[4px] cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[6px] bg-red-100 dark:bg-red-950/60 text-[#DC2626] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reset-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Полная очистка базы данных
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Необратимое действие суперадминистратора
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Будут удалены все организации, лиды, агенты, переписка, тикеты поддержки и балансы токенов в Neon Postgres. Для подтверждения введите пароль основателя.
            </p>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[6px] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  {resetSuccess}
                </p>
              </div>
            ) : (
              <form onSubmit={handleExecuteReset} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-[6px] text-xs text-red-600 dark:text-red-400">
                    {resetError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Пароль подтверждения</span>
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Введите пароль..."
                    className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3.5 h-9 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-[6px] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !resetPassword}
                    className="px-4 h-9 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Очистка…</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Подтвердить и очистить</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
