'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Play,
  Pause,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  RotateCcw,
  RefreshCw,
  Eye,
  Bot,
  LifeBuoy,
  History,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminOrganizationsPage() {
  const { showToast } = useApp();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected workspace modal/drawer state
  const [selectedWs, setSelectedWs] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'tokens' | 'history'>('overview');

  // Action modals
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [tokensToAdd, setTokensToAdd] = useState('500');
  const [newPlan, setNewPlan] = useState('business');
  const [trialDaysToAdd, setTrialDaysToAdd] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/workspaces');
      const data = await res.json();
      if (data.success) {
        setWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleExecuteAction = async () => {
    if (!selectedWs || !actionType) return;
    if (!actionReason.trim()) {
      showToast('Укажите причину', 'Любое административное действие требует обоснования для аудита', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWs.id,
          action: actionType,
          reason: actionReason,
          tokensToAdd: parseInt(tokensToAdd, 10),
          newPlan,
          daysToAdd: parseInt(trialDaysToAdd, 10),
          status: actionType === 'suspend' ? 'suspended' : actionType === 'restore' ? 'active' : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Действие выполнено', 'Запись сохранена в журнале аудита', 'success');
        setActionType(null);
        setActionReason('');
        await fetchWorkspaces();
        if (data.workspace) setSelectedWs(data.workspace);
      } else {
        showToast('Ошибка', data.error || 'Сбой выполнения операции', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((w) => {
    const matchesSearch =
      !search ||
      w.companyName.toLowerCase().includes(search.toLowerCase()) ||
      w.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      w.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || w.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || (w.status || 'active') === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Организации и компании
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Управление клиентскими пространствами, тарифами, балансом токенов и статусом доступа
          </p>
        </div>

        <button
          onClick={fetchWorkspaces}
          className="p-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors self-start sm:self-auto cursor-pointer"
          title="Обновить список"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3 sm:top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по компании, email или имени владельца..."
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)]"
          >
            <option value="all">Все тарифы</option>
            <option value="trial">TRIAL (Пробный)</option>
            <option value="start">START ($29)</option>
            <option value="business">BUSINESS ($59)</option>
            <option value="pro">PRO ($119)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)]"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="suspended">Приостановленные</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">
            Загрузка организаций...
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">
            Ни одной компании по выбранным критериям не найдено
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-secondary)] text-[var(--text-muted)] border-b border-[var(--border)] uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Организация</th>
                  <th className="px-4 py-3">Владелец</th>
                  <th className="px-4 py-3">Тариф</th>
                  <th className="px-4 py-3">Баланс токенов</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Регистрация</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredWorkspaces.map((ws) => {
                  const isSuspended = ws.status === 'suspended';
                  return (
                    <tr
                      key={ws.id}
                      className="hover:bg-[var(--surface-secondary)]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-[4px] bg-[#18232D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {ws.companyName[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="min-w-0">
                            <span className="truncate block font-semibold">{ws.companyName}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{ws.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        <div className="truncate font-medium">{ws.ownerName}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">{ws.ownerEmail}</div>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                            ws.plan === 'business'
                              ? 'bg-[#18232D] text-white border-transparent'
                              : ws.plan === 'pro'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                              : ws.plan === 'start'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          {ws.plan}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-[var(--text-primary)]">
                        {ws.tokenBalance.toLocaleString('ru-RU')}
                        <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1">ток.</span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            isSuspended
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 border-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {isSuspended ? 'Приостановлена' : 'Активна'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-[11px]">
                        {new Date(ws.createdAt).toLocaleDateString('ru-RU')}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedWs(ws);
                            setActiveTab('overview');
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-[4px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          Управление
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Workspace Modal / Drawer */}
      {selectedWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>{selectedWs.companyName}</span>
                  <span className="text-xs font-mono font-normal text-[var(--text-muted)]">({selectedWs.id})</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Владелец: {selectedWs.ownerName} · {selectedWs.ownerEmail} · {selectedWs.ownerPhone}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedWs(null);
                  setActionType(null);
                }}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Закрыть
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px] flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setActionType('add_tokens')}
                className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] font-medium hover:border-[#DC2626] transition-colors cursor-pointer"
              >
                + Начислить токены
              </button>
              <button
                onClick={() => setActionType('extend_trial')}
                className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] font-medium hover:border-[#DC2626] transition-colors cursor-pointer"
              >
                + Продлить триал
              </button>
              <button
                onClick={() => setActionType('change_plan')}
                className="px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] font-medium hover:border-[#DC2626] transition-colors cursor-pointer"
              >
                Сменить тариф
              </button>
              {selectedWs.status === 'suspended' ? (
                <button
                  onClick={() => setActionType('restore')}
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Восстановить доступ
                </button>
              ) : (
                <button
                  onClick={() => setActionType('suspend')}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Приостановить организацию
                </button>
              )}
            </div>

            {/* Action Form if triggered */}
            {actionType && (
              <div className="p-4 rounded-[6px] border border-[#DC2626]/30 bg-[#FEF2F2]/40 dark:bg-[rgba(220,38,38,0.06)] space-y-3">
                <div className="text-xs font-bold text-[#DC2626]">
                  {actionType === 'add_tokens' && 'Начисление токенов на баланс компании'}
                  {actionType === 'extend_trial' && 'Продление пробного периода'}
                  {actionType === 'change_plan' && 'Смена тарифного плана'}
                  {actionType === 'suspend' && 'Приостановка обслуживания организации'}
                  {actionType === 'restore' && 'Возобновление обслуживания'}
                </div>

                {actionType === 'add_tokens' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Количество токенов
                    </label>
                    <select
                      value={tokensToAdd}
                      onChange={(e) => setTokensToAdd(e.target.value)}
                      className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs"
                    >
                      <option value="500">+500 токенов (компенсация)</option>
                      <option value="1000">+1 000 токенов</option>
                      <option value="3000">+3 000 токенов</option>
                      <option value="6000">+6 000 токенов</option>
                    </select>
                  </div>
                )}

                {actionType === 'extend_trial' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Количество дополнительных дней
                    </label>
                    <select
                      value={trialDaysToAdd}
                      onChange={(e) => setTrialDaysToAdd(e.target.value)}
                      className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs"
                    >
                      <option value="3">+3 дня</option>
                      <option value="7">+7 дней (1 неделя)</option>
                      <option value="14">+14 дней</option>
                    </select>
                  </div>
                )}

                {actionType === 'change_plan' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Новый тариф
                    </label>
                    <select
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                      className="px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs"
                    >
                      <option value="start">START (2 000 ток, 1 агент)</option>
                      <option value="business">BUSINESS (6 000 ток, 3 агента)</option>
                      <option value="pro">PRO (15 000 ток, 10 агентов)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Обязательная причина действия (для журнала аудита)
                  </label>
                  <input
                    type="text"
                    required
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Например: По согласованию с клиентом по тикету #1004"
                    className="w-full px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="px-3 py-1 rounded border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteAction}
                    disabled={isSubmitting}
                    className="px-4 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold"
                  >
                    {isSubmitting ? 'Выполняем...' : 'Подтвердить и зафиксировать'}
                  </button>
                </div>
              </div>
            )}

            {/* Overview parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px]">
                <span className="text-[var(--text-muted)] block">Текущий тариф:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono uppercase">{selectedWs.plan}</span>
              </div>
              <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px]">
                <span className="text-[var(--text-muted)] block">Баланс токенов:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  {selectedWs.tokenBalance.toLocaleString('ru-RU')}
                </span>
              </div>
              <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px]">
                <span className="text-[var(--text-muted)] block">Google Календарь:</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {selectedWs.googleCalendarConnected ? 'Подключен' : 'Не подключен'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
