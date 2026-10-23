'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Shield,
  Building2,
  Users,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Percent,
  RefreshCw,
  LogOut,
  Trash2,
  Lock,
} from 'lucide-react';

interface WorkspaceData {
  id: string;
  companyName: string;
  niche: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  teamSize: string;
  dailyLeadsVolume: string;
  plan: string;
  tokenBalance: number;
  status: string;
  emailVerified?: boolean;
  createdAt: string;
}

interface StatsData {
  totalWorkspaces: number;
  trialCount: number;
  paidCount: number;
  mrrUsd: number;
  mrrUzs: number;
  receivedSubscriptionIncome?: number;
  receivedTopupIncome?: number;
  totalReceivedIncome?: number;
  openAiDirectCost?: number;
  gatewayFees?: number;
  partnerBase?: number;
  partnerShareUsd: number;
  partnerShareUzs: number;
  totalTokensIssued: number;
  totalTokensSpent: number;
}

interface TokenLogData {
  id: string;
  workspaceId: string;
  actionType: string;
  tokensDelta: number;
  amountUsd: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { setWorkspace, showToast } = useApp();

  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [tokenLogs, setTokenLogs] = useState<TokenLogData[]>([]);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'logs'>('workspaces');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);

  // SuperAdmin Access Control State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState('maxramovnursulton1@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('ai_admin_session');
      if (savedAuth === 'true') {
        setIsAdminAuthenticated(true);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingAuth(false);
      setIsLoading(false);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (
      adminEmail.trim().toLowerCase() === 'maxramovnursulton1@gmail.com' &&
      adminPassword === 'Nursulton_2011'
    ) {
      try {
        localStorage.setItem('ai_admin_session', 'true');
      } catch {}
      setIsAdminAuthenticated(true);
      fetchData();
      showToast('Вход выполнен', 'Добро пожаловать в панель управления платформой', 'success');
    } else {
      setAdminAuthError('Неверный Email или пароль. Доступ разрешен только основателю платформы.');
    }
  };

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem('ai_admin_session');
    } catch {}
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    showToast('Вы вышли из админ-панели', undefined, 'info');
  };

  const handleResetDb = async () => {
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ: Вы действительно хотите очистить ВСЮ базу данных (Neon Postgres)?\n\nВсе организации, сотрудники, лиды и логи токенов будут безвозвратно удалены!'
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.clear();
        } catch {}
        showToast('База данных успешно очищена', 'Все таблицы сброшены до 0 записей.', 'success');
        await fetchData();
      } else {
        showToast('Ошибка сброса', data.error || 'Не удалось очистить БД', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resWs, resLogs] = await Promise.all([
        fetch('/api/admin/workspaces'),
        fetch('/api/admin/token-logs'),
      ]);

      const dataWs = await resWs.json();
      const dataLogs = await resLogs.json();

      if (dataWs.success) {
        setWorkspaces(dataWs.workspaces || []);
        setStats(dataWs.stats || null);
      }
      if (dataLogs.success) {
        setTokenLogs(dataLogs.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTokens = async (workspaceId: string, amount: number) => {
    const reason = window.prompt(
      `Укажите причину начисления +${amount} токенов:`,
      'Бонусное начисление от основателя платформы'
    );
    if (!reason) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          action: 'add_tokens',
          tokensToAdd: amount,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Токены начислены', `+${amount} токенов добавлено.`, 'success');
        fetchData();
      }
    } catch {
      showToast('Ошибка', 'Не удалось начислить токены', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePlan = async (workspaceId: string, newPlan: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          action: 'change_plan',
          newPlan,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Тариф изменен', `Организация переведена на тариф ${newPlan.toUpperCase()}.`, 'success');
        fetchData();
      }
    } catch {
      showToast('Ошибка', 'Не удалось изменить тариф', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImpersonate = async (ws: WorkspaceData) => {
    const reason = window.prompt(
      `Укажите причину для запуска Support-сессии компании "${ws.companyName}":`,
      'Техническая поддержка и диагностика воронки'
    );
    if (!reason) return;

    try {
      const res = await fetch('/api/admin/support-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWorkspaceId: ws.id,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkspace({
          id: ws.id,
          companyName: ws.companyName,
          ownerName: ws.ownerName,
          ownerEmail: ws.ownerEmail,
          plan: ws.plan,
          tokenBalance: ws.tokenBalance,
          emailVerified: ws.emailVerified,
        });

        showToast(
          'Режим поддержки активирован',
          `Вы вошли в кабинет "${ws.companyName}". Все действия логируются.`,
          'info'
        );
        router.push('/dashboard');
      } else {
        showToast('Ошибка входа', data.error || 'Не удалось войти', 'error');
      }
    } catch {
      showToast('Ошибка', 'Сбой создания сессии поддержки', 'error');
    }
  };

  // Filtered workspaces
  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.ownerPhone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="text-xs text-[var(--text-muted)]">Проверка доступа...</div>
      </div>
    );
  }

  // If Not Authenticated as SuperAdmin, show Login Form
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="w-10 h-10 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Shield className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <h2 className="text-center text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Панель управления платформой
          </h2>
          <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
            Доступ только для основателя платформы AI Business OS
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-[var(--surface)] py-6 px-6 border border-[var(--border)] rounded-[8px] shadow-2xs">
            {adminAuthError && (
              <div className="mb-4 p-3 bg-[var(--danger-bg)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--danger-text)]">
                {adminAuthError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email основателя
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@platform.com"
                  className="w-full px-3 py-2 text-base sm:text-xs border border-[var(--border)] bg-[var(--surface-secondary)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] font-medium text-[var(--text-primary)] min-h-[44px] sm:min-h-[38px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-base sm:text-xs border border-[var(--border)] bg-[var(--surface-secondary)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] font-medium text-[var(--text-primary)] min-h-[44px] sm:min-h-[38px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 border border-transparent rounded-[6px] text-xs font-semibold text-[var(--accent-text)] bg-[var(--accent)] hover:opacity-90 transition-colors cursor-pointer min-h-[44px]"
              >
                Войти в админ-панель
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/dashboard"
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ← Вернуться в кабинет
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans">
      {/* Top Navbar */}
      <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Организации
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">
              Панель управления платформой
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors min-h-[36px] flex items-center"
          >
            В кабинет
          </Link>
          <button
            onClick={fetchData}
            title="Обновить данные"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-[6px] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleAdminLogout}
            title="Выйти"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] rounded-[6px] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* 4 Compact KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Компании */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col justify-between h-[104px] shadow-2xs">
            <div className="text-xs font-medium text-[var(--text-muted)]">Компании</div>
            <div className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight">
              {stats?.totalWorkspaces || 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Триал: {stats?.trialCount || 0} · Оплачено: {stats?.paidCount || 0}
            </div>
          </div>

          {/* KPI 2: MRR */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col justify-between h-[104px] shadow-2xs">
            <div className="text-xs font-medium text-[var(--text-muted)]">MRR (Подписки)</div>
            <div className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight">
              ${stats?.mrrUsd || 0}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {stats?.mrrUzs ? `${(stats.mrrUzs).toLocaleString('ru-RU')} сум` : '0 сум'}
            </div>
          </div>

          {/* KPI 3: Доля партнёра */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col justify-between h-[104px] shadow-2xs">
            <div className="text-xs font-medium text-[var(--text-muted)]">Доля партнёра (20%)</div>
            <div className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight">
              ${stats?.partnerShareUsd ? stats.partnerShareUsd.toFixed(2) : '0.00'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              База: ${stats?.partnerBase ? stats.partnerBase.toFixed(2) : '0.00'}
            </div>
          </div>

          {/* KPI 4: Расход токенов */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col justify-between h-[104px] shadow-2xs">
            <div className="text-xs font-medium text-[var(--text-muted)]">Расход токенов</div>
            <div className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight">
              {(stats?.totalTokensSpent || 0).toLocaleString('ru-RU')}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Выпущено: {(stats?.totalTokensIssued || 0).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>

        {/* Collapsible Partner Formula Details */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsFormulaOpen(!isFormulaOpen)}
            className="w-full p-3.5 px-4 flex items-center justify-between text-left hover:bg-[var(--surface-secondary)]/60 transition-colors cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <Percent className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Расчёт доли партнёра: 20% от чистых поступлений</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <span>{isFormulaOpen ? 'Скрыть детали' : 'Показать формулу'}</span>
              {isFormulaOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {isFormulaOpen && (
            <div className="p-4 pt-2 border-t border-[var(--border)] bg-[var(--surface-secondary)]/50 text-xs text-[var(--text-secondary)] space-y-2">
              <div className="font-mono text-[11px] bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-[6px] text-[var(--text-primary)]">
                Доля партнёра = 20% × (Подписки + Докупки токенов − Прямой расход OpenAI − Эквайринг 2%)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)] block">Поступления (валовые):</span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">${stats?.totalReceivedIncome || 0}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Эквайринг (2%):</span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">${stats?.gatewayFees?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Расход OpenAI:</span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">${stats?.openAiDirectCost || 0}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">К выплате (20%):</span>
                  <span className="font-semibold text-[var(--accent)] font-mono">${stats?.partnerShareUsd?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center bg-[var(--surface-secondary)] p-0.5 rounded-[6px] text-xs font-medium border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('workspaces')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] ${
                activeTab === 'workspaces'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Организации ({workspaces.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-[4px] transition-colors cursor-pointer min-h-[36px] sm:min-h-[30px] ${
                activeTab === 'logs'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Журнал токенов ({tokenLogs.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по компании, email..."
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] min-h-[44px] sm:min-h-[36px]"
            />
          </div>
        </div>

        {/* Table Content */}
        {activeTab === 'workspaces' ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs">
            {filteredWorkspaces.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                {searchQuery ? 'Ничего не найдено по вашему запросу' : 'Пока нет ни одной зарегистрированной организации'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                      <th className="py-2.5 px-4">Компания</th>
                      <th className="py-2.5 px-3">Владелец</th>
                      <th className="py-2.5 px-3">Тариф</th>
                      <th className="py-2.5 px-3">Баланс токенов</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredWorkspaces.map((ws) => (
                      <tr key={ws.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">
                          <div>{ws.companyName}</div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{ws.niche}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                          <div>{ws.ownerName}</div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono">{ws.ownerEmail}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={ws.plan}
                            onChange={(e) => handleChangePlan(ws.id, e.target.value)}
                            className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[4px] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="trial">TRIAL</option>
                            <option value="start">START</option>
                            <option value="business">BUSINESS</option>
                            <option value="pro">PRO</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-[var(--text-primary)]">
                          {(ws.tokenBalance ?? 0).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                            ws.status === 'active'
                              ? 'bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--border)]'
                              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                          }`}>
                            {ws.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleAddTokens(ws.id, 500)}
                              title="Начислить +500 токенов"
                              className="px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent-soft)] hover:opacity-90 border border-[var(--border)] rounded-[4px] transition-colors cursor-pointer min-h-[30px]"
                            >
                              +500 ток.
                            </button>
                            <button
                              onClick={() => handleImpersonate(ws)}
                              title="Войти в кабинет от имени клиента"
                              className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[4px] transition-colors cursor-pointer min-h-[30px]"
                            >
                              Поддержка →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Logs Tab */
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs">
            {tokenLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                Журнал операций с токенами пуст
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                      <th className="py-2.5 px-4">Время</th>
                      <th className="py-2.5 px-3">Воркспейс</th>
                      <th className="py-2.5 px-3">Тип</th>
                      <th className="py-2.5 px-3">Токены</th>
                      <th className="py-2.5 px-3">Сумма</th>
                      <th className="py-2.5 px-4">Описание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {tokenLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-2.5 px-4 text-[var(--text-muted)] font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)] text-[11px]">
                          {log.workspaceId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                          {log.actionType}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-[var(--text-primary)]">
                          {log.tokensDelta > 0 ? `+${log.tokensDelta}` : log.tokensDelta}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                          {log.amountUsd ? `$${log.amountUsd}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-secondary)] max-w-sm truncate">
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Bottom Dedicated Service Maintenance Section */}
        <section className="pt-6 border-t border-[var(--border)]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                Сервисное обслуживание базы данных
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Полный сброс всех таблиц Neon Postgres до 0 записей для проведения чистых сквозных тестов.
              </p>
            </div>

            <button
              type="button"
              disabled={isResetting}
              onClick={handleResetDb}
              className="px-3.5 py-2 text-xs font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] hover:opacity-90 border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Очистка...' : 'Очистить тестовые данные (Сброс)'}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
