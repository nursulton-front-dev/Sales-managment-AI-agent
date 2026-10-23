'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  Building2,
  Users,
  Plug,
  Globe,
  Calendar,
  Send,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Lock,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isGoogleCalendarConnected, openCalendarModal, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'company' | 'team' | 'integrations' | 'language'>('company');

  // Company profile state
  const [companyName, setCompanyName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [workingHours, setWorkingHours] = useState('10:00-18:00');
  const [slotDuration, setSlotDuration] = useState('45');
  const [timezone, setTimezone] = useState('Asia/Tashkent');
  const [isSaving, setIsSaving] = useState(false);

  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; role: string; status: string }>>([]);

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState<'ru' | 'uz' | 'en'>('ru');

  useEffect(() => {
    fetch('/api/workspace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.workspace) {
          const ws = data.workspace;
          setCompanyName(ws.companyName || '');
          setOwnerPhone(ws.ownerPhone || '');
          setWorkingHours(ws.googleCalendarWorkingHours || '10:00-18:00');
          setSlotDuration(String(ws.googleCalendarSlotDuration || 45));
          setTeamMembers([
            {
              name: ws.ownerName || 'Владелец',
              email: ws.ownerEmail || user?.email || '',
              role: 'Владелец (Owner)',
              status: 'Активен',
            },
          ]);
        }
      })
      .catch((err) => console.error('Failed to load settings:', err));
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
          ownerPhone,
          googleCalendarWorkingHours: workingHours,
          googleCalendarSlotDuration: slotDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Настройки сохранены', 'Параметры организации обновлены', 'success');
      } else {
        showToast('Ошибка сохранения', data.error || 'Не удалось обновить настройки', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setTeamMembers((prev) => [
      ...prev,
      {
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole === 'admin' ? 'Администратор (Admin)' : 'Оператор (Member)',
        status: 'Приглашен',
      },
    ]);
    setInviteEmail('');
    showToast('Приглашение создано', `Сотрудник ${inviteEmail} добавлен в список команды`, 'success');
  };

  return (
    <div className="space-y-5 text-left">
      <PageHeader
        title="Настройки организации"
        description="Управление реквизитами компании, командой, подключенными интеграциями и региональными параметрами."
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[38px] ${
            activeTab === 'company'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Компания</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[38px] ${
            activeTab === 'team'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Команда ({teamMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[38px] ${
            activeTab === 'integrations'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Plug className="w-4 h-4" />
          <span>Интеграции</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[38px] ${
            activeTab === 'language'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Язык и Регион</span>
        </button>
      </div>

      {/* TAB 1: Company Profile */}
      {activeTab === 'company' && (
        <Card className="max-w-2xl">
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Профиль организации</h2>
            <p className="text-xs text-[var(--text-muted)]">Основные реквизиты, используемые в CRM и календаре</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <Input
                label="Название компании"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Например: Учебный центр Cambridge"
                required
              />

              <PhoneInput
                label="Контактный телефон руководителя"
                value={ownerPhone}
                onChange={setOwnerPhone}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Рабочие часы для записи (ЧЧ:ММ-ЧЧ:ММ)"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="10:00-18:00"
                  helperText="В эти часы ИИ проверяет доступность слотов"
                />

                <Select
                  label="Длительность слота встречи"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                  options={[
                    { value: '30', label: '30 минут (Экспресс-урок)' },
                    { value: '45', label: '45 минут (Стандарт)' },
                    { value: '60', label: '60 минут (Полный час)' },
                    { value: '90', label: '90 минут (Двойной урок)' },
                  ]}
                />
              </div>

              <Select
                label="Часовой пояс (IANA Timezone)"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { value: 'Asia/Tashkent', label: 'Asia/Tashkent (Ташкент, Самарканд UTC+5)' },
                  { value: 'Asia/Almaty', label: 'Asia/Almaty (Алматы, Астана UTC+5)' },
                  { value: 'Europe/Moscow', label: 'Europe/Moscow (Москва UTC+3)' },
                  { value: 'UTC', label: 'UTC (Гринвич)' },
                ]}
              />

              <div className="pt-2">
                <Button type="submit" isLoading={isSaving}>
                  Сохранить изменения
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* TAB 2: Team */}
      {activeTab === 'team' && (
        <div className="space-y-4 max-w-3xl">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Участники организации</h2>
                <p className="text-xs text-[var(--text-muted)]">Управление доступом сотрудников к кабинету</p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-[var(--border)]">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--text-primary)] text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">{member.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{member.role}</Badge>
                      <Badge variant="success" dot>{member.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Invite form */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Пригласить нового сотрудника</h3>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <Input
                    label="Email сотрудника"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.uz"
                    required
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    label="Роль"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    options={[
                      { value: 'admin', label: 'Администратор' },
                      { value: 'member', label: 'Оператор' },
                    ]}
                  />
                </div>
                <Button type="submit">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Пригласить</span>
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 3: Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Управление интеграциями перенесено в единый раздел
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Подключение Google Календаря, каналов связи и настройка расписания доступны на отдельной странице.
              </p>
            </div>
            <a
              href="/dashboard/integrations"
              className="h-10 px-4 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <span>Открыть Интеграции</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Calendar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] text-[#DC2626] flex items-center justify-center border border-[var(--border)]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Google Календарь</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">OAuth 2.0 синхронизация встреч</p>
                  </div>
                </div>
                <Badge variant={isGoogleCalendarConnected ? 'success' : 'warning'} dot>
                  {isGoogleCalendarConnected ? 'Подключен' : 'Не подключен'}
                </Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Проверка свободных слотов и автоматическая запись клиентов на встречи через ИИ-сотрудников.
                </p>
                <a
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:underline"
                >
                  <span>Настроить на странице интеграций</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </CardBody>
            </Card>

            {/* Telegram Bot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[#DC2626] flex items-center justify-center border border-[var(--border)]">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">Telegram Bot</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Основной канал общения</p>
                  </div>
                </div>
                <Badge variant="info">Активно</Badge>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Токен бота привязывается в карточке каждого ИИ-сотрудника. Вебхук принимает сообщения клиентов и направляет в диалоги.
                </p>
                <div className="p-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] font-mono text-[10px] text-[var(--text-muted)] truncate">
                  Webhook: /api/telegram/webhook
                </div>
              </CardBody>
            </Card>

            {/* WhatsApp (Roadmap: Stage 2) */}
            <Card className="opacity-80">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border)]">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">WhatsApp Business API</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Этап 2 (Roadmap)</p>
                  </div>
                </div>
                <Badge variant="neutral">Roadmap</Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Интеграция с официальным WhatsApp Cloud API запланирована в релизе Этапа 2 после запуска голосовых агентов.
                </p>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Статус: <strong>В плане разработки</strong>
                </div>
              </CardBody>
            </Card>

            {/* amoCRM / Bitrix24 (Roadmap) */}
            <Card className="opacity-80">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border)]">
                    <Plug className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">amoCRM / Bitrix24</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Внешние CRM-системы</p>
                  </div>
                </div>
                <Badge variant="neutral">Roadmap</Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Двусторонняя синхронизация с внешними CRM запланирована в Roadmap. Текущая версия предоставляет встроенную воронку лидов и историю записей.
                </p>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Статус: <strong>В плане разработки</strong>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Language & Locale */}
      {activeTab === 'language' && (
        <Card className="max-w-xl">
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Язык интерфейса</h2>
            <p className="text-xs text-[var(--text-muted)]">Выберите язык панели управления</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="space-y-2">
              {[
                { code: 'ru', label: 'Русский (Russian)', sub: 'Основной рабочий язык платформы' },
                { code: 'uz', label: "O'zbek tili (Lotin)", sub: "O'zbekiston hududi uchun to'liq moslashtirilgan" },
                { code: 'en', label: 'English (US)', sub: 'International business interface' },
              ].map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code as any);
                    showToast('Язык изменен', `Интерфейс переключен на ${lang.label}`, 'info');
                  }}
                  className={`p-3 rounded-[6px] border flex items-center justify-between cursor-pointer transition-colors ${
                    selectedLanguage === lang.code
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-5 rounded-[3px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      {lang.code}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-[var(--text-primary)]">{lang.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{lang.sub}</div>
                    </div>
                  </div>

                  {selectedLanguage === lang.code && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
