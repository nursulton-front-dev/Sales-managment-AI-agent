'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Copy,
  Check,
  CheckCircle2,
  Sliders,
  Code2,
  Send,
  HelpCircle,
  X,
  Laptop,
  Smartphone,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

export type WidgetSettings = {
  agentId: string;
  enabled: boolean;
  title: string;
  greeting: string;
  color: string;
  position: 'left' | 'right';
  allowedOrigins: string[];
};

export type Widget = WidgetSettings & {
  id: string;
  lastSeenAt: string | null;
  lastSeenOrigin: string | null;
};

export const COLOR_PRESETS = [
  { id: 'red', name: 'gapcha Red', value: '#DC2626' },
  { id: 'navy', name: 'Slate Navy', value: '#1E293B' },
  { id: 'sky', name: 'Sky Blue', value: '#0284C7' },
  { id: 'emerald', name: 'Emerald Green', value: '#16A34A' },
] as const;

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  agentId: '',
  enabled: true,
  title: 'Поможем с вашим вопросом',
  greeting: 'Здравствуйте! Я ИИ-помощник компании. Чем могу помочь?',
  color: '#DC2626',
  position: 'right',
  allowedOrigins: [],
};

const settingsOnly = (w: WidgetSettings): WidgetSettings => ({
  agentId: w.agentId,
  enabled: w.enabled,
  title: w.title,
  greeting: w.greeting,
  color: w.color,
  position: w.position,
  allowedOrigins: w.allowedOrigins,
});

/**
 * Full page view for Website Widget Settings matching gapcha-integrations-v2 design
 */
