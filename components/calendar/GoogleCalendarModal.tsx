'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, X, ExternalLink, Loader2 } from 'lucide-react';

export function GoogleCalendarModal() {
  const {
    isCalendarModalOpen,
    closeCalendarModal,
    isGoogleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    showToast,
  } = useApp();

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusData, setStatusData] = useState<{
    configured: boolean;
    connected: boolean;
    email: string | null;
    workingHours?: string;
    slotDuration?: number;
  } | null>(null);

  const [isCreatingTestEvent, setIsCreatingTestEvent] = useState(false);
  const [testResult, setTestResult] = useState<{ htmlLink?: string; message: string } | null>(null);

  // Load status when modal opens
  useEffect(() => {
    if (isCalendarModalOpen) {
      setIsLoadingStatus(true);
      fetch('/api/calendar/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatusData(data);
            if (data.connected && !isGoogleCalendarConnected) {
              connectGoogleCalendar();
            }
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingStatus(false));
    }
  }, [isCalendarModalOpen]);

  if (!isCalendarModalOpen) return null;

  const isConnected = isGoogleCalendarConnected || Boolean(statusData?.connected);
  const isConfigured = Boolean(statusData?.configured);

  const handleOAuthConnect = () => {
    setIsConnecting(true);
    window.location.href = '/api/calendar/auth';
  };

  const handleTestEventCreation = async () => {
    setIsCreatingTestEvent(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/calendar/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: 'Тестовая запись — Chorla AI',
          clientName: 'Тестовый Клиент',
          clientPhone: '+998 90 123 45 67',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          htmlLink: data.htmlLink || data.directLink,
          message: data.message,
        });
        showToast('Слот забронирован', data.message, 'success');
      } else {
        showToast('Ошибка бронирования', data.error || 'Сбой Google API', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setIsCreatingTestEvent(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/calendar/disconnect', { method: 'POST' });
      disconnectGoogleCalendar();
      setStatusData((prev) => (prev ? { ...prev, connected: false, email: null } : null));
      showToast('Календарь отключен', undefined, 'info');
    } catch {
      disconnectGoogleCalendar();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-[460px] bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-xl overflow-hidden flex flex-col text-[var(--text-primary)]">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <Image
                src="/images/brands/google-calendar.png"
                alt="Google Calendar"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
                {isConnected ? 'Google Календарь' : 'Подключить Google Календарь'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Проверка свободных слотов и автоматическая запись клиентов
              </p>
            </div>
          </div>

          <button
            onClick={closeCalendarModal}
            aria-label="Закрыть окно"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 sm:px-6 py-3 space-y-4 text-xs text-[var(--text-secondary)]">
          {isLoadingStatus ? (
            <div className="py-8 flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span>Проверка состояния подключения...</span>
            </div>
          ) : isConnected ? (
            /* State: Connected */
            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-[6px] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--success-text)] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
                    <span>Календарь активен</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--success-text)] bg-[var(--surface)] px-2 py-0.5 rounded-[4px] border border-[var(--success-border)]">
                    10:00–18:00
                  </span>
                </div>
                <div className="text-[var(--text-primary)] text-[11px] pl-6">
                  Аккаунт: <strong className="font-mono">{statusData?.email || 'Основной Google аккаунт'}</strong>
                </div>
                <div className="text-[var(--text-secondary)] text-[11px] pl-6">
                  Длительность слота: 45 минут · Интервал: Пн–Сб
                </div>
              </div>

              {testResult && (
                <div className="p-3 bg-[var(--accent-soft)] border border-[var(--border)] rounded-[6px] text-xs space-y-1.5">
                  <div className="text-[var(--text-primary)] font-medium">{testResult.message}</div>
                  {testResult.htmlLink && (
                    <a
                      href={testResult.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-medium text-[11px]"
                    >
                      <span>Открыть в Google Календаре</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : !isConfigured ? (
            /* State: Not configured on server */
            <div className="p-3.5 bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-[6px] flex items-start gap-3 text-[var(--warning-text)]">
              <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-[var(--text-primary)]">
                  Подключение временно недоступно
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Интеграция с Google Календарем настраивается администратором платформы. Обратитесь в службу поддержки для активации онлайн-записи.
                </p>
              </div>
            </div>
          ) : (
            /* State: Configured and Ready to Connect */
            <div className="space-y-3">
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                После авторизации ИИ-сотрудник получит доступ к просмотру свободных слотов в интервале с 10:00 до 18:00 и будет вносить записи подтвержденных клиентов.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[var(--surface-secondary)] border-t border-[var(--border)] flex items-center justify-end gap-2.5">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-10 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[6px] transition-colors cursor-pointer"
              >
                Отключить
              </button>
              <button
                type="button"
                onClick={handleTestEventCreation}
                disabled={isCreatingTestEvent}
                className="h-10 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCreatingTestEvent ? 'Создание слота...' : 'Тестовая бронь'}
              </button>
              <button
                type="button"
                onClick={closeCalendarModal}
                className="h-10 px-4 py-2 text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[6px] transition-colors cursor-pointer shadow-2xs"
              >
                Готово
              </button>
            </>
          ) : !isConfigured ? (
            <button
              type="button"
              onClick={closeCalendarModal}
              className="h-10 px-4 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={closeCalendarModal}
                className="h-10 px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[6px] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleOAuthConnect}
                disabled={isConnecting}
                className="h-10 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[6px] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Переход в Google...</span>
                  </>
                ) : (
                  <>
                    <Image
                      src="/images/brands/google-g.png"
                      alt="Google"
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                    <span>Подключить Google Календарь</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
