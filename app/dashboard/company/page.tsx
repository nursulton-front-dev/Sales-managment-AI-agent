'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Mail,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Upload,
  Crown,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CompanyTeamPage() {
  const { user, plan, tokenBalance, isGoogleCalendarConnected, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'company' | 'team'>('company');

  // Company state
  const [companyName, setCompanyName] = useState('');
  const [businessNiche, setBusinessNiche] = useState('Маркетинговое агентство');
  const [companyPhone, setCompanyPhone] = useState('+998 90 123 45 67');
  const [companyWebsite, setCompanyWebsite] = useState('https://company.uz');
  const [companyDescription, setCompanyDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Team state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'admin'>('manager');
  const [isInviting, setIsInviting] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; name: string; email: string; role: string; status: string; isCurrentUser?: boolean }>
  >([]);

  useEffect(() => {
    fetch('/api/workspace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.workspace) {
          const ws = data.workspace;
          setCompanyName(ws.companyName || 'Kuch group');
          setCompanyPhone(ws.ownerPhone || '+998 90 123 45 67');
          setTeamMembers([
            {
              id: 'owner-1',
              name: ws.ownerName || user?.name || 'Нурсултон',
              email: ws.ownerEmail || user?.email || '',
              role: 'Владелец',
              status: 'Активен',
              isCurrentUser: true,
            },
          ]);
        }
      })
      .catch((err) => console.error('Failed to load company settings:', err));
  }, [user]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/workspace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          ownerPhone: companyPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Данные сохранены', 'Информация о компании успешно обновлена', 'success');
      } else {
        showToast('Ошибка сохранения', data.error || 'Сбой запроса', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);

    setTimeout(() => {
      setTeamMembers((prev) => [
        ...prev,
        {
          id: `member-${Date.now()}`,
          name: inviteEmail.split('@')[0],
          email: inviteEmail.trim(),
          role: inviteRole === 'admin' ? 'Администратор' : 'Менеджер',
          status: 'Приглашен',
        },
      ]);
      showToast('Приглашение отправлено', `Письмо отправлено на ${inviteEmail}`, 'success');
      setInviteEmail('');
      setIsInviting(false);
    }, 600);
  };

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Компания и команда
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {activeTab === 'company'
              ? 'Данные организации и рабочие настройки.'
              : 'Участники и права доступа к рабочему пространству.'}
          </p>
        </div>

        {activeTab === 'team' && (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('invite-form');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-4 py-2 rounded-[6px] transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Пригласить участника</span>
          </button>
        )}
      </div>

      {/* Tabs: Компания, Команда */}
      <div className="flex items-center gap-6 border-b border-[var(--border)] text-xs sm:text-sm font-semibold -mt-2">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'company'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Компания
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            activeTab === 'team'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Команда
        </button>
      </div>

      {/* ================= TAB 1: КОМПАНИЯ ================= */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Информация о компании (8 cols) */}
          <div className="lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-6">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Информация о компании
            </h2>

            {/* Logo upload field */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Логотип компании
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[8px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-2xl text-[var(--text-primary)]">
                  {companyName.charAt(0).toUpperCase() || 'K'}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => showToast('Загрузка логотипа', 'Выберите файл PNG/SVG до 2 МБ', 'info')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-[6px] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                  >
                    Загрузить логотип
                  </button>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    JPG, PNG или SVG. До 2 МБ.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Название компании
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Kuch group"
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Сфера бизнеса
                  </label>
                  <select
                    value={businessNiche}
                    onChange={(e) => setBusinessNiche(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Маркетинговое агентство">Маркетинговое агентство</option>
                    <option value="Учебный центр">Учебный центр</option>
                    <option value="Медицинская клиника">Медицинская клиника</option>
                    <option value="Салон красоты">Салон красоты</option>
                    <option value="Интернет-магазин">Интернет-магазин</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Рабочий телефон
                  </label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Сайт
                  </label>
                  <input
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://company.uz"
                    className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Описание компании
                </label>
                <textarea
                  rows={3}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Чем занимается ваша компания"
                  className="w-full p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" isLoading={isSaving}>
                  <span>Сохранить изменения</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Рабочее пространство & График и запись (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Рабочее пространство */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Рабочее пространство
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Текущее рабочее пространство вашей компании.
              </p>

              <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">
                  {companyName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                  {(plan || 'START').toUpperCase()}
                </span>
              </div>

              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline pt-1"
              >
                <span>Перейти к тарифу</span>
                <span>→</span>
              </Link>
            </div>

            {/* График и запись */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                График и запись
              </h3>

              <div className="flex items-center gap-3">
                <Image
                  src="/integrations/google-calendar.png"
                  alt="GCal"
                  width={36}
                  height={36}
                  className="object-contain shrink-0"
                />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Настройте календарь и рабочие часы в интеграциях.
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/dashboard/integrations"
                  className="w-full inline-flex items-center justify-center text-xs font-semibold px-4 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors text-center"
                >
                  Открыть интеграции
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: КОМАНДА ================= */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Team Table & Invite Form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Members Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Участники · {teamMembers.length}
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Поиск по участникам..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs">
                      <th className="py-2.5 px-3">Участник</th>
                      <th className="py-2.5 px-3">Роль</th>
                      <th className="py-2.5 px-3">Статус</th>
                      <th className="py-2.5 px-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {teamMembers
                      .filter((m) => !teamSearch || m.name.toLowerCase().includes(teamSearch.toLowerCase()) || m.email.toLowerCase().includes(teamSearch.toLowerCase()))
                      .map((member) => (
                        <tr key={member.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                  {member.isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)] rounded">
                                      Вы
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)] font-mono">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-medium text-[var(--text-primary)]">
                            {member.role}
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{member.status}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right text-[var(--text-muted)]">
                            {member.isCurrentUser ? '—' : (
                              <button
                                type="button"
                                className="text-red-600 hover:underline text-[11px] font-medium cursor-pointer"
                              >
                                Отозвать
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite Form according to 08-team.png */}
            <div id="invite-form" className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Пригласить в команду
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Отправьте приглашение, чтобы добавить участника в ваше рабочее пространство.
              </p>

              <form onSubmit={handleSendInvite} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      Email участника
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@company.uz"
                      className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-primary)]">
                      Роль
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="manager">Менеджер</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isInviting || !inviteEmail.trim()}
                      className="w-full h-10 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold rounded-[6px] transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {isInviting ? 'Отправка...' : 'Отправить приглашение'}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <span className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 font-bold">ⓘ</span>
                  <span>Менеджер работает с лидами и диалогами. Доступ к оплате остаётся у владельца.</span>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Роли и права доступа (4 cols) according to 08-team.png */}
          <div className="lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Роли и права доступа
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Каждая роль имеет свой уровень доступа к возможностям системы.
            </p>

            <div className="space-y-4 pt-2">
              {/* Role 1: Владелец */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Владелец
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Полный доступ к системе, оплате и управлению командой.
                  </p>
                </div>
              </div>

              {/* Role 2: Администратор */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Администратор
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Управление рабочим пространством и ИИ-сотрудниками.
                  </p>
                </div>
              </div>

              {/* Role 3: Менеджер */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 stroke-current fill-none text-[var(--text-muted)]" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Менеджер
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Работа с лидами и диалогами. Доступ к оплате остаётся у владельца.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