export function WebsiteWidgetSettingsView({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { agents, showToast, t, locale } = useApp();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [form, setForm] = useState<WidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [origins, setOrigins] = useState('');
  const [embedOrigin, setEmbedOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [helping, setHelping] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Tabs: 'appearance' | 'install' | 'check'
  const [tab, setTab] = useState<'appearance' | 'install' | 'check'>('appearance');

  // Preview device: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Load existing widget settings
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations/widget');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (locale === 'uz' ? 'Vidjet sozlamalarini yuklab bo‘lmadi' : 'Не удалось загрузить настройки виджета'));
      }
      if (data.widget) {
        setWidget(data.widget);
        setForm(settingsOnly(data.widget));
        setOrigins(data.widget.allowedOrigins?.join('\n') || '');
      } else {
        // Pick first active agent by default
        const firstAgent = agents.find((a) => a.isActive) || agents[0];
        setForm((prev) => ({
          ...prev,
          agentId: firstAgent?.id || '',
        }));
      }
      const origin = data.embedOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://chorla-ai.vercel.app');
      setEmbedOrigin(origin);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : (locale === 'uz' ? 'Tarmoq xatosi' : 'Ошибка сети'));
    } finally {
      setLoading(false);
    }
  }, [agents, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  // Track unsaved changes
  const parsedOrigins = useMemo(() => {
    return origins
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [origins]);

  const isDirty = useMemo(() => {
    if (!widget) return false;
    return (
      form.agentId !== widget.agentId ||
      form.enabled !== widget.enabled ||
      form.title !== widget.title ||
      form.greeting !== widget.greeting ||
      form.color !== widget.color ||
      form.position !== widget.position ||
      JSON.stringify(parsedOrigins) !== JSON.stringify(widget.allowedOrigins)
    );
  }, [form, widget, parsedOrigins]);

  useUnsavedChanges(isDirty);

  const update = <K extends keyof WidgetSettings>(key: K, val: WidgetSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      // Validate allowed origins: if empty, default to local/current domain or prompt
      const originsToSend = parsedOrigins.length > 0 ? parsedOrigins : ['*'];

      const payload = {
        ...form,
        allowedOrigins: originsToSend.includes('*') ? ['https://example.com'] : originsToSend,
      };

      const res = await fetch('/api/integrations/widget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (locale === 'uz' ? 'Sozlamalarni saqlab bo‘lmadi' : 'Не удалось сохранить настройки'));
      }

      setWidget(data.widget);
      setForm(settingsOnly(data.widget));
      setOrigins(data.widget.allowedOrigins?.join('\n') || '');
      showToast(locale === 'uz' ? 'Vidjet sozlamalari saqlandi' : 'Настройки виджета сохранены');
    } catch (err) {
      showToast(
        locale === 'uz' ? 'Saqlashda xatolik' : 'Ошибка сохранения',
        err instanceof Error ? err.message : (locale === 'uz' ? 'Ulanishni tekshiring' : 'Проверьте соединение'),
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/integrations/widget');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || (locale === 'uz' ? 'Tekshiruv mavjud emas' : 'Проверка недоступна'));
      setWidget(data.widget);
      if (data.widget?.lastSeenAt) {
        showToast(
          locale === 'uz' ? 'O‘rnatish tasdiqlandi' : 'Установка подтверждена',
          locale === 'uz' ? `Vidjet ${data.widget.lastSeenOrigin || 'sayt'}da qayd etildi` : `Виджет зафиксирован на ${data.widget.lastSeenOrigin || 'сайте'}`
        );
      } else {
        showToast(
          locale === 'uz' ? 'O‘rnatish hali aniqlanmadi' : 'Установка пока не обнаружена',
          locale === 'uz' ? 'Saytingiz sahifasini brauzerda oching va yana «Tekshirish» tugmasini bosing.' : 'Откройте страницу вашего сайта в браузере и нажмите «Проверить» повторно.',
          'info'
        );
      }
    } catch (err) {
      showToast(
        locale === 'uz' ? 'Tekshirishda xatolik' : 'Ошибка проверки',
        err instanceof Error ? err.message : (locale === 'uz' ? 'Tarmoq xatosi' : 'Ошибка сети'),
        'error'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleRequestHelp = async () => {
    setHelping(true);
    try {
      const res = await fetch('/api/integrations/widget', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || (locale === 'uz' ? 'Arizani yuborib bo‘lmadi' : 'Не удалось отправить заявку'));
      showToast(
        locale === 'uz' ? 'Ariza yuborildi' : 'Заявка отправлена',
        locale === 'uz' ? `№${data.ticketNumber} murojaat yaratildi. Mutaxassis siz bilan bog‘lanadi.` : `Обращение №${data.ticketNumber} создано. Специалист свяжется с вами.`
      );
    } catch (err) {
      showToast(
        locale === 'uz' ? 'Ariza yuborilmadi' : 'Заявка не отправлена',
        err instanceof Error ? err.message : (locale === 'uz' ? 'Tarmoq xatosi' : 'Ошибка сети'),
        'error'
      );
    } finally {
      setHelping(false);
    }
  };

  const snippet = useMemo(() => {
    const wid = widget?.id || 'demo_widget_id';
    const origin = embedOrigin || 'https://chorla-ai.vercel.app';
    return `<!-- gapcha AI Web Widget -->\n<script src="${origin}/widget.js" data-widget-id="${wid}" defer></script>`;
  }, [widget, embedOrigin]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      showToast(locale === 'uz' ? 'Vidjet kodi xotiraga nusxalandi' : 'Код виджета скопирован в буфер обмена');
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      showToast(locale === 'uz' ? 'Kodni qo‘lda belgilab nusxalang' : 'Выделите и скопируйте код вручную', undefined, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* 1. Header with Breadcrumbs & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] dark:border-[#29374C] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/70 mb-1.5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>{locale === 'uz' ? 'Barcha integratsiyalar' : 'Все интеграции'}</span>
              </button>
            ) : (
              <Link
                href="/dashboard/integrations"
                className="hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB] transition-colors"
              >
                {t.integrations.title}
              </Link>
            )}
            <span>/</span>
            <span className="text-[var(--text-primary)] dark:text-[#F4F7FB] font-medium">
              {locale === 'uz' ? 'Saytdagi chat' : 'Чат на сайте'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {t.integrations.widgetTitle}
            </h1>
            <Badge variant={widget?.enabled ? 'success' : 'neutral'}>
              {widget?.enabled
                ? (locale === 'uz' ? '● Faol' : '● Активен')
                : (locale === 'uz' ? '○ Sozlanmagan' : '○ Не настроен')}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1">
            {locale === 'uz'
              ? 'Tashqi ko‘rinishni sozlang, sayt uchun kodni nusxalang va ulanish holatini tekshiring.'
              : 'Настройте внешний вид, скопируйте код для сайта и проверьте статус подключения.'}
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              {locale === 'uz' ? 'Saqlanmagan o‘zgarishlar bor' : 'Есть несохранённые изменения'}
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={busy || loading}
            isLoading={busy}
            onClick={() => handleSave()}
            className="bg-[#DC2626] hover:bg-[#b91c1c] text-white font-semibold text-xs px-4 py-2"
          >
            {locale === 'uz' ? 'O‘zgarishlarni saqlash' : 'Сохранить изменения'}
          </Button>
        </div>
      </div>

      <DataState loading={loading} error={error} retry={load} />

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Settings Tabs (7 cols)                       */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* Nav Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setTab('appearance')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'appearance'
                    ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
                }`}
              >
                <Sliders size={14} />
                <span>{locale === 'uz' ? 'Ko‘rinish' : 'Оформление'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('install')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'install'
                    ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
                }`}
              >
                <Code2 size={14} />
                <span>{locale === 'uz' ? 'O‘rnatish' : 'Установка'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('check')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'check'
                    ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-xs font-semibold'
                    : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)] dark:hover:text-[#F4F7FB]'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>{locale === 'uz' ? 'Tekshirish' : 'Проверка'}</span>
              </button>
            </div>

            {/* TAB 1: ОФОРМЛЕНИЕ */}
            {tab === 'appearance' && (
              <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 sm:p-6 space-y-5 shadow-xs">
                {/* Agent select */}
                <div>
                  <Select
                    label={locale === 'uz' ? 'Mas\'ul xodim' : 'Ответственный сотрудник'}
                    value={form.agentId}
                    onChange={(e) => update('agentId', e.target.value)}
                    options={[
                      { value: '', label: locale === 'uz' ? 'Xodimni tanlang' : 'Выберите сотрудника' },
                      ...agents.map((a) => ({
                        value: a.id,
                        label: `${a.name}${a.isActive ? '' : (locale === 'uz' ? ' (nofaol)' : ' (неактивен)')}`,
                      })),
                    ]}
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-1">
                    {locale === 'uz'
                      ? 'AI-xodim vidjetda sayt tashrif buyuruvchilarining savollariga javob beradi.'
                      : 'ИИ-сотрудник будет отвечать на сообщения посетителей в виджете.'}
                  </p>
                </div>

                {/* Widget title */}
                <div>
                  <Input
                    label={locale === 'uz' ? 'Vidjet sarlavhasi' : 'Заголовок виджета'}
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    maxLength={80}
                    placeholder={locale === 'uz' ? 'Savolingiz bo‘yicha yordam beramiz' : 'Поможем с вашим вопросом'}
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-1">
                    {locale === 'uz' ? 'Chat oynasi yuqorisida ko‘rinadi.' : 'Отображается в шапке окна чата.'}
                  </p>
                </div>

                {/* Greeting text */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Salomlashuv xabari' : 'Приветственное сообщение'}
                  </label>
                  <textarea
                    rows={3}
                    value={form.greeting}
                    onChange={(e) => update('greeting', e.target.value)}
                    maxLength={500}
                    placeholder={locale === 'uz' ? 'Assalomu alaykum! Men AI-maslahatchiman. Sizga qanday yordam bera olaman?' : 'Здравствуйте! Я ИИ-помощник компании. Чем могу помочь?'}
                    className="w-full rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#101B2E] p-3 text-xs sm:text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]/30 transition-colors resize-none"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                    {locale === 'uz' ? 'Foydalanuvchi chatni ochganda ko‘radigan birinchi xabar.' : 'Первая реплика, которую видит пользователь при открытии чата.'}
                  </p>
                </div>

                {/* Color swatches */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Rang mavzusi' : 'Цветовая тема'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {COLOR_PRESETS.map((preset) => {
                      const selected = form.color.toLowerCase() === preset.value.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => update('color', preset.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                            selected
                              ? 'border-[#DC2626] bg-[#DC2626]/5 dark:bg-rose-950/20 shadow-2xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]'
                              : 'border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <span
                            className="size-4.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.value }}
                          />
                          <span className="truncate">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Widget Position */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Saytdagi joylashuvi' : 'Расположение на сайте'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => update('position', 'right')}
                      className={`p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                        form.position === 'right'
                          ? 'border-[#DC2626] bg-[#DC2626]/5 dark:bg-rose-950/20 text-[var(--text-primary)] dark:text-[#F4F7FB] font-semibold'
                          : 'border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0]'
                      }`}
                    >
                      <div className="font-semibold">{locale === 'uz' ? 'O‘ngda (Tavsiya etiladi)' : 'Справа (Рекомендуется)'}</div>
                      <div className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-0.5">
                        {locale === 'uz' ? 'Odatdagi pastki o‘ng burchak' : 'Привычный нижний правый угол'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => update('position', 'left')}
                      className={`p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                        form.position === 'left'
                          ? 'border-[#DC2626] bg-[#DC2626]/5 dark:bg-rose-950/20 text-[var(--text-primary)] dark:text-[#F4F7FB] font-semibold'
                          : 'border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0]'
                      }`}
                    >
                      <div className="font-semibold">{locale === 'uz' ? 'Chapda' : 'Слева'}</div>
                      <div className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-0.5">
                        {locale === 'uz' ? 'Pastki chap burchak' : 'Нижний левый угол страницы'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Enabled toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                      {locale === 'uz' ? 'Vidjet holati' : 'Статус виджета'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                      {locale === 'uz'
                        ? 'Vidjet ko‘rinishi va tashrif buyuruvchilarga javob berishi uchun yoqing'
                        : 'Включите, чтобы виджет отображался и отвечал посетителям'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => update('enabled', e.target.checked)}
                      disabled={busy}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-[#DC2626]/30 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-slate-600 peer-checked:bg-[#DC2626]" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: УСТАНОВКА */}
            {tab === 'install' && (
              <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 sm:p-6 space-y-5 shadow-xs">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Saytga joylashtirish uchun kod' : 'Код для размещения на сайте'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                    {locale === 'uz' ? (
                      <>Skriptni nusxalang va uni saytingizning <code className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[#DC2626] font-mono text-[11px]">&lt;/body&gt;</code> yopuvchi tegidan oldin joylashtiring.</>
                    ) : (
                      <>Скопируйте скрипт и вставьте его перед закрывающим тегом <code className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[#DC2626] font-mono text-[11px]">&lt;/body&gt;</code> вашего сайта.</>
                    )}
                  </p>
                </div>

                {/* Code block */}
                <div className="relative rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
                  <pre className="pr-12 text-[11px] leading-relaxed select-all">{snippet}</pre>
                  <button
                    type="button"
                    onClick={copySnippet}
                    aria-label={locale === 'uz' ? 'Kodni nusxalash' : 'Копировать код'}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    {copiedSnippet ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Placement instructions */}
                <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] space-y-2 text-xs">
                  <span className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] block">
                    {locale === 'uz' ? 'Mashhur platformalar uchun o‘rnatish ko‘rsatmalari:' : 'Инструкции по установке для популярных платформ:'}
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)] dark:text-[#AABAD0] leading-snug">
                    <li><strong>Tilda:</strong> {locale === 'uz' ? 'Sayt sozlamalari → Yana → HEAD yoki </body> oldidan HTML-kod.' : 'Настройки сайта → Еще → HTML-код для вставки внутри HEAD или перед </body>.'}</li>
                    <li><strong>WordPress:</strong> {locale === 'uz' ? 'Tashqi ko‘rinish → Mavzular muharriri → footer.php yoki «Insert Headers and Footers» plagini orqali.' : 'Внешний вид → Редактор тем → footer.php или через плагин «Insert Headers and Footers».'}</li>
                    <li><strong>Taplink / Creatium:</strong> {locale === 'uz' ? 'Sozlamalar → Kod qo‘yish → BODY yopilishidan oldin.' : 'Настройки → Вставки кода → Перед закрывающим тегом BODY.'}</li>
                  </ul>
                </div>

                {/* Allowed domains whitelist */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--border)] dark:border-[#29374C]">
                  <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Ruxsat berilgan domenlar (Allowed Origins)' : 'Разрешённые домены (Allowed Origins)'}
                  </label>
                  <textarea
                    rows={2}
                    value={origins}
                    onChange={(e) => setOrigins(e.target.value)}
                    placeholder="https://example.com&#10;https://mycompany.uz"
                    className="w-full rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#101B2E] p-3 text-xs font-mono text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-hidden focus:ring-2 focus:ring-[#DC2626]/30 transition-colors resize-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                    {locale === 'uz'
                      ? 'Vidjetni yuklashga ruxsat berilgan saytlar manzillarini (har bir qatorda bittadan) kiriting.'
                      : 'Укажите адреса сайтов (по одному на строку), с которых разрешено загружать виджет.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: ПРОВЕРКА */}
            {tab === 'check' && (
              <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 sm:p-6 space-y-5 shadow-xs">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {locale === 'uz' ? 'Vidjet o‘rnatilishini tekshirish' : 'Проверка установки виджета'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                    {locale === 'uz'
                      ? 'Server saytingizdagi vidjet skriptidan so‘rovlar kelishini tekshiradi.'
                      : 'Сервер проверяет поступление запросов от скрипта виджета с вашего сайта.'}
                  </p>
                </div>

                {/* Status Card */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    widget?.lastSeenAt
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-2.5 rounded-full shrink-0 ${
                        widget?.lastSeenAt ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-xs font-semibold">
                      {widget?.lastSeenAt
                        ? (locale === 'uz' ? 'Vidjet saytda muvaffaqiyatli faol' : 'Виджет успешно активен на сайте')
                        : (locale === 'uz' ? 'Saytdan so‘rov hali qayd etilmadi' : 'Запрос с сайта пока не зафиксирован')}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-[var(--text-secondary)] dark:text-[#AABAD0]">
                    {widget?.lastSeenAt
                      ? (locale === 'uz'
                          ? `So‘nggi aloqa: ${new Date(widget.lastSeenAt).toLocaleString('uz-UZ')} manbadan: ${widget.lastSeenOrigin || 'sayt'}`
                          : `Последний контакт: ${new Date(widget.lastSeenAt).toLocaleString('ru-RU')} с источника: ${widget.lastSeenOrigin || 'сайт'}`)
                      : (locale === 'uz'
                          ? 'Kodni saytga qo‘ygandan so‘ng, istalgan sahifani yangi ilovada oching. So‘ngra quyidagi «Ulanishni tekshirish» tugmasini bosing.'
                          : 'После вставки кода на сайт откройте любую его страницу в новой вкладке. Затем нажмите «Проверить подключение» ниже.')}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={checking}
                    isLoading={checking}
                    onClick={handleCheck}
                    className="bg-[#DC2626] hover:bg-[#b91c1c] text-white text-xs font-semibold"
                  >
                    <RefreshCw size={14} className="mr-1.5" />
                    <span>{locale === 'uz' ? 'Ulanishni tekshirish' : 'Проверить подключение'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={helping}
                    isLoading={helping}
                    onClick={handleRequestHelp}
                    className="text-xs font-medium"
                  >
                    <HelpCircle size={14} className="mr-1.5" />
                    <span>{locale === 'uz' ? 'O‘rnatishda yordam' : 'Помощь в установке'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Interactive Live Preview (5 cols)           */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3">
            {/* Preview Toolbar */}
            <div className="w-full flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0]">
                {locale === 'uz' ? 'Saytda oldindan ko‘rish' : 'Предпросмотр на сайте'}
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-semibold'
                      : 'text-[var(--text-muted)] dark:text-[#AABAD0]/70 hover:text-[var(--text-primary)]'
                  }`}
                  aria-label={locale === 'uz' ? 'Kompyuter' : 'Компьютер'}
                  title={locale === 'uz' ? 'Kompyuter' : 'Компьютер'}
                >
                  <Laptop size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-semibold'
                      : 'text-[var(--text-muted)] dark:text-[#AABAD0]/70 hover:text-[var(--text-primary)]'
                  }`}
                  aria-label={locale === 'uz' ? 'Telefon' : 'Телефон'}
                  title={locale === 'uz' ? 'Telefon' : 'Телефон'}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            {/* Mock Device Container */}
            <div
              className={`w-full rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] p-3 shadow-md transition-all ${
                previewDevice === 'mobile' ? 'max-w-xs' : 'max-w-md'
              }`}
            >
              {/* Mock Browser Header */}
              <div className="rounded-xl bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] p-2 flex items-center gap-2 mb-2">
                <div className="flex gap-1.5 shrink-0 pl-1">
                  <span className="size-2 rounded-full bg-red-400" />
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 rounded-md bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 px-2 py-0.5 truncate text-center font-mono">
                  vash-sayt.uz
                </div>
              </div>

              {/* Mock Page Content Backdrop */}
              <div className="relative rounded-xl bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] p-3 min-h-[360px] overflow-hidden flex flex-col justify-between">
                {/* Dummy page skeleton */}
                <div className="space-y-2 opacity-30 select-none pointer-events-none">
                  <div className="h-4 w-1/3 rounded bg-slate-300 dark:bg-slate-700" />
                  <div className="h-2.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Live Mock Chat Window (Expanded) */}
                <div
                  className={`w-full rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] shadow-lg overflow-hidden flex flex-col ${
                    form.position === 'left' ? 'self-start' : 'self-end'
                  }`}
                >
                  {/* Chat Header styled with chosen color */}
                  <div
                    className="p-3 flex items-center justify-between text-white transition-colors"
                    style={{ backgroundColor: form.color }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Globe size={14} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate leading-none">
                          {form.title || (locale === 'uz' ? 'Savolingiz bo‘yicha yordam beramiz' : 'Поможем с вашим вопросом')}
                        </p>
                        <p className="text-[10px] text-white/80 mt-0.5 leading-none">
                          {locale === 'uz' ? 'AI-maslahatchi' : 'ИИ-консультант'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="p-3 space-y-2.5 text-xs bg-[var(--surface)] dark:bg-[#142137]">
                    {/* Bot greeting */}
                    <div className="flex items-start gap-1.5 max-w-[90%]">
                      <div
                        className="size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-[9px]"
                        style={{ backgroundColor: form.color }}
                      >
                        AI
                      </div>
                      <div className="rounded-xl rounded-tl-xs p-2 bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] text-[11px] leading-relaxed">
                        {form.greeting || (locale === 'uz' ? 'Assalomu alaykum! Sizga qanday yordam bera olaman?' : 'Здравствуйте! Чем могу помочь?')}
                      </div>
                    </div>

                    {/* Sample user inquiry */}
                    <div className="flex justify-end">
                      <div
                        className="rounded-xl rounded-tr-xs p-2 text-white text-[11px] max-w-[85%] font-medium leading-relaxed"
                        style={{ backgroundColor: form.color }}
                      >
                        {locale === 'uz' ? 'O‘rnatish qancha turadi?' : 'Сколько стоит внедрение?'}
                      </div>
                    </div>

                    {/* Sample bot reply */}
                    <div className="flex items-start gap-1.5 max-w-[90%]">
                      <div
                        className="size-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-[9px]"
                        style={{ backgroundColor: form.color }}
                      >
                        AI
                      </div>
                      <div className="rounded-xl rounded-tl-xs p-2 bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] text-[11px] leading-relaxed">
                        {locale === 'uz' ? 'Narx sizning vazifalaringizga bog‘liq. Qaysi kanal sizni qiziqtirmoqda?' : 'Стоимость зависит от ваших задач. Подскажите, какой канал вас интересует?'}
                      </div>
                    </div>
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-2 border-t border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137]">
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                      <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 pl-2 flex-1 truncate">
                        {locale === 'uz' ? 'Xabar yozing…' : 'Напишите сообщение…'}
                      </span>
                      <div
                        className="size-6 rounded-md text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: form.color }}
                      >
                        <Send size={11} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Launcher Button */}
                <div
                  className={`pt-2 flex ${
                    form.position === 'left' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className="size-10 rounded-full shadow-md flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: form.color }}
                  >
                    <Globe size={18} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 text-center">
              {locale === 'uz'
                ? 'Interaktiv vidjet foydalanuvchi mavzusi va qurilmasiga moslashadi.'
                : 'Интерактивный виджет адаптируется под тему и устройство пользователя.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Backwards-compatible modal wrapper
 */
export function WebsiteWidgetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useApp();
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      label={locale === 'uz' ? 'Saytdagi chat vidjeti sozlamalari' : 'Настройки виджета чата на сайте'}
      className="w-[calc(100vw-32px)] lg:w-[1020px] max-w-[1020px] p-6 rounded-2xl overflow-y-auto max-h-[90dvh] border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label={locale === 'uz' ? 'Yopish' : 'Закрыть'}
          className="absolute -top-2 -right-2 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>
        <WebsiteWidgetSettingsView onBack={onClose} />
      </div>
    </Dialog>
  );
}
