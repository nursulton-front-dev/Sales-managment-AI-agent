'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
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
  Bot,
  Power,
  ShieldCheck,
  AlertTriangle,
  Headphones,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  const { agents, isGoogleCalendarConnected, connectGoogleCalendar, disconnectGoogleCalendar, showToast } = useApp();
  const searchParams = useSearchParams();

  // Active filter tab: 'all' | 'messengers' | 'calendars'
  const [activeTab, setActiveTab] = useState<'all' | 'messengers' | 'calendars'>('all');

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

  // Telegram modal state
  const [isTgModalOpen, setIsTgModalOpen] = useState(false);
  const [tgTokenInput, setTgTokenInput] = useState('');
  const [isSavingTg, setIsSavingTg] = useState(false);

  // Calendar settings modal / drawer
  const [isCalSettingsOpen, setIsCalSettingsOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
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

  const isCalendarConnected = isGoogleCalendarConnected || Boolean(statusData?.connected);

  // Active Telegram bot attached to first agent
  const activeTgAgent = agents.find((a) => Boolean(a.telegramToken));
  const isTgConnected = Boolean(activeTgAgent);

  const handleConnectCalendar = () => {
    setIsConnecting(true);
    window.location.href = '/api/calendar/auth';
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
        setIsCalSettingsOpen(false);
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

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgTokenInput.trim()) return;
    setIsSavingTg(true);
    try {
      const targetAgent = agents[0];
      if (!targetAgent) {
        showToast('Сначала создайте сотрудника', 'Для привязки бота нужен хотя бы один ИИ-сотрудник', 'error');
        return;
      }
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: targetAgent.id,
          tgBotToken: tgTokenInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Telegram подключен', 'Бот успешно привязан к сотруднику', 'success');
        setIsTgModalOpen(false);
        setTgTokenInput('');
        window.location.reload();
      } else {
        showToast('Ошибка сохранения', data.error || 'Не удалось сохранить токен', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsSavingTg(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Top Header */}
      <div className="pb-3 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Интеграции
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Подключите каналы, в которых вам пишут клиенты.
        </p>
      </div>

      {/* Tabs: Все, Мессенджеры, Календари */}
      <div className="flex items-center gap-6 border-b border-[var(--border)] text-xs sm:text-sm font-semibold -mt-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'all'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Все
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('messengers')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'messengers'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Мессенджеры
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendars')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'calendars'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Календари
        </button>
      </div>

      {/* SECTION 1: Каналы общения (Telegram, Instagram, WhatsApp) */}
      {(activeTab === 'all' || activeTab === 'messengers') && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Каналы общения
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Telegram Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs flex flex-col justify-between hover:border-[var(--border-strong)] transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-full relative shrink-0 flex items-center justify-center">
                    <Image
                      src="/integrations/telegram.svg"
                      alt="Telegram"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Telegram</h3>
                    <div className="mt-1">
                      {isTgConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Подключён
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                          Не подключён
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
                  Принимайте сообщения клиентов через вашего бота.
                </p>
              </div>

              <div className="pt-5">
                {isTgConnected ? (
                  <button
                    type="button"
                    onClick={() => setIsTgModalOpen(true)}
                    className="w-full inline-flex items-center justify-center text-xs font-semibold px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-[6px] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    Настроить бота
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTgModalOpen(true)}
                    className="w-full inline-flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
                  >
                    Подключить Telegram
                  </button>
                )}
              </div>
            </div>

            {/* 2. Instagram Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs flex flex-col justify-between hover:border-[var(--border-strong)] transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-full relative shrink-0 flex items-center justify-center">
                    <Image
                      src="/integrations/instagram.svg"
                      alt="Instagram"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">Instagram</h3>
                    <div className="mt-1">
                      {isLoadingIg ? (
                        <span className="text-[11px] text-[var(--text-muted)]">Загрузка...</span>
                      ) : igData?.status === 'connected' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          @{igData.username || 'connected'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                          Не подключён
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
                  Отвечайте клиентам в Direct и передавайте диалоги команде.
                </p>
              </div>

              <div className="pt-5">
                {igData?.status === 'connected' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectInstagram}
                    disabled={isDisconnectingIg}
                    className="w-full inline-flex items-center justify-center text-xs font-semibold px-4 py-2 border border-[var(--border)] text-red-600 rounded-[6px] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    {isDisconnectingIg ? 'Отключение...' : 'Отключить Instagram'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    disabled={isConnectingIg}
                    className="w-full inline-flex items-center justify-center text-xs font-semibold px-4 py-2.5 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                  >
                    {isConnectingIg ? 'Переход к Meta...' : 'Подключить Instagram'}
                  </button>
                )}
              </div>
            </div>

            {/* 3. WhatsApp Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs flex flex-col justify-between hover:border-[var(--border-strong)] transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-full relative shrink-0 flex items-center justify-center">
                    <Image
                      src="/integrations/whatsapp.svg"
                      alt="WhatsApp"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">WhatsApp</h3>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                        Скоро доступно
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
                  Обрабатывайте обращения в WhatsApp Business.
                </p>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => showToast('WhatsApp Business API', 'Интеграция находится в стадии закрытого тестирования Meta Cloud API', 'info')}
                  className="w-full inline-flex items-center justify-center text-xs font-semibold px-4 py-2.5 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                >
                  Подключить WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Календари и запись (Google Календарь) */}
      {(activeTab === 'all' || activeTab === 'calendars') && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Календари и запись
          </h2>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 relative shrink-0 flex items-center justify-center">
                <Image
                  src="/integrations/google-calendar.png"
                  alt="Google Calendar"
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    Google Календарь
                  </h3>
                  {isCalendarConnected ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Подключён {statusData?.email ? `(${statusData.email})` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
                      Не подключён
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Проверяйте свободное время и записывайте клиентов.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isCalendarConnected ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCalSettingsOpen(!isCalSettingsOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-[6px] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Расписание</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTestEvent}
                    disabled={isCreatingTestEvent}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                  >
                    <span>Тест записи</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectCalendar}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center text-xs font-semibold px-5 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                >
                  {isConnecting ? 'Подключение...' : 'Подключить'}
                </button>
              )}
            </div>
          </div>

          {/* Inline Calendar Schedule Config if open */}
          {isCalendarConnected && isCalSettingsOpen && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">Настройка расписания и слотов</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">Единое место настройки рабочих часов для всех ИИ-сотрудников</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalSettingsOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Рабочие часы
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-xs p-2 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)]"
                      >
                        <option value="08:00">08:00</option>
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                      </select>
                      <span>—</span>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full text-xs p-2 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)]"
                      >
                        <option value="18:00">18:00</option>
                        <option value="19:00">19:00</option>
                        <option value="20:00">20:00</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      Длительность приёма
                    </label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(e.target.value)}
                      className="w-full text-xs p-2 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)]"
                    >
                      <option value="30">30 минут</option>
                      <option value="45">45 минут</option>
                      <option value="60">60 минут</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={isSavingSchedule}
                      className="w-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-semibold py-2 rounded-[6px] hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {isSavingSchedule ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectCalendar}
                      className="px-3 py-2 text-xs font-medium text-red-600 border border-red-200 dark:border-red-900/50 rounded-[6px] hover:bg-red-50"
                    >
                      Отключить
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Helper Footer Banner according to 05-integrations.png */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
              Нужна помощь с подключением?
            </div>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline mt-0.5"
            >
              <span>Открыть инструкцию</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        <div className="text-xs text-[var(--text-secondary)] sm:border-l sm:border-[var(--border)] sm:pl-6">
          После подключения выберите ИИ-сотрудника для канала.
        </div>
      </div>

      {/* Telegram Token Modal */}
      {isTgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Подключение Telegram-бота
              </h3>
              <button
                type="button"
                onClick={() => setIsTgModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Создайте бота в <strong>@BotFather</strong> в Telegram, скопируйте API Token и вставьте его ниже. Бот сразу свяжется с выбранным сотрудником.
            </p>

            <form onSubmit={handleSaveTelegram} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  HTTP API Token
                </label>
                <input
                  type="text"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={tgTokenInput}
                  onChange={(e) => setTgTokenInput(e.target.value)}
                  className="w-full p-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTgModalOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSavingTg}
                  disabled={!tgTokenInput.trim()}
                >
                  Сохранить токен
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
