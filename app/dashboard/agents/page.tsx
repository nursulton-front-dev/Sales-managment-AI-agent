'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp, type Agent } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { getMaxAgentsForPlan } from '@/lib/pricing';
import {
  Users,
  Plus,
  Play,
  BookOpen,
  Plug,
  CalendarDays,
  X,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentList />
    </Suspense>
  );
}

function AgentList() {
  const {
    agents,
    agentsLoading,
    agentsError,
    refreshAgents,
    openSandbox,
    toggleAgentStatus,
    workspace,
    plan,
  } = useApp();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = agents.find(
    (agent) => agent.id === (editingId || searchParams.get('edit'))
  );

  const closeEditor = () => {
    setEditingId(null);
    if (searchParams.has('edit')) {
      router.replace('/dashboard/agents', { scroll: false });
    }
  };

  const filtered = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' || (filter === 'active' ? agent.isActive : !agent.isActive))
  );

  const connected = (agent: Agent) =>
    agent.telegramConnected ||
    (workspace?.instagramConnected && workspace.instagramAgentId === agent.id);

  const maxAgents = getMaxAgentsForPlan(plan || 'trial');
  const isLimitReached = agents.length >= maxAgents;

  if (agentsLoading || agentsError) {
    return (
      <DataState
        loading={agentsLoading}
        error={agentsError}
        retry={refreshAgents}
      />
    );
  }

  return (
    <div className="space-y-6 w-full pb-10 text-left">
      {/* Header with Quota Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)] dark:border-[#29374C]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[#F4F7FB] leading-tight">
            ИИ-сотрудники
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
            Настраивайте базу знаний, прайс-лист и каналы общения для каждого ассистента.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] flex items-center gap-2">
            <span>
              Сотрудники:{' '}
              <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {agents.length}
              </strong>{' '}
              из {maxAgents}
            </span>
          </div>

          {!isLimitReached ? (
            <Link
              href="/dashboard/agents/new"
              className="px-4 py-2 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus size={16} />
              <span>Создать сотрудника</span>
            </Link>
          ) : (
            <Link
              href="/dashboard/billing"
              className="px-4 py-2 rounded-xl border border-[#FF7277] text-[#FF7277] hover:bg-red-500/10 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <span>Повысить тариф →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Plan Limit Warning Notice if reached */}
      {isLimitReached && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-[#142137] dark:border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                Достигнут лимит сотрудников для тарифа {plan?.toUpperCase()} ({maxAgents} из {maxAgents})
              </p>
              <p className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                Для подключения до 3 сотрудников выберите тариф BUSINESS, до 10 — тариф PRO.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-xs font-semibold text-[#FF7277] hover:underline shrink-0"
          >
            Перейти к тарифам →
          </Link>
        </div>
      )}

      {/* Search and Filters */}
      {agents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl">
          <Input
            aria-label="Найти сотрудника"
            placeholder="Поиск по имени сотрудника..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Select
            aria-label="Статус сотрудника"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Все статусы' },
              { value: 'active', label: 'Включены' },
              { value: 'paused', label: 'На паузе' },
            ]}
          />
        </div>
      )}

      {/* Main Content Layout */}
      {!filtered.length ? (
        <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-12 text-center shadow-xs">
          <div className="size-14 rounded-2xl bg-red-500/10 text-[#FF7277] flex items-center justify-center mx-auto mb-4 font-bold">
            <Users size={28} />
          </div>
          <h2 className="font-bold text-lg text-[var(--text-primary)] dark:text-[#F4F7FB]">
            {agents.length ? 'Сотрудники не найдены' : 'Создайте первого ИИ-сотрудника'}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {agents.length
              ? 'Попробуйте изменить поисковый запрос или фильтр статуса.'
              : 'Добавьте инструкции и прайс-лист, чтобы ассистент начал квалифицировать клиентов.'}
          </p>
          {!agents.length && (
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs mt-4 shadow-2xs"
            >
              <Plus size={16} />
              <span>Создать сотрудника</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Agents Cards */}
          <div className="xl:col-span-8 space-y-5">
            {filtered.map((agent) => (
              <div
                key={agent.id}
                className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 shadow-xs space-y-5 hover:border-[var(--border-strong)] transition-all"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-13 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-[#FF7277] flex items-center justify-center font-bold text-base shrink-0 border border-red-500/20">
                      AI
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                        {agent.name}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] truncate mt-0.5">
                        {agent.niche}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={
                      !agent.isActive
                        ? 'neutral'
                        : connected(agent)
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {!agent.isActive
                      ? 'На паузе'
                      : connected(agent)
                      ? '● Канал подключён'
                      : '○ Только тестирование'}
                  </Badge>
                </div>

                {/* Readiness Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 border-y border-[var(--border)] dark:border-[#29374C] text-xs">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E]">
                    <BookOpen size={16} className="text-[#FF7277] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 block">
                        База знаний
                      </span>
                      <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] truncate block">
                        {agent.priceList.trim() ? 'Добавлена' : 'Нужно заполнить'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E]">
                    <Plug size={16} className="text-[#229ED9] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 block">
                        Каналы связи
                      </span>
                      <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] truncate block">
                        {connected(agent) ? 'Подключены' : 'Не подключены'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E]">
                    <CalendarDays size={16} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 block">
                        Google Календарь
                      </span>
                      <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] truncate block">
                        {workspace?.googleCalendarConnected && agent.googleCalendarEnabled
                          ? 'Синхронизирован'
                          : 'Не подключён'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Status Notice if not connected */}
                {!connected(agent) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
                    <span>
                      Подключите Telegram, Instagram или виджет на сайт, чтобы сотрудник начал отвечать клиентам.
                    </span>
                    <Link
                      href="/dashboard/integrations"
                      className="font-semibold underline shrink-0"
                    >
                      Подключить →
                    </Link>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-semibold"
                    onClick={() => setEditingId(agent.id)}
                  >
                    Настроить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-semibold flex items-center justify-center gap-1.5"
                    onClick={() => openSandbox(agent.id)}
                  >
                    <Play size={14} />
                    <span>Тест-драйв</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => toggleAgentStatus(agent.id)}
                  >
                    {agent.isActive ? 'Приостановить' : 'Включить'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Tips & Next Steps */}
          <div className="xl:col-span-4 space-y-5">
            <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                Рекомендации по запуску
              </h3>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                  <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block mb-1">
                    1. Актуальный прайс-лист
                  </strong>
                  Укажите точные цены, длительность услуг и правила записи, чтобы ИИ отвечал клиентам уверенно.
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                  <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block mb-1">
                    2. Квалификационные вопросы
                  </strong>
                  Задайте 2–3 вопроса для определения потребностей клиента (например: город, бюджет, удобный день).
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C]">
                  <strong className="text-[var(--text-primary)] dark:text-[#F4F7FB] block mb-1">
                    3. Проверка через тест-драйв
                  </strong>
                  Перед запуском в живой канал протестируйте диалог в песочнице с разными сценариями вопросов.
                </div>
              </div>

              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7277] hover:underline pt-1"
              >
                <span>Перейти в каталог интеграций</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Agent Editor Modal */}
      {editing && (
        <AgentEditor
          key={editing.id}
          agent={editing}
          onClose={closeEditor}
          onSaved={refreshAgents}
        />
      )}
    </div>
  );
}

function AgentEditor({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useApp();
  const [name, setName] = useState(agent.name);
  const [knowledge, setKnowledge] = useState(agent.priceList);
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const [questions, setQuestions] = useState(
    agent.qualificationQuestions.join('\n')
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== agent.name ||
    knowledge !== agent.priceList ||
    prompt !== agent.systemPrompt ||
    questions !== agent.qualificationQuestions.join('\n');

  useUnsavedChanges(dirty);

  const closeEditor = () => {
    if (
      !saving &&
      (!dirty || window.confirm('Изменения не сохранены. Закрыть редактор?'))
    ) {
      onClose();
    }
  };

  return (
    <Dialog
      open
      onClose={closeEditor}
      label="Настройка ИИ-сотрудника"
      className="w-[calc(100vw-32px)] sm:w-[600px] max-w-[600px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
    >
      <form
        className="p-5 sm:p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          try {
            const res = await fetch('/api/agents', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: agent.id,
                name,
                knowledgeBase: knowledge,
                systemPrompt: prompt,
                qualificationQuestions: questions
                  .split('\n')
                  .map((q) => q.trim())
                  .filter(Boolean),
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success)
              throw new Error(data.error || 'Ошибка сохранения');
            onClose();
            await onSaved();
            showToast('Настройки сотрудника сохранены');
          } catch (error) {
            showToast(
              'Не удалось сохранить',
              error instanceof Error ? error.message : 'Ошибка сети',
              'error'
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3">
          <h2 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
            Настройка сотрудника {agent.name}
          </h2>
          <Button
            type="button"
            variant="ghost"
            onClick={closeEditor}
            aria-label="Закрыть редактор"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="space-y-3.5">
          <Input
            label="Имя сотрудника"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] mb-1.5">
              Услуги, прайс-лист и регламенты
            </label>
            <textarea
              rows={4}
              className="w-full border border-[var(--border)] dark:border-[#29374C] rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] p-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              placeholder="Опишите товары, услуги, цены, адрес и часто задаваемые вопросы..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] mb-1.5">
              Вопросы квалификации (по одному на строке)
            </label>
            <textarea
              rows={3}
              className="w-full border border-[var(--border)] dark:border-[#29374C] rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] p-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Какая услуга вас интересует?&#10;Какой день удобен для визита?"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] mb-1.5">
              Инструкции сотруднику (системный промпт)
            </label>
            <textarea
              rows={4}
              className="w-full border border-[var(--border)] dark:border-[#29374C] rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] p-3 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] font-mono"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
          <Button type="button" variant="ghost" onClick={closeEditor} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            disabled={!dirty}
            className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
          >
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
