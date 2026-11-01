'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Dialog } from '@/components/ui/Dialog';
import {
  House,
  CalendarDays,
  MessageSquare,
  Users,
  Plug,
  CreditCard,
  Building2,
  Headphones,
  UserRound,
  ShieldCheck,
  Play,
  X,
  type LucideIcon,
} from 'lucide-react';

const work = [
  ['Обзор', '/dashboard', House],
  ['Лиды и записи', '/dashboard/leads', CalendarDays],
  ['Диалоги', '/dashboard/conversations', MessageSquare],
  ['ИИ-сотрудники', '/dashboard/agents', Users],
  ['Интеграции', '/dashboard/integrations', Plug],
] as const;

const company = [
  ['Тарифы и баланс', '/dashboard/billing', CreditCard],
  ['Компания и команда', '/dashboard/company', Building2],
] as const;

export function Sidebar({
  mobileOpen = false,
  onMobileClose = () => {},
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const path = usePathname();
  const { openSandbox, isSuperAdmin } = useApp();

  const item = (title: string, href: string, Icon: LucideIcon) => {
    const active =
      path === href || (href !== '/dashboard' && path.startsWith(href + '/'));

    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 min-h-10 px-3.5 rounded-xl text-xs sm:text-sm transition-all ${
          active
            ? 'bg-red-500/10 dark:bg-red-500/15 text-[#FF7277] font-bold border border-red-500/20 shadow-2xs'
            : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:bg-[var(--surface-secondary)] dark:hover:bg-[#142137] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
        }`}
      >
        <Icon size={18} strokeWidth={1.75} className="shrink-0" />
        <span>{title}</span>
      </Link>
    );
  };

  const content = (
    <div className="flex flex-col w-full h-full min-h-0 bg-[var(--surface)] dark:bg-[#101B2E]">
      <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border)] dark:border-[#29374C] shrink-0">
        <BrandLogo variant="full" width={150} href="/dashboard" ariaLabel="Gapchi AI" />
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Закрыть меню"
          className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X size={20} />
        </button>
      </div>

      <nav
        aria-label="Основная навигация"
        className="flex-1 min-h-0 overflow-y-auto px-3 py-5 space-y-6"
      >
        {[
          ['РАБОТА', work],
          ['КОМПАНИЯ', company],
        ].map(([label, items]) => (
          <div key={label as string} className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/60">
              {label as string}
            </p>
            {(items as typeof work | typeof company).map(([title, href, Icon]) =>
              item(title, href, Icon)
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] dark:border-[#29374C] shrink-0 space-y-1">
        <button
          type="button"
          onClick={() => {
            onMobileClose();
            openSandbox();
          }}
          className="w-full flex items-center gap-3 min-h-10 px-3.5 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0] hover:bg-[var(--surface-secondary)] dark:hover:bg-[#142137] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] rounded-xl transition-colors cursor-pointer"
        >
          <Play size={17} strokeWidth={1.75} className="text-[#FF7277]" />
          <span>Тест-драйв</span>
        </button>
        {item('Поддержка', '/dashboard/support', Headphones)}
        {item('Профиль', '/dashboard/profile', UserRound)}
        {isSuperAdmin && item('Платформа', '/admin', ShieldCheck)}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-[var(--border)] dark:border-[#29374C] h-full shadow-2xs">
        {content}
      </aside>
      <Dialog
        open={mobileOpen}
        onClose={onMobileClose}
        label="Меню навигации"
        className="navigation-drawer p-0 border-r border-[var(--border)] dark:border-[#29374C]"
      >
        {content}
      </Dialog>
    </>
  );
}
