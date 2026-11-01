'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import {
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

type Company = {
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  niche: string;
};

export default function CompanyPage() {
  const { plan, showToast, refreshWorkspace, workspace } = useApp();
  const [tab, setTab] = useState<'company' | 'team'>('company');
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({ companyName: '', ownerPhone: '', niche: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = Boolean(
    company &&
      Object.entries(form).some(
        ([key, value]) => company[key as keyof Company] !== value
      )
  );
  useUnsavedChanges(dirty);

  const load = async () => {
    try {
      const res = await fetch('/api/workspace/settings');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Не удалось загрузить компанию');
      setCompany(data.workspace);
      setForm({
        companyName: data.workspace.companyName || '',
        ownerPhone: data.workspace.ownerPhone || '',
        niche: data.workspace.niche || '',
      });
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 text-left">
      <PageHeader
        title="Компания и команда"
        description="Профиль организации, настройки рабочего пространства и права доступа."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)]/70 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-2xl w-fit">
        {[
          { id: 'company', label: 'Компания', icon: Building2 },
          { id: 'team', label: 'Команда', icon: Users },
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = tab === tabItem.id;
          return (
            <button
              type="button"
              key={tabItem.id}
              aria-pressed={isActive}
              onClick={() => setTab(tabItem.id as 'company' | 'team')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={16} />
              <span>{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      <DataState loading={loading} error={error} retry={load} />

      {!loading && !error && company && (
        <>
          {tab === 'company' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Edit Company Form */}
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 shadow-xs space-y-5">
                  <div className="border-b border-[var(--border)] dark:border-[#29374C] pb-3">
                    <h2 className="text-base font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      Информация об организации
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Эти данные используются в диалогах ИИ-агентов при представлении клиентам.
                    </p>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (saving) return;
                      setSaving(true);
                      try {
                        const res = await fetch('/api/workspace/settings', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(form),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success)
                          throw new Error(data.error || 'Не удалось сохранить компанию');
                        setCompany(data.workspace);
                        await refreshWorkspace();
                        showToast('Данные компании сохранены');
                      } catch (failure) {
                        showToast(
                          'Не удалось сохранить',
                          failure instanceof Error ? failure.message : 'Ошибка сети',
                          'error'
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Название компании"
                        value={form.companyName}
                        onChange={(e) =>
                          setForm({ ...form, companyName: e.target.value })
                        }
                        required
                        maxLength={200}
                        placeholder="Например, Олимп Клиник"
                      />

                      <Input
                        label="Сфера бизнеса"
                        value={form.niche}
                        onChange={(e) =>
                          setForm({ ...form, niche: e.target.value })
                        }
                        maxLength={100}
                        placeholder="Медицина, салон красоты, ритейл..."
                      />

                      <Input
                        type="tel"
                        label="Рабочий телефон"
                        value={form.ownerPhone}
                        onChange={(e) =>
                          setForm({ ...form, ownerPhone: e.target.value })
                        }
                        maxLength={40}
                        placeholder="+998 90 123 45 67"
                      />

                      <div>
                        <Input
                          label="Email владельца"
                          value={company.ownerEmail}
                          readOnly
                          className="bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] cursor-not-allowed text-[var(--text-muted)]"
                        />
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 mt-1 block">
                          Для изменения email обратитесь в поддержку
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={saving}
                        disabled={!dirty}
                        className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
                      >
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Workspace & Calendar Cards */}
              <div className="lg:col-span-4 space-y-5">
                {/* Workspace Card */}
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                    Рабочее пространство
                  </span>
                  <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                        {company.companyName || 'Без названия'}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        Тариф {plan?.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant="success">● Активно</Badge>
                  </div>
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline"
                  >
                    <span>Перейти к тарифам и балансу</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {/* Calendar Schedule Card */}
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-white dark:bg-slate-800 border border-[var(--border)] dark:border-[#29374C] flex items-center justify-center shrink-0">
                      <Image
                        src="/integrations/google-calendar.png"
                        width={26}
                        height={26}
                        alt="Google Календарь"
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        График и запись клиентов
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        {workspace?.googleCalendarConnected
                          ? 'Синхронизация с Google активна'
                          : 'Календарь не подключён'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                    Настройте рабочие часы и длительность слота консультаций в каталоге подключений.
                  </p>
                  <Link
                    href="/dashboard/integrations"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline"
                  >
                    <span>Открыть настройки календаря</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Team Tab */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] dark:border-[#29374C]">
                    <h2 className="text-base font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      Участники компании
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      1 участник
                    </span>
                  </div>

                  {/* Owner Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-red-500/10 text-[#FF7277] font-bold text-sm flex items-center justify-center shrink-0">
                        {company.ownerName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <strong className="text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                          {company.ownerName}
                        </strong>
                        <span className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] break-all">
                          {company.ownerEmail}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">Владелец</Badge>
                      <Badge variant="success">● Активен</Badge>
                    </div>
                  </div>

                  {/* Team Invites Roadmap Notice */}
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed space-y-1">
                    <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                      Приглашение коллег и роли команды (Roadmap)
                    </strong>
                    <p>
                      Функция добавления операторов, разграничения прав и совместной работы над диалогами
                      находится в разработке и появится в тарифах BUSINESS и PRO.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Roles & Permissions */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    Роли и права доступа
                  </h3>
                  <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] space-y-1">
                    <strong className="text-xs font-bold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                      Владелец (Owner)
                    </strong>
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      Полный доступ ко всем разделам: управление сотрудниками, просмотр лидов, ручной ответ клиентам, списание и оплата тарифа.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
