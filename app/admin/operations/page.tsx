'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Calendar,
  Send,
  Mail,
  CreditCard,
  Shield,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminOperationsPage() {
  const { showToast } = useApp();

  const [loading, setLoading] = useState(false);
  const [deepseekStatus, setDeepseekStatus] = useState<{ configured?: boolean; healthy?: boolean; model?: string; checkedAt?: string; error?: string; durationMs?: number } | null>(null);

  const checkDeepseek = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/deepseek', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Проверка недоступна');
      setDeepseekStatus(data);
      if (data.healthy) {
        showToast('DeepSeek активен', `Модель ${data.model}, latency ${data.durationMs}ms`, 'success');
      } else {
        showToast('Статус DeepSeek', data.error || 'Проверка не завершена', 'info');
      }
    } catch (err: unknown) {
      setDeepseekStatus(previous => ({ ...previous, healthy: false, error: 'Проверка не завершена' }));
      showToast('Ошибка проверки', err instanceof Error ? err.message : 'Не удалось проверить', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/deepseek').then(async res => {
      if (!res.ok) throw new Error('Статус недоступен');
      const data = await res.json();
      if (active) setDeepseekStatus(data);
    }).catch(() => { if (active) setDeepseekStatus({ error: 'Статус недоступен' }); });
    return () => { active = false; };
  }, []);

  const components = [
    {
      name: 'Google Calendar API',
      type: 'Интеграция расписания',
      status: 'Не проверено',
      statusColor: 'amber',
      desc: 'OAuth 2.0 flow c динамическим origin, вставка событий, проверка занятости FreeBusy',
      icon: Calendar,
    },
    {
      name: 'Telegram Bot Gateway',
      type: 'Канал коммуникации',
      status: 'Не проверено',
      statusColor: 'amber',
      desc: 'Webhook-обработка входящих сообщений клиентов и автоответы',
      icon: Send,
    },
    {
      name: 'Resend Email Service',
      type: 'Транзакционная почта',
      status: 'Не проверено',
      statusColor: 'amber',
      desc: 'Отправка 6-значных кодов подтверждения email при регистрации',
      icon: Mail,
    },
    {
      name: 'Payme / Click / Uzum',
      type: 'Платёжный шлюз',
      status: 'Не проверено',
      statusColor: 'amber',
      desc: 'Готовность оплаты требует отдельной проверки реальной транзакции',
      icon: CreditCard,
    },
    {
      name: 'DeepSeek API (Песочница)',
      type: 'AI-провайдер песочницы',
      status: loading ? 'Проверяем' : deepseekStatus?.healthy ? 'Проверка пройдена' : deepseekStatus?.error ? 'Ошибка проверки' : deepseekStatus?.configured === false ? 'Ключ не настроен' : deepseekStatus?.configured ? 'Настроено · не проверено' : 'Статус неизвестен',
      statusColor: deepseekStatus?.healthy ? 'emerald' : 'amber',
      desc: `Модель: ${deepseekStatus?.model || '—'}. ${deepseekStatus?.checkedAt ? 'Проверено: ' + new Date(deepseekStatus.checkedAt).toLocaleString('ru-RU') : 'Проверка выполняет короткий запрос к провайдеру.'} ${deepseekStatus?.error || ''}`,
      icon: Cpu,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Агенты, интеграции и операции
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Настройки компонентов и результат последней проверки ИИ в этой вкладке
          </p>
        </div>

        <button
          onClick={checkDeepseek}
          disabled={loading}
          className="px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] transition-colors self-start sm:self-auto cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Проверить ответ ИИ</span>
        </button>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                    c.statusColor === 'emerald'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.status}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">{c.name}</h3>
                <span className="text-[10px] text-[var(--text-muted)] block">{c.type}</span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Safety & Isolation Rules */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
          <Shield className="w-4 h-4 text-[#DC2626]" />
          <span>Правила изоляции и безопасности операций</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
          <li>Тестовый контур DeepSeek изолирован от рабочих агентов клиентов.</li>
          <li>Операции в песочнице не списывают токены с боевого баланса и не создают дублей в календаре.</li>
          <li>Для исключения дубликатов бронирований и списаний массовые повторы операций без разбора заблокированы.</li>
        </ul>
      </div>
    </div>
  );
}
