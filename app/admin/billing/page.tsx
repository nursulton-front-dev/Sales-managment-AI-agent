'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Percent,
  Search,
  RefreshCw,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function AdminBillingPage() {
  const { showToast } = useApp();

  const [stats, setStats] = useState<any | null>(null);
  const [tokenLogs, setTokenLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'subscriptions' | 'topups' | 'usage'>('all');
  const [search, setSearch] = useState('');

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/workspaces');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }

      const logsRes = await fetch('/api/admin/token-logs');
      const logsData = await logsRes.json();
      if (logsData.success) {
        setTokenLogs(logsData.tokenLogs || []);
      }
    } catch (err) {
      console.error('Fetch billing error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const filteredLogs = tokenLogs.filter((log) => {
    if (activeTab === 'subscriptions' && log.actionType !== 'subscription') return false;
    if (activeTab === 'topups' && log.actionType !== 'topup') return false;
    if (activeTab === 'usage' && log.tokensDelta >= 0) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        log.workspaceId.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Платежи, выручка и токены
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Финансовая аналитика, сверка регулярных подписок, разовых докупок и журнал расхода токенов
          </p>
        </div>

        <button
          onClick={fetchBillingData}
          className="p-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs">
          <div className="text-xs font-medium text-[var(--text-muted)]">MRR (Регулярные подписки)</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight mt-1">
            ${stats?.mrrUsd || 0}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            {stats?.mrrUzs ? `${stats.mrrUzs.toLocaleString('ru-RU')} сум` : '0 сум'}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs">
          <div className="text-xs font-medium text-[var(--text-muted)]">Валовые поступления</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight mt-1">
            ${stats?.totalReceivedIncome || 0}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Подписки: ${stats?.receivedSubscriptionIncome || 0} · Докупки: ${stats?.receivedTopupIncome || 0}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs">
          <div className="text-xs font-medium text-[var(--text-muted)]">Расход AI API (Оценка)</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight mt-1">
            ${stats?.openAiDirectCost || 0}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            Эквайринг (2%): ${stats?.gatewayFees?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs">
          <div className="text-xs font-medium text-[var(--text-muted)]">Доля партнёра (20%)</div>
          <div className="text-2xl font-bold text-[#DC2626] font-mono tracking-tight mt-1">
            ${stats?.partnerShareUsd || '0.00'}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            {stats?.partnerShareUzs ? `${stats.partnerShareUzs.toLocaleString('ru-RU')} сум` : '0 сум'}
          </div>
        </div>
      </div>

      {/* Partner Share Methodology Card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 shadow-2xs space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Percent className="w-4 h-4 text-[#DC2626]" />
          <span>Методика расчёта доли партнёра (20% от чистой базы)</span>
        </div>
        <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px] font-mono text-[11px] text-[var(--text-primary)] border border-[var(--border)]">
          Доля = 20% × (Подписки + Докупки токенов − Прямой расход AI API − Эквайринг 2%)
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          Примечание: данная сумма является расчётной аналитической величиной и не маркируется как завершённая выплата до оформления фактического акта.
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center bg-[var(--surface-secondary)] p-0.5 rounded-[6px] text-xs font-medium border border-[var(--border)]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer ${
              activeTab === 'all' ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs' : 'text-[var(--text-muted)]'
            }`}
          >
            Все операции ({tokenLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer ${
              activeTab === 'subscriptions' ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs' : 'text-[var(--text-muted)]'
            }`}
          >
            Подписки
          </button>
          <button
            onClick={() => setActiveTab('topups')}
            className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer ${
              activeTab === 'topups' ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs' : 'text-[var(--text-muted)]'
            }`}
          >
            Докупки
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer ${
              activeTab === 'usage' ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs' : 'text-[var(--text-muted)]'
            }`}
          >
            Списания токенов
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по описанию или ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#DC2626]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">Загрузка журнала...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">Записей не найдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-secondary)] text-[var(--text-muted)] uppercase text-[10px] font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Организация</th>
                  <th className="px-4 py-3">Тип операции</th>
                  <th className="px-4 py-3">Изменение токенов</th>
                  <th className="px-4 py-3">Сумма USD</th>
                  <th className="px-4 py-3">Метод</th>
                  <th className="px-4 py-3">Описание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredLogs.map((log) => {
                  const isPositive = log.tokensDelta > 0;
                  return (
                    <tr key={log.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('ru-RU')} {new Date(log.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-[var(--text-primary)]">
                        {log.workspaceId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-secondary)] border border-[var(--border)] font-mono">
                          {log.actionType}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {isPositive ? `+${log.tokensDelta}` : log.tokensDelta}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-primary)] font-semibold">
                        {log.amountUsd && log.amountUsd !== '0' ? `$${log.amountUsd}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] uppercase text-[10px] font-mono">
                        {log.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                        {log.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
