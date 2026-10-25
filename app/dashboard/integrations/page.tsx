'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  MessageCircle,
  Power,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface InstagramStatusResponse {
  success: boolean;
  configured: boolean;
  connected: boolean;
  status: 'disconnected' | 'connected' | 'needs_reconnect' | 'error';
  username?: string | null;
  userId?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  agentId?: string | null;
  autoReply?: boolean;
  lastError?: string | null;
  agents: Array<{ id: string; name: string; isActive: boolean }>;
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Загрузка интеграций...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const { isGoogleCalendarConnected, connectGoogleCalendar, disconnectGoogleCalendar, showToast } = useApp();
  const searchParams = useSearchParams();

  // Calendar state
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

  // Instagram state
  const [isLoadingIg, setIsLoadingIg] = useState(true);
  const [isConnectingIg, setIsConnectingIg] = useState(false);
  const [isDisconnectingIg, setIsDisconnectingIg] = useState(false);
  const [isUpdatingIgSettings, setIsUpdatingIgSettings] = useState(false);
  const [igData, setIgData] = useState<InstagramStatusResponse | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(false);

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

  const loadCalendarStatus = async () => {
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

  const loadInstagramStatus = async () => {
    try {
      setIsLoadingIg(true);
      const res = await fetch('/api/instagram/status');
      const data: InstagramStatusResponse = await res.json();
      if (data.success) {
        setIgData(data);
        setSelectedAgentId(data.agentId || (data.agents[0]?.id ?? ''));
        setAutoReplyEnabled(Boolean(data.autoReply));
      }
    } catch (err) {
      console.error('Failed to load Instagram status:', err);
    } finally {
      setIsLoadingIg(false);
    }
  };

  useEffect(() => {
    loadCalendarStatus();
    loadInstagramStatus();

    // Check query params for notifications
    const igConnected = searchParams.get('instagram_connected');
    const igUsername = searchParams.get('username');
    const igError = searchParams.get('instagram_error');

    if (igConnected) {
      showToast('Instagram подключен', `Успешно подключен аккаунт @${igUsername || ''}`, 'success');
    }
    if (igError) {
      showToast('Ошибка Instagram', decodeURIComponent(igError), 'error');
    }
  }, []);

  const isConnected = isGoogleCalendarConnected || Boolean(statusData?.connected);
  const isConfigured = Boolean(statusData?.configured);

  const handleConnectCalendar = () => {
    setIsConnecting(true);
    window.location.href = '/api/calendar/auth';
  };

  const handleConnectInstagram = () => {
    setIsConnectingIg(true);
    window.location.href = '/api/instagram/auth';
  };

  const handleDisconnectInstagram = async () => {
    if (!confirm('Вы уверены, что хотите отключить Instagram? Все токены будут удалены, а автоответы остановлены.')) {
      return;
    }

    try {
      setIsDisconnectingIg(true);
      const res = await fetch('/api/instagram/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Instagram отключен', data.message, 'info');
        await loadInstagramStatus();
      } else {
        showToast('Ошибка', data.error || 'Не удалось отключить', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsDisconnectingIg(false);
    }
  };

  const handleUpdateInstagramSettings = async (newAgentId?: string, newAutoReply?: boolean) => {
    const targetAgentId = newAgentId !== undefined ? newAgentId : selectedAgentId;
    const targetAutoReply = newAutoReply !== undefined ? newAutoReply : autoReplyEnabled;

    try {
      setIsUpdatingIgSettings(true);
      const res = await fetch('/api/instagram/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgentId,
          autoReply: targetAutoReply,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAgentId(data.instagramAgentId || '');
        setAutoReplyEnabled(Boolean(data.instagramAutoReply));
        showToast('Настройки обновлены', 'Параметры работы агента сохранены', 'success');
        await loadInstagramStatus();
      } else {
        showToast('Ошибка обновления', data.error || 'Не удалось обновить настройки', 'error');
        // Revert UI state if rejected
        if (igData) {
          setSelectedAgentId(igData.agentId || '');
          setAutoReplyEnabled(Boolean(igData.autoReply));
        }
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsUpdatingIgSettings(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSchedule(true);
      const workingHours = `${startTime}-${endTime}`;
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleCalendarWorkingHours: workingHours,
          googleCalendarSlotDuration: parseInt(slotDuration, 10),
          googleCalendarId: selectedCalendar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Настройки сохранены', `Расписание: ${workingHours}, длительность: ${slotDuration} мин`, 'success');
      } else {
        showToast('Ошибка', data.error || 'Не удалось сохранить настройки', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сохранения', err.message, 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleCreateTestEvent = async () => {
    try {
      setIsCreatingTestEvent(true);
      setTestResult(null);
      const res = await fetch('/api/calendar/test-event', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          htmlLink: data.event?.htmlLink,
          message: data.message || 'Тестовая встреча создана',
          appointmentId: data.appointmentId,
        });
        showToast('Встреча создана!', 'Проверьте ваш Google Календарь на завтра 14:00', 'success');
      } else {
        showToast('Не удалось создать событие', data.error || 'Ошибка API', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsCreatingTestEvent(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Вы уверены, что хотите отключить Google Календарь?')) return;
    try {
      await fetch('/api/calendar/disconnect', { method: 'POST' });
      disconnectGoogleCalendar();
      setStatusData((prev) => (prev ? { ...prev, connected: false, email: null } : null));
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
          Подключите каналы общения Instagram, Telegram и календарь для автономной работы ИИ-агентов
        </p>
      </div>

      {/* 1. INSTAGRAM DIRECT INTEGRATION CARD */}
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 relative shrink-0 p-1.5 rounded-[12px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center">
              <Image
                src="/images/brands/instagram.svg"
                alt="Instagram"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Instagram Direct
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                  Official API v21.0
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {isLoadingIg ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Проверка статуса...
                  </span>
                ) : igData?.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Подключён: @{igData.username || igData.userId}</span>
                  </span>
                ) : igData?.status === 'needs_reconnect' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Нужно переподключить</span>
                  </span>
                ) : igData?.status === 'error' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-3 h-3" />
                    <span>Ошибка подключения</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-xs font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                    Не подключён
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {igData?.status === 'connected' ? (
              <button
                type="button"
                onClick={handleDisconnectInstagram}
                disabled={isDisconnectingIg}
                className="w-full sm:w-auto h-10 px-4 rounded-[6px] border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDisconnectingIg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Отключить интеграцию</span>
              </button>
            ) : igData?.status === 'needs_reconnect' ? (
              <button
                type="button"
                onClick={handleConnectInstagram}
                disabled={isConnectingIg}
                className="w-full sm:w-auto h-10 px-5 rounded-[6px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isConnectingIg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Переподключить аккаунт</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectInstagram}
                disabled={isConnectingIg}
                className="w-full sm:w-auto h-10 px-5 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isConnectingIg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span>Подключить Instagram</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-4 leading-relaxed">
          Официальное подключение через Meta Instagram Login (API v21.0). ИИ-сотрудник обрабатывает входящие Direct-сообщения, ведёт диалог в рамках 24-часового окна, квалифицирует клиентов и передаёт диалог оператору при включении ручного перехвата.
        </p>

        {igData?.lastError && (
          <div className="mt-3 p-3 rounded-[6px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400">
            <strong>Причина ошибки:</strong> {igData.lastError}
          </div>
        )}

        {/* Connected state controls: Agent picker and AutoReply toggle */}
        {igData?.status === 'connected' && (
          <div className="mt-6 pt-5 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Agent Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Ответственный ИИ-агент
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  setSelectedAgentId(e.target.value);
                  handleUpdateInstagramSettings(e.target.value, undefined);
                }}
                disabled={isUpdatingIgSettings}
                className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
              >
                <option value="">-- Выберите агента --</option>
                {igData.agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} {ag.isActive ? '(Активен)' : '(Неактивен)'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Этот агент будет отвечать клиентам с использованием базы знаний компании
              </p>
            </div>

            {/* Auto-reply toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Автоматические ответы
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)]">
                <span className="text-xs text-[var(--text-primary)] font-medium">
                  {autoReplyEnabled ? 'Автоответы включены' : 'Автоответы выключены'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !autoReplyEnabled;
                    setAutoReplyEnabled(nextVal);
                    handleUpdateInstagramSettings(undefined, nextVal);
                  }}
                  disabled={isUpdatingIgSettings || !selectedAgentId}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoReplyEnabled ? 'bg-[#DC2626]' : 'bg-gray-300 dark:bg-gray-700'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                При ручном перехвате оператором в разделе «Диалоги» автоответы блокируются на сервере
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. GOOGLE CALENDAR & SCHEDULE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Google Calendar Card (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs">
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
                  Настройте рабочие часы и дни недели
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={handleCreateTestEvent}
                    disabled={isCreatingTestEvent}
                    className="flex-1 h-11 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isCreatingTestEvent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Создание записи...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Проверить запись (тест)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectCalendar}
                    className="h-11 px-4 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-red-600 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Отключить</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectCalendar}
                  disabled={isConnecting}
                  className="w-full h-11 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Подключение...</span>
                    </>
                  ) : (
                    <span>Подключить Google Календарь</span>
                  )}
                </button>
              )}
            </div>

            {testResult && (
              <div className="mt-4 p-3.5 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Встреча добавлена на завтра в 14:00.</p>
                  </div>
                </div>
                {testResult.htmlLink && (
                  <a
                    href={testResult.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline hover:no-underline shrink-0 text-emerald-700 dark:text-emerald-300"
                  >
                    <span>Открыть</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Schedule Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-xs">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Настройка расписания
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Укажите время, в которое ИИ имеет право предлагать слоты клиентам
            </p>

            <form onSubmit={handleSaveSchedule} className="mt-5 space-y-4">
              {/* Field 1: Calendar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Календарь
                </label>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                >
                  <option value="primary">Основной календарь ({statusData?.email || 'Google'})</option>
                  <option value="business">Рабочий / Записи клиентов</option>
                </select>
              </div>

              {/* Field 2: Working Days */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Рабочие дни
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map((day) => {
                    const isSelected = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`h-9 rounded-[6px] text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#DC2626] text-white border-[#DC2626]'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 3: Working Hours */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Рабочие часы
                </label>
                <div className="grid grid-cols-2 gap-2">
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

              {/* Field 4: Slot Duration */}
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
