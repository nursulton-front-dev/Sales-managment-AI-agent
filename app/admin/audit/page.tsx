'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Database,
  Building2,
  ChevronDown,
} from 'lucide-react';

interface AuditLog {
  id: string;
  adminEmail: string;
  adminRole: string;
  entityType: string;
  entityId: string;
  action: string;
  reason: string;
  diffBefore: any;
  diffAfter: any;
  result: string;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || log.adminRole === roleFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesRole && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'add_tokens':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">Начисление токенов</span>;
      case 'change_plan':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">Смена тарифа</span>;
      case 'extend_trial':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400">Продление триала</span>;
      case 'suspend_workspace':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">Блокировка</span>;
      case 'restore_workspace':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-400">Разблокировка</span>;
      case 'verify_email':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-400">Верификация Email</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#DC2626]" />
            Журнал действий основателей
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Неизменяемый реестр всех изменений тарифов, ручных начислений токенов и блокировок с обязательным обоснованием
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить реестр
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по email администратора, ID компании или причине..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            >
              <option value="all">Все роли</option>
              <option value="super_admin">Суперадмин</option>
              <option value="finance">Финансист</option>
              <option value="support">Поддержка</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            >
              <option value="all">Все типы действий</option>
              <option value="add_tokens">Начисление токенов</option>
              <option value="change_plan">Смена тарифа</option>
              <option value="extend_trial">Продление триала</option>
              <option value="suspend_workspace">Блокировка</option>
              <option value="restore_workspace">Разблокировка</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Время</th>
                <th className="py-3 px-4">Администратор</th>
                <th className="py-3 px-4">Действие</th>
                <th className="py-3 px-4">Объект</th>
                <th className="py-3 px-4">Обоснование</th>
                <th className="py-3 px-4">Результат</th>
                <th className="py-3 px-4 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Загрузка журнала аудита...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Записей в журнале аудита не найдено
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.adminEmail}
                      </div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">
                        {log.adminRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">{log.entityType}:</span> {log.entityId.slice(0, 14)}...
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                      {log.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {log.result}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-[#DC2626] hover:text-[#B91C1C] dark:hover:text-red-400 transition"
                      >
                        Развернуть
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#DC2626]" />
                Детали административной операции
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block mb-0.5">Администратор</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedLog.adminEmail}</span>
                  <span className="block text-slate-500">({selectedLog.adminRole})</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="text-slate-400 block mb-0.5">Время записи</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Обоснование действия
                </span>
                <p className="p-3 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed border border-slate-200 dark:border-slate-700">
                  {selectedLog.reason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                    До изменения (Diff Before)
                  </span>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs overflow-x-auto max-h-40 border border-slate-200 dark:border-slate-800">
                    {JSON.stringify(selectedLog.diffBefore, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                    После изменения (Diff After)
                  </span>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs overflow-x-auto max-h-40 border border-slate-200 dark:border-slate-800">
                    {JSON.stringify(selectedLog.diffAfter, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-md transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
