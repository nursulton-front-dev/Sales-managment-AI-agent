'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Calendar,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight,
  ChevronRight,
  Building2,
  Bot,
} from 'lucide-react';

export default function IntegrationsPage() {
  const { isGoogleCalendarConnected, connectGoogleCalendar, disconnectGoogleCalendar, showToast } = useApp();

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusData, setStatusData] = useState<{
    configured: boolean;
    connected: boolean;
    email: string | null;
    workingHours?: string;
    slotDuration?: number;
    clientIdConfigured?: boolean;
  } | null>(null);

  // Schedule setup form state
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [timezone, setTimezone] = useState('Asia/Tashkent');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState('45');
  const [workingDays, setWorkingDays] = useState<string[]>(['Пн', 'Вт', 'Ср', 'Чт', 'Пт']);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Test event state
  const [isCreatingTestEvent, setIsCreatingTestEvent] = useState(false);
  const [testResult, setTestResult] = useState<{
    htmlLink?: string;
    message: string;
    appointmentId?: string;
  } | null>(null);

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const loadStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/calendar/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        if (data.connected && !isGoogleCalendarConnected) {
          connectGoogleCalendar();
        }
        if (data.workingHours) {
          const parts = data.workingHours.split('-');
          if (parts.length === 2) {
            setStartTime(parts[0]);
            setEndTime(parts[1]);
          }
        }
        if (data.slotDuration) {
          setSlotDuration(String(data.slotDuration));
        }
      }
    } catch (err) {
      console.error('Failed to load calendar status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isConnected = isGoogleCalendarConnected || Boolean(statusData?.connected);
  const isConfigured = Boolean(statusData?.configured);

  const handleOAuthConnect = () => {
    setIsConnecting(true);
    window.location.href = '/api/calendar/auth';
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const workingHoursStr = `${startTime}-${endTime}`;
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleCalendarWorkingHours: workingHoursStr,
          googleCalendarSlotDuration: slotDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Расписание сохранено', `Рабочие часы: ${workingHoursStr}, слот ${slotDuration} мин.`, 'success');
      } else {
        showToast('Ошибка сохранения', data.error || 'Сбой обновления настроек', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleTestEventCreation = async () => {
    setIsCreatingTestEvent(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/calendar/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: 'Консультация клиента — Chorla AI',
          clientName: 'Алишер Умаров',
          clientPhone: '+998 90 123 45 67',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          htmlLink: data.htmlLink || data.directLink,
          message: data.message,
          appointmentId: data.appointmentId,
        });
        showToast('Запись создана', data.message, 'success');
      } else {
        showToast('Ошибка создания', data.error || 'Сбой Google Calendar API', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setIsCreatingTestEvent(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Вы уверены, что хотите отключить Google Календарь?')) return;
    try {
      await fetch('/api/calendar/disconnect', { method: 'POST' });
      disconnectGoogleCalendar();
      setStatusData((prev) => (prev ? { ...prev, connected: false, email: null } : null));
      setTestResult(null);
      showToast('Календарь отключен', 'Доступ отозван', 'info');
    } catch {
      disconnectGoogleCalendar();
    }
  };

  return (
    <div className="space-y-8 text-left max-w-6xl">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Интеграции
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Подключите каналы общения и расписание для автоматической записи клиентов
        </p>
      </div>

      {/* Main 2-column Grid matching the visual mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Google Calendar Card (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs">
            {/* Header with official Google Calendar icon */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 relative shrink-0">
                  <Image
                    src="/images/brands/google-calendar.png"
                    alt="Google Calendar"
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Google Календарь
                  </h2>
                  <div className="mt-1">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Подключён {statusData?.email ? `(${statusData.email})` : ''}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-xs font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                        Не подключён
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-4 leading-relaxed">
              Агент проверит свободное время и запишет клиента в ваш календарь.
            </p>

            <div className="my-5 border-t border-[var(--border)]" />

            {/* Steps Guide matching Mockup 2 */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                  Выберите Google-аккаунт
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                  Укажите календарь для записей
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                  Настройте рабочие часы
                </span>
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-3">
              {!isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={handleOAuthConnect}
                    disabled={isConnecting}
                    className="w-full h-12 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Переход к согласию Google...</span>
                      </>
                    ) : (
                      <span>Подключить Google Календарь</span>
                    )}
                  </button>
                  <p className="text-[11px] text-[var(--text-muted)] text-center">
                    Вы сами выбираете календарь и можете отключить доступ.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleTestEventCreation}
                      disabled={isCreatingTestEvent}
                      className="flex-1 h-11 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      {isCreatingTestEvent ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Создание записи...</span>
                        </>
                      ) : (
                        <span>Создать проверочную запись</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="h-11 px-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[#DC2626] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Отключить</span>
                    </button>
                  </div>

                  {testResult && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[6px] text-xs space-y-1">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.htmlLink && (
                        <a
                          href={testResult.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                        >
                          <span>Открыть в Google Calendar</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Подключение также доступно при настройке ИИ-сотрудника.
          </p>

          {/* Telegram Channel Card */}
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[6px] bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0 font-bold text-sm">
                TG
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Telegram Bot
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Подключение бота выполняется в карточке каждого ИИ-сотрудника.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/agents"
              className="h-9 px-3 rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Сотрудники</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Schedule & Calendar Setup Form (5 cols) matching Mockup 2 */}
        <div className="lg:col-span-5">
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-5">
            {/* Top link & Icon */}
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mb-3">
                <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Календарь</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Куда записывать клиентов?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Выберите календарь и расписание
              </p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 pt-1">
              {/* Field 1: Calendar selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Календарь для записей
                </label>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                >
                  <option value="primary">Записи клиентов (Основной календарь Google)</option>
                  <option value="consultations">Консультации и приёмы</option>
                  <option value="leads">Лиды с сайта и Telegram</option>
                </select>
              </div>

              {/* Field 2: Timezone selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Часовой пояс
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                >
                  <option value="Asia/Tashkent">Ташкент · UTC+5</option>
                  <option value="Asia/Samarkand">Самарканд · UTC+5</option>
                  <option value="Asia/Almaty">Алматы · UTC+5</option>
                  <option value="Europe/Moscow">Москва · UTC+3</option>
                  <option value="Asia/Dubai">Дубай · UTC+4</option>
                </select>
              </div>

              {/* Field 3: Working Days with Red pills */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Рабочие дни
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {daysOfWeek.map((day) => {
                    const isActive = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-9 h-9 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#DC2626] text-white shadow-2xs'
                            : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: Working Hours */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Рабочее время
                </label>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                  >
                    <option value="08:00">08:00</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                  </select>

                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                  >
                    <option value="17:00">17:00</option>
                    <option value="18:00">18:00</option>
                    <option value="19:00">19:00</option>
                    <option value="20:00">20:00</option>
                    <option value="21:00">21:00</option>
                  </select>
                </div>
              </div>

              {/* Field 5: Slot Duration */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Длительность приёма
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['30', '45', '60'].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSlotDuration(mins)}
                      className={`h-9 rounded-[6px] text-xs font-semibold transition-all cursor-pointer border ${
                        slotDuration === mins
                          ? 'bg-[#DC2626] text-white border-[#DC2626]'
                          : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {mins} мин
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="w-full h-11 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSavingSchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <span>Сохранить расписание</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
