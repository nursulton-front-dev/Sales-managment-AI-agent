'use client';

import React, { useState, useEffect } from 'react';
import { SparrowMascot } from './SparrowMascot';
import { Button } from './Button';
import { useApp } from '@/context/AppContext';
import { AlertCircle, RefreshCw, WifiOff, ShieldAlert, ServerCrash } from 'lucide-react';

export interface DataStateProps {
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  message?: string;
  lang?: 'ru' | 'uz';
  compact?: boolean;
  className?: string;
}

export function DataState({
  loading,
  error,
  retry,
  message,
  lang,
  compact = false,
  className = '',
}: DataStateProps) {
  let contextLocale: 'ru' | 'uz' = 'ru';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const app = useApp();
    if (app?.locale) contextLocale = app.locale;
  } catch {
    // outside provider
  }
  const activeLang = lang || contextLocale;

  // Delay display of loading state slightly (220ms) to avoid flashing on near-instant queries
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, 220);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!loading && !error) return null;

  // 1. Loading State
  if (loading) {
    if (!showLoading) {
      // Reserved empty space to prevent layout jump while waiting for fast response
      return <div className={`min-h-[160px] ${className}`} aria-hidden="true" />;
    }

    if (compact) {
      return (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2.5 py-4 px-3 text-xs text-[var(--text-secondary)] ${className}`}
        >
          <SparrowMascot variant="loading" size={28} />
          <span>{message || (activeLang === 'uz' ? 'Yuklanmoqda…' : 'Загружаем…')}</span>
        </div>
      );
    }

    return (
      <div
        role="status"
        aria-live="polite"
        className={`w-full min-h-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center justify-center text-center space-y-3.5 transition-opacity duration-200 animate-in fade-in ${className}`}
      >
        <div className="w-20 h-20 flex items-center justify-center">
          <SparrowMascot variant="loading" size={80} priority />
        </div>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)]">
            {message || (activeLang === 'uz' ? 'Kabinet yuklanmoqda…' : 'Загружаем кабинет…')}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {activeLang === 'uz' ? 'Iltimos, kuting' : 'Синхронизируем актуальные данные'}
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State (Categorized: Network, Auth, Server, General)
  if (error) {
    const errText = error.toLowerCase();
    const isOffline =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      errText.includes('failed to fetch') ||
      errText.includes('fetch failed') ||
      errText.includes('сеть') ||
      errText.includes('интернет') ||
      errText.includes('network');

    const isAccess =
      errText.includes('401') ||
      errText.includes('403') ||
      errText.includes('доступ') ||
      errText.includes('авториз') ||
      errText.includes('ruxsat');

    const isServer =
      errText.includes('500') ||
      errText.includes('502') ||
      errText.includes('503') ||
      errText.includes('сервер') ||
      errText.includes('server');

    let title = activeLang === 'uz' ? 'Ma\'lumotlarni yuklab bo\'lmadi' : 'Не удалось загрузить данные';
    let Icon = AlertCircle;
    let iconColor = 'text-amber-500';

    if (isOffline) {
      title = activeLang === 'uz' ? 'Internet aloqasi yo\'q' : 'Нет подключения к интернету';
      Icon = WifiOff;
      iconColor = 'text-red-500';
    } else if (isAccess) {
      title = activeLang === 'uz' ? 'Bo\'limga kirish huquqi yo\'q' : 'Нет доступа к разделу';
      Icon = ShieldAlert;
      iconColor = 'text-amber-500';
    } else if (isServer) {
      title = activeLang === 'uz' ? 'Serverda xatolik yuz berdi' : 'Ошибка на стороне сервера';
      Icon = ServerCrash;
      iconColor = 'text-red-500';
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left shadow-xs ${className}`}
      >
        {/* Calm sparrow in idle pose (not joyful, not blocking text) */}
        <div className="shrink-0 p-1">
          <SparrowMascot variant="idle" size={48} animate={false} />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
            <h4 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h4>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
            {error}
          </p>
        </div>

        {retry && (
          <div className="shrink-0 pt-2 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{activeLang === 'uz' ? 'Qayta urinish' : 'Повторить'}</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
