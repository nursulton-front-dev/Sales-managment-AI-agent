'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Plus,
  Terminal,
  Clock,
  ChevronRight,
  MoreVertical,
  Calendar,
  FileText,
  Link2,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';

export default function AgentsListPage() {
  const { agents, openSandbox, toggleAgentStatus } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredAgents = agents.filter((agent) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || agent.name.toLowerCase().includes(q) || (agent.niche && agent.niche.toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'active'
        ? agent.isActive
        : !agent.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            ИИ-сотрудники
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Настраивайте ответы, знания и каналы общения.
          </p>
        </div>

        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2 rounded-[6px] transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Создать сотрудника</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Найти сотрудника"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] font-medium"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-3 py-2 text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
        >
          <option value="ALL">Все статусы</option>
          <option value="active">Активные</option>
          <option value="paused">На паузе</option>
        </select>
      </div>

      {/* Agents Layout according to 04-agents.png */}
      {agents.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.75">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 9h.01M15 9h.01M9 15h6" />
            </svg>
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
              <Plus className="w-4 h-4" />
              <span>Создать первого сотрудника за 4 шага</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Agents Column (col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            {filteredAgents.map((agent) => {
              const hasChannels = Boolean(agent.telegramToken);
              const hasCalendar = Boolean(agent.googleCalendarEnabled);
              const needsKBReview = !agent.priceList || agent.priceList.length < 20;

              return (
                <div
                  key={agent.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4 text-left hover:border-[var(--border-strong)] transition-colors"
                >
                  {/* Card Header: Avatar, Name, Niche, Status Badge, More menu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center font-bold text-lg shrink-0">
                        <svg className="w-6 h-6 stroke-current fill-none text-[var(--text-muted)]" viewBox="0 0 24 24" strokeWidth="1.75">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug">
                            {agent.name}
                          </h3>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {agent.niche || 'Универсальный менеджер'}
                        </div>
                        <div className="mt-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                            {hasChannels ? 'Подключен к каналу' : 'Только тестирование'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleAgentStatus(agent.id)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-[4px] border transition-colors cursor-pointer ${
                          agent.isActive
                            ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]'
                            : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                        }`}
                      >
                        {agent.isActive ? 'Активен' : 'На паузе'}
                      </button>
                    </div>
                  </div>

                  {/* List of 3 sub-rows: База знаний, Каналы, Календарь */}
                  <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)] text-xs">
                    {/* База знаний */}
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-medium">
                        <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                        <span>База знаний</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        {needsKBReview ? (
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Требует проверки</span>
                          </span>
                        ) : (
                          <span className="text-[var(--success-text)] text-xs font-medium">Заполнена</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </div>

                    {/* Каналы */}
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-medium">
                        <Link2 className="w-4 h-4 text-[var(--text-muted)]" />
                        <span>Каналы</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {hasChannels ? 'Telegram' : 'Не подключены'}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <Image src="/integrations/telegram.svg" alt="TG" width={14} height={14} />
                          <Image src="/integrations/instagram.svg" alt="IG" width={14} height={14} />
                          <Image src="/integrations/whatsapp.svg" alt="WA" width={14} height={14} />
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </div>

                    {/* Календарь */}
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[var(--text-primary)] font-medium">
                        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                        <span>Календарь</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <span className="text-xs">
                          {hasCalendar ? (
                            <span className="text-[var(--success-text)] font-medium">Подключён</span>
                          ) : (
                            'Не подключён'
                          )}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </div>
                  </div>

                  {/* Informative helper callout */}
                  <div className="p-2.5 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <span>Подключите канал, чтобы сотрудник начал отвечать клиентам.</span>
                  </div>

                  {/* Action buttons: Настроить (red border/text) & Тест-драйв (outline) */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Link
                      href="/dashboard/agents/new"
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors text-center"
                    >
                      Настроить
                    </Link>
                    <button
                      type="button"
                      onClick={() => openSandbox(agent.id)}
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)] rounded-[6px] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer text-center"
                    >
                      Тест-драйв
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Next Steps Guide (col-span-4) according to 04-agents.png */}
          <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
              Следующий шаг
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <Link
                href="/dashboard/agents/new"
                className="block p-3.5 rounded-[6px] border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]/50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        Проверьте прайс и услуги
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Убедитесь, что в базе знаний актуальная информация о вашей компании.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Step 2 */}
              <Link
                href="/dashboard/integrations"
                className="block p-3.5 rounded-[6px] border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]/50 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        Подключите канал общения
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      Выберите удобный канал, чтобы сотрудник начал отвечать клиентам.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                <span>Открыть интеграции</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
