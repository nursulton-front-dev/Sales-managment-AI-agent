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
  const { plan, showToast, refreshWorkspace, workspace, locale, t } = useApp();
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
    <div className="space-y-6 w-full pb-10 text-left">
      <PageHeader
        title={t.company.title}
        description={t.company.subtitle}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)]/70 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-2xl w-fit">
        {[
          { id: 'company', label: locale === 'uz' ? 'Kompaniya' : 'Компания', icon: Building2 },
          { id: 'team', label: locale === 'uz' ? 'Jamoa' : 'Команда', icon: Users },
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
                      {locale === 'uz' ? 'Tashkilot ma\'lumotlari' : 'Информация об организации'}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz'
                        ? 'Bu ma\'lumotlar AI-agentlarning mijozlar bilan muloqotida tanishtirish uchun ishlatiladi.'
                        : 'Эти данные используются в диалогах ИИ-агентов при представлении клиентам.'}
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
                          throw new Error(data.error || (locale === 'uz' ? 'Kompaniyani saqlab bo‘lmadi' : 'Не удалось сохранить компанию'));
                        setCompany(data.workspace);
                        await refreshWorkspace();
                        showToast(locale === 'uz' ? 'Kompaniya ma\'lumotlari saqlandi' : 'Данные компании сохранены');
                      } catch (failure) {
                        showToast(
                          locale === 'uz' ? 'Saqlab bo‘lmadi' : 'Не удалось сохранить',
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
                        label={t.company.companyName}
                        value={form.companyName}
                        onChange={(e) =>
                          setForm({ ...form, companyName: e.target.value })
                        }
                        required
                        maxLength={200}
                        placeholder={locale === 'uz' ? 'Masalan, Olim Clinic' : 'Например, Олимп Клиник'}
                      />

                      <Input
                        label={locale === 'uz' ? 'Biznes sohasi' : 'Сфера бизнеса'}
                        value={form.niche}
                        onChange={(e) =>
                          setForm({ ...form, niche: e.target.value })
                        }
                        maxLength={100}
                        placeholder={locale === 'uz' ? 'Tibbiyot, go‘zallik saloni, chakana savdo...' : 'Медицина, салон красоты, ритейл...'}
                      />

                      <Input
                        type="tel"
                        label={locale === 'uz' ? 'Ish telefoni' : 'Рабочий телефон'}
                        value={form.ownerPhone}
                        onChange={(e) =>
                          setForm({ ...form, ownerPhone: e.target.value })
                        }
                        maxLength={40}
                        placeholder="+998 90 123 45 67"
                      />

                      <div>
                        <Input
                          label={locale === 'uz' ? 'Egasining emaili' : 'Email владельца'}
                          value={company.ownerEmail}
                          readOnly
                          className="bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] cursor-not-allowed text-[var(--text-muted)]"
                        />
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 mt-1 block">
                          {locale === 'uz' ? 'Emailni o‘zgartirish uchun yordamga murojaat qiling' : 'Для изменения email обратитесь в поддержку'}
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
                        {t.common.save}
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
                    {locale === 'uz' ? 'Ish maydoni' : 'Рабочее пространство'}
                  </span>
                  <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                        {company.companyName || (locale === 'uz' ? 'Nomsiz' : 'Без названия')}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        {locale === 'uz' ? 'Tarif:' : 'Тариф'} {plan?.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant="success">{locale === 'uz' ? '● Faol' : '● Активно'}</Badge>
                  </div>
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline"
                  >
                    <span>{locale === 'uz' ? 'Tariflar va balansga o‘tish' : 'Перейти к тарифам и балансу'}</span>
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
                        alt="Google Calendar"
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {locale === 'uz' ? 'Ish jadvali va mijozlar yozuvi' : 'График и запись клиентов'}
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        {workspace?.googleCalendarConnected
                          ? (locale === 'uz' ? 'Google bilan sinxronizatsiya faol' : 'Синхронизация с Google активна')
                          : (locale === 'uz' ? 'Taqvim ulanmagan' : 'Календарь не подключён')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                    {locale === 'uz'
                      ? 'Ulanishlar katalogida ish soatlari va konsultatsiya vaqtini sozlang.'
                      : 'Настройте рабочие часы и длительность слота консультаций в каталоге подключений.'}
                  </p>
                  <Link
                    href="/dashboard/integrations"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline"
                  >
                    <span>{locale === 'uz' ? 'Taqvim sozlamalarini ochish' : 'Открыть настройки календаря'}</span>
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
                      {locale === 'uz' ? 'Kompaniya a\'zolari' : 'Участники компании'}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      {locale === 'uz' ? '1 a\'zo' : '1 участник'}
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
                      <Badge variant="neutral">{t.company.roleOwner}</Badge>
                      <Badge variant="success">{locale === 'uz' ? '● Faol' : '● Активен'}</Badge>
                    </div>
                  </div>

                  {/* Team Invites Roadmap Notice */}
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed space-y-1">
                    <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                      {locale === 'uz' ? 'Hamkasblarni taklif qilish va jamoa rollari (Roadmap)' : 'Приглашение коллег и роли команды (Roadmap)'}
                    </strong>
                    <p>
                      {locale === 'uz'
                        ? 'Operatorlarni qo‘shish, huquqlarni taqsimlash va dialoglarda birgalikda ishlash imkoniyati faol ishlab chiqilmoqda va BUSINESS hamda PRO tariflarida paydo bo‘ladi.'
                        : 'Функция добавления операторов, разграничения прав и совместной работы над диалогами находится в разработке и появится в тарифах BUSINESS и PRO.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Roles & Permissions */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs space-y-3">
                  <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Rollar va kirish huquqlari' : 'Роли и права доступа'}
                  </h3>
                  <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] space-y-1">
                    <strong className="text-xs font-bold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                      {locale === 'uz' ? 'Egasi (Owner)' : 'Владелец (Owner)'}
                    </strong>
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                      {locale === 'uz'
                        ? 'Barcha bo‘limlarga to‘liq kirish: xodimlarni boshqarish, lidlarni ko‘rish, mijozlarga qo‘lda javob berish, to‘lovlarni boshqarish.'
                        : 'Полный доступ ко всем разделам: управление сотрудниками, просмотр лидов, ручной ответ клиентам, списание и оплата тарифа.'}
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
