'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { DataState } from '@/components/ui/DataState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SparrowMascot } from '@/components/ui/SparrowMascot';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  CalendarCheck,
  Search,
  Clock,
  Calendar,
  Table as TableIcon,
  CalendarDays,
  Plus,
  Terminal,
  LayoutGrid,
  X,
} from 'lucide-react';

export default function LeadsCalendarPage() {
  const {
    leads,
    leadsLoading,
    leadsError,
    refreshLeads,
    updateLeadStatus,
    openSandbox,
    addLead,
    showToast,
    workspace,
  } = useApp();
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Manual Add Lead Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+998 ');
  const [newChannel, setNewChannel] = useState<'Telegram' | 'Instagram'>('Telegram');
  const [newStatus, setNewStatus] = useState<
    'Новый' | 'Квалифицирован' | 'Записан в календарь'
  >('Новый');
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const dirty = Boolean(
    newClientName || newClientPhone.replace(/\D/g, '') !== '998' || newAppointmentDate
  );
  useUnsavedChanges(isAddModalOpen && dirty);
  const closeLeadForm = () => {
    if (
      !isSavingLead &&
      (!dirty || window.confirm('Изменения не сохранены. Закрыть форму?'))
    ) {
      setIsAddModalOpen(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.clientName.toLowerCase().includes(q) ||
      lead.contact.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || lead.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const bookedLeads = filteredLeads.filter(
    (l) => l.status === 'Записан в календарь' && l.appointmentDate
  );

  // Dynamic current week days (Mon–Sun) computed on client mount
  const [daysOfWeek] = useState<
    Array<{ name: string; short: string; date: string; isoDate: string }>
  >(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [
      { name: 'Понедельник', short: 'Пн' },
      { name: 'Вторник', short: 'Вт' },
      { name: 'Среда', short: 'Ср' },
      { name: 'Четверг', short: 'Чт' },
      { name: 'Пятница', short: 'Пт' },
      { name: 'Суббота', short: 'Сб' },
      { name: 'Воскресенье', short: 'Вс' },
    ].map((item, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const isoDate = d.toLocaleDateString('en-CA');
      return { name: item.name, short: item.short, date: dateStr, isoDate };
    });

    return days;
  });

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || isSavingLead) return;
    setIsSavingLead(true);
    try {
      await addLead({
        clientName: newClientName.trim(),
        contact: newClientPhone.trim(),
        channel: newChannel,
        status: newStatus,
        appointmentDate: newAppointmentDate
          ? new Date(newAppointmentDate).toISOString()
          : null,
        tokensSpent: 0,
      });

      showToast(
        'Лид добавлен в воронку',
        `${newClientName} успешно сохранен в базе`,
        'success'
      );
      setIsAddModalOpen(false);
      setNewClientName('');
      setNewClientPhone('+998 ');
      setNewAppointmentDate('');
    } catch (error) {
      showToast(
        'Не удалось сохранить лида',
        error instanceof Error ? error.message : 'Ошибка сети',
        'error'
      );
    } finally {
      setIsSavingLead(false);
    }
  };

  if (leadsLoading || leadsError) {
    return <DataState loading={leadsLoading} error={leadsError} retry={refreshLeads} />;
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Записан в календарь' || status === 'booked') {
      return (
        <Badge variant="success" dot>
          Записан в календарь
        </Badge>
      );
    }
    if (status === 'Квалифицирован' || status === 'qualified') {
      return (
        <Badge variant="info" dot>
          Квалифицирован
        </Badge>
      );
    }
    return (
      <Badge variant="warning" dot>
        Новое обращение
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full pb-10 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)] dark:border-[#29374C]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[#F4F7FB] leading-tight">
            Лиды и записи
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
            Квалифицированные обращения клиентов, контакты и расписание визитов.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый лид</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--surface-secondary)] dark:bg-[#101B2E] p-1 rounded-xl text-xs font-semibold border border-[var(--border)] dark:border-[#29374C]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Таблица ({leads.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Канбан</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#FF7277]" />
              <span>Календарь</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {viewMode !== 'calendar' && (
        <div className="bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] dark:text-[#AABAD0] absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Поиск лидов"
              placeholder="Поиск по имени или номеру..."
              className="w-full pl-8 pr-3 py-1.5 min-h-[36px] bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-xl text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-1 bg-[var(--surface-secondary)] dark:bg-[#101B2E] p-1 rounded-xl text-xs">
              {['ALL', 'Новый', 'Квалифицирован', 'Записан в календарь'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[var(--surface)] dark:bg-[#142137] text-[var(--text-primary)] dark:text-[#F4F7FB] shadow-2xs font-bold'
                      : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s === 'ALL' ? 'Все статусы' : s}
                </button>
              ))}
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-xl px-3 py-1.5 min-h-[36px] text-xs text-[var(--text-primary)] dark:text-[#F4F7FB] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Все каналы</option>
              <option value="Telegram">Telegram</option>
              <option value="Instagram">Instagram</option>
              <option value="WebWidget">Сайт</option>
            </select>
          </div>
        </div>
      )}

      {/* ================= VIEW 1: TABLE ================= */}
      {viewMode === 'table' && (
        <div className="bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-secondary)] dark:bg-[#101B2E] border-b border-[var(--border)] dark:border-[#29374C] text-[var(--text-secondary)] dark:text-[#AABAD0] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Клиент</th>
                  <th className="py-3.5 px-3">Канал</th>
                  <th className="py-3.5 px-3">Статус воронки</th>
                  <th className="py-3.5 px-3">Слот в Google Календаре</th>
                  <th className="py-3.5 px-3">Квалификация и заметки</th>
                  <th className="py-3.5 px-3 text-right">ИИ-ответы</th>
                </tr>
              </thead>
              {filteredLeads.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      {searchQuery || statusFilter !== 'ALL' ? (
                        <>
                          <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center">
                            <SparrowMascot variant="look" size={88} animate={false} />
                          </div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                            Лиды не найдены
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                            По заданным параметрам поиска или фильтрам заявок не обнаружено.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('ALL');
                            }}
                          >
                            Сбросить фильтры
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center">
                            <SparrowMascot
                              variant={
                                workspace?.telegramBusinessConnected || workspace?.instagramConnected
                                  ? 'idle'
                                  : 'hello'
                              }
                              size={88}
                              animate={false}
                            />
                          </div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                            {workspace?.telegramBusinessConnected || workspace?.instagramConnected
                              ? 'Каналы подключены · Ожидаем заявки'
                              : 'Список лидов пуст'}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                            {workspace?.telegramBusinessConnected || workspace?.instagramConnected
                              ? 'ИИ-сотрудник автоматически внесёт клиента в список лидов после первой квалификации в диалоге.'
                              : 'Здесь будут отображаться входящие заявки клиентов, результаты квалификации и слоты Google Календаря.'}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
                              onClick={() => setIsAddModalOpen(true)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Добавить лид вручную</span>
                            </Button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-[var(--border)] dark:divide-[#29374C]">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[#101B2E]/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                          {lead.clientName}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 font-mono mt-0.5">
                          {lead.contact}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-[10px] bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0] px-2 py-0.5 rounded-full font-medium border border-[var(--border)] dark:border-[#29374C]">
                          {lead.channel === 'WebWidget' ? 'Сайт' : lead.channel}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">{getStatusBadge(lead.status)}</td>

                      <td className="py-3.5 px-3">
                        {lead.appointmentDate ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span suppressHydrationWarning>
                              {new Date(lead.appointmentDate).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] dark:text-[#AABAD0]/60 text-[11px]">
                            —
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-[var(--text-secondary)] dark:text-[#AABAD0] max-w-xs truncate">
                        {lead.notes || '—'}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {lead.tokensSpent > 0 ? `-${lead.tokensSpent}` : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: KANBAN BOARD ================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { id: 'Новый', title: '1. Новые обращения' },
            { id: 'Квалифицирован', title: '2. Квалифицированы ИИ' },
            { id: 'Записан в календарь', title: '3. Записаны в календарь' },
          ].map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-2xl p-4 flex flex-col min-h-[460px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)] dark:border-[#29374C]">
                  <div className="font-bold text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {col.title}
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[var(--surface)] dark:bg-[#142137] px-2 py-0.5 rounded-full border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colLeads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/60 border border-dashed border-[var(--border)] dark:border-[#29374C] rounded-xl">
                      Нет лидов на этом этапе
                    </div>
                  ) : (
                    colLeads.map((l) => (
                      <div
                        key={l.id}
                        className="p-3.5 bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-xl shadow-2xs space-y-2 text-left hover:border-[var(--border-strong)] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
                            {l.clientName}
                          </span>
                          <span className="text-[10px] bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0] px-1.5 py-0.5 rounded border border-[var(--border)] dark:border-[#29374C]">
                            {l.channel === 'WebWidget' ? 'Сайт' : l.channel}
                          </span>
                        </div>

                        <div className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 font-mono">
                          {l.contact}
                        </div>

                        {l.appointmentDate && (
                          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span suppressHydrationWarning>
                              {new Date(l.appointmentDate).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {l.notes && (
                          <div className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] line-clamp-2">
                            {l.notes}
                          </div>
                        )}

                        {/* Quick Kanban Action Buttons */}
                        <div className="pt-2 border-t border-[var(--border)] dark:border-[#29374C] flex items-center justify-end gap-1.5">
                          {col.id === 'Новый' && (
                            <button
                              type="button"
                              onClick={() => updateLeadStatus(l.id, 'Квалифицирован')}
                              className="text-[10px] font-semibold text-[#FF7277] hover:underline cursor-pointer"
                            >
                              Квалифицировать →
                            </button>
                          )}
                          {col.id === 'Квалифицирован' && (
                            <button
                              type="button"
                              onClick={() => updateLeadStatus(l.id, 'Записан в календарь')}
                              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              Записать в слот →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW 3: CALENDAR GRID ================= */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-red-500/10 text-[#FF7277] flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] dark:text-[#F4F7FB] text-sm">
                  Сетка Google Календаря — Рабочие часы
                </h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Автоматическая проверка пересечения слотов и бронирование через ИИ-сотрудников
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => openSandbox()}
              className="text-xs font-semibold"
            >
              <Terminal className="w-3.5 h-3.5 text-[#FF7277]" />
              <span>Проверить через песочницу</span>
            </Button>
          </div>

          <div className="bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-2xl p-4 shadow-2xs overflow-x-auto">
            <div className="min-w-[760px] grid grid-cols-7 gap-3">
              {daysOfWeek.map((day, dayIdx) => (
                <div key={dayIdx} className="space-y-2">
                  {/* Day Header */}
                  <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-center">
                    <div className="text-xs font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      {day.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 font-mono mt-0.5">
                      {day.date}
                    </div>
                  </div>

                  {bookedLeads
                    .filter(
                      (lead) =>
                        new Date(lead.appointmentDate!).toLocaleDateString('en-CA') ===
                        day.isoDate
                    )
                    .sort(
                      (a, b) =>
                        new Date(a.appointmentDate!).getTime() -
                        new Date(b.appointmentDate!).getTime()
                    )
                    .map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs space-y-1"
                      >
                        <time className="font-bold text-emerald-600 dark:text-emerald-400 block">
                          {new Date(lead.appointmentDate!).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                        <p className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                          {lead.clientName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] truncate font-mono">
                          {lead.contact}
                        </p>
                      </div>
                    ))}
                  {!bookedLeads.some(
                    (lead) =>
                      new Date(lead.appointmentDate!).toLocaleDateString('en-CA') ===
                      day.isoDate
                  ) && (
                    <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/60 p-3 text-center">
                      Нет записей
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL ADD LEAD MODAL ================= */}
      <Dialog
        open={isAddModalOpen}
        onClose={closeLeadForm}
        label="Добавить обращение клиента"
        className="w-[calc(100vw-32px)] sm:w-[460px] max-w-[460px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <form onSubmit={handleCreateManualLead} className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3">
            <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
              Новое обращение клиента
            </h3>
            <button
              type="button"
              onClick={closeLeadForm}
              aria-label="Закрыть форму лида"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5">
            <Input
              label="Имя клиента"
              placeholder="Например, Азиз Рахимов"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] mb-1.5">
                Номер телефона
              </label>
              <PhoneInput
                value={newClientPhone}
                onChange={(val) => setNewClientPhone(val)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Канал"
                value={newChannel}
                onChange={(e) =>
                  setNewChannel(e.target.value as 'Telegram' | 'Instagram')
                }
                options={[
                  { value: 'Telegram', label: 'Telegram' },
                  { value: 'Instagram', label: 'Instagram' },
                ]}
              />

              <Select
                label="Статус воронки"
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(
                    e.target.value as
                      | 'Новый'
                      | 'Квалифицирован'
                      | 'Записан в календарь'
                  )
                }
                options={[
                  { value: 'Новый', label: 'Новый' },
                  { value: 'Квалифицирован', label: 'Квалифицирован' },
                  { value: 'Записан в календарь', label: 'Записан' },
                ]}
              />
            </div>

            {newStatus === 'Записан в календарь' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB] mb-1.5">
                  Дата и время слота встречи
                </label>
                <input
                  type="datetime-local"
                  value={newAppointmentDate}
                  onChange={(e) => setNewAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-xl text-[var(--text-primary)] dark:text-[#F4F7FB] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border)] dark:border-[#29374C]">
            <Button
              type="button"
              variant="ghost"
              onClick={closeLeadForm}
              disabled={isSavingLead}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingLead}
              className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
            >
              Сохранить лид
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
