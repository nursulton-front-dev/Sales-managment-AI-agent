'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Bot,
  Plus,
  Terminal,
  Clock,
} from 'lucide-react';

export default function AgentsListPage() {
  const { agents, openSandbox, toggleAgentStatus } = useApp();

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            ИИ-сотрудники
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Сценарии квалификации, подключение Telegram-ботов и автоматическая запись в календарь
          </p>
        </div>

        {agents.length > 0 && (
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать сотрудника</span>
          </Link>
        )}
      </div>

      {/* Agents Grid or Single Calm Empty State */}
      {agents.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              У вас пока нет созданных ИИ-сотрудников
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Настройте сценарий квалификации, прайс-лист и подключите каналы для автоматической записи клиентов.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать первого сотрудника за 4 шага</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors text-left"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center font-semibold shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm leading-snug">
                        {agent.name}
                      </h3>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        {agent.niche}
                      </span>
                    </div>
                  </div>

                  {/* Active switch */}
                  <button
                    type="button"
                    onClick={() => toggleAgentStatus(agent.id)}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border transition-colors cursor-pointer ${
                      agent.isActive
                        ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    {agent.isActive ? 'Активен 24/7' : 'На паузе'}
                  </button>
                </div>

                {/* Qualification questions preview */}
                <div className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] p-2.5 text-xs text-[var(--text-secondary)] space-y-1">
                  <div className="font-semibold text-[var(--text-primary)] text-[11px]">
                    Вопросы квалификации:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                    {agent.qualificationQuestions.slice(0, 2).map((q, idx) => (
                      <li key={idx} className="truncate">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Statuses */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-center">
                  <div className="p-1.5 rounded-[4px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Календарь</div>
                    <div className="text-[11px] font-medium text-[var(--success-text)] mt-0.5">
                      {agent.googleCalendarEnabled ? 'Синхрон' : 'Выкл'}
                    </div>
                  </div>

                  <div className="p-1.5 rounded-[4px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Расход</div>
                    <div className="text-[11px] font-medium text-[var(--text-primary)] mt-0.5 font-mono">
                      {agent.tokensUsed || 0} ток.
                    </div>
                  </div>

                  <div className="p-1.5 rounded-[4px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-muted)]">Канал</div>
                    <div className="text-[11px] font-medium text-[var(--accent-soft-text)] mt-0.5">
                      {agent.telegramToken ? 'Telegram' : 'Песочница'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom action */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span suppressHydrationWarning>
                    {new Date(agent.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => openSandbox(agent.id)}
                  className="inline-flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] text-xs font-medium px-2.5 py-1.5 border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Тест в песочнице</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
