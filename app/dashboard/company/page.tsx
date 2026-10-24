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
  ShieldCheck,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Mail,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Link2,
} from 'lucide-react';
import Link from 'next/link';

export default function CompanyPage() {
  const { user, isGoogleCalendarConnected, openCalendarModal, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'company' | 'team'>('company');

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
          ownerPhone,
          googleCalendarWorkingHours: workingHours,
          googleCalendarSlotDuration: slotDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Сохранено', 'Данные компании успешно обновлены', 'success');
      } else {
        showToast('Ошибка', data.error || 'Не удалось обновить данные', 'error');
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
        role: inviteRole === 'admin' ? 'Администратор' : 'Оператор',
        status: 'Приглашение отправлено',
      },
    ]);
    setInviteEmail('');
    showToast('Приглашение создано', `Ссылка для входа отправлена на ${inviteEmail}`, 'success');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Компания и команда"
        description="Профиль организации, график работы для записи и управление доступом сотрудников"
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'company'
              ? 'border-[#DC2626] text-[#DC2626] dark:text-[#FCA5A5]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Профиль компании</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'team'
              ? 'border-[#DC2626] text-[#DC2626] dark:text-[#FCA5A5]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Команда и доступы</span>
        </button>
      </div>

      {activeTab === 'company' ? (
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Основные сведения</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Имя компании отображается в заголовке, отчетах и при коммуникации с клиентами
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Название компании / Учебного центра
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Например: Учебный центр Cambridge"
                  />
                </div>

                <div>
                  <PhoneInput
                    label="Основной контактный телефон"
                    value={ownerPhone}
                    onChange={(val) => setOwnerPhone(val)}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Параметры бронирования и расписания</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Используются ИИ-сотрудниками при подборе слотов и записи в Google Календарь
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Рабочие часы
                  </label>
                  <Input
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="10:00-18:00"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Формат: ЧЧ:ММ-ЧЧ:ММ</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Длительность слота (минут)
                  </label>
                  <Select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    options={[
                      { value: '30', label: '30 минут' },
                      { value: '45', label: '45 минут (стандарт)' },
                      { value: '60', label: '60 минут (1 час)' },
                      { value: '90', label: '90 минут' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Часовой пояс
                  </label>
                  <Input
                    value={timezone}
                    disabled
                    className="bg-[var(--surface-secondary)] cursor-not-allowed opacity-80"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">Фиксировано для региона</p>
                </div>
              </div>

              {/* Google Calendar quick status banner */}
              <div className="pt-2">
                <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-[var(--text-primary)]">
                        Google Календарь
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {isGoogleCalendarConnected
                          ? 'Подключен и готов к записи клиентов'
                          : 'Не подключен. Настройте интеграцию в разделе Интеграции'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/integrations"
                    className="text-xs font-medium text-[#DC2626] hover:underline shrink-0"
                  >
                    Перейти к интеграции →
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Сохранить изменения
            </Button>
          </div>
        </form>
      ) : (
        /* Team tab */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Пригласить сотрудника</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Предоставьте доступ коллегам для управления диалогами и просмотра лидов
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    options={[
                      { value: 'admin', label: 'Администратор' },
                      { value: 'operator', label: 'Оператор' },
                      { value: 'viewer', label: 'Наблюдатель' },
                    ]}
                  />
                </div>
                <Button type="submit" variant="primary" className="shrink-0">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Пригласить
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Список участников</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Сотрудники с доступом к текущему рабочему пространству
              </p>
            </CardHeader>
            <CardBody>
              <div className="divide-y divide-[var(--border)]">
                {teamMembers.map((member, i) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] shrink-0">
                        {member.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="neutral">
                        {member.role}
                      </Badge>
                      <span className="text-[11px] text-[var(--text-secondary)] hidden sm:inline">
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
