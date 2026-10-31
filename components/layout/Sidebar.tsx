'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Dialog } from '@/components/ui/Dialog';
import { House, CalendarDays, MessageSquare, Users, Plug, CreditCard, Building2, Headphones, UserRound, ShieldCheck, Play, X, type LucideIcon } from 'lucide-react';

const work = [
  ['Обзор', '/dashboard', House], ['Лиды и записи', '/dashboard/leads', CalendarDays],
  ['Диалоги', '/dashboard/conversations', MessageSquare], ['ИИ-сотрудники', '/dashboard/agents', Users],
  ['Интеграции', '/dashboard/integrations', Plug],
] as const;
const company = [['Тарифы и баланс', '/dashboard/billing', CreditCard], ['Компания и команда', '/dashboard/company', Building2]] as const;
export function Sidebar({ mobileOpen = false, onMobileClose = () => {} }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const path = usePathname();
  const { openSandbox, isSuperAdmin } = useApp();
  const item = (title: string, href: string, Icon: LucideIcon) => {
    const active = path === href || (href !== '/dashboard' && path.startsWith(href + '/'));
    return <Link key={href} href={href} onClick={onMobileClose} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 min-h-11 px-3 rounded-md text-sm ${active ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'}`}>
      <Icon size={19} strokeWidth={1.75} className="shrink-0" /><span>{title}</span>
    </Link>;
  };
  const content = <div className="flex flex-col w-full h-full min-h-0 bg-[var(--surface)]">
    <div className="h-16 flex items-center justify-between px-5 border-b shrink-0">
      <BrandLogo variant="full" width={160} href="/dashboard" ariaLabel="Chorla AI" />
      <button type="button" onClick={onMobileClose} aria-label="Закрыть меню" className="lg:hidden p-2"><X size={20} /></button>
    </div>
    <nav aria-label="Основная навигация" className="flex-1 min-h-0 overflow-y-auto px-3 py-5 space-y-5">
      {[['РАБОТА', work], ['КОМПАНИЯ', company]].map(([label, items]) => <div key={label as string}>
        <p className="px-3 pb-2 text-xs font-medium text-[var(--text-muted)]">{label as string}</p>
        {(items as typeof work | typeof company).map(([title, href, Icon]) => item(title, href, Icon))}
      </div>)}
    </nav>
    <div className="p-3 border-t shrink-0">
      <button type="button" onClick={() => { onMobileClose(); openSandbox(); }} className="w-full flex items-center gap-3 min-h-11 px-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] rounded-md"><Play size={19} strokeWidth={1.75} />Тест-драйв</button>
      {item('Поддержка', '/dashboard/support', Headphones)}
      {item('Профиль', '/dashboard/profile', UserRound)}
      {isSuperAdmin && item('Платформа', '/admin', ShieldCheck)}
    </div>
  </div>;
  return <>
    <aside className="hidden lg:flex w-60 shrink-0 border-r h-full">{content}</aside>
    <Dialog open={mobileOpen} onClose={onMobileClose} label="Меню навигации" className="navigation-drawer">{content}</Dialog>
  </>;
}
