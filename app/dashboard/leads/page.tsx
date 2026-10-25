'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
  const { leads, updateLeadStatus, openSandbox, addLead, showToast } = useApp();
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Manual Add Lead Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+998 ');
  const [newChannel, setNewChannel] = useState<'Telegram' | 'Instagram'>('Telegram');
  const [newStatus, setNewStatus] = useState<'Новый' | 'Квалифицирован' | 'Записан в календарь'>('Новый');
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.clientName.toLowerCase().includes(q) ||
      lead.contact.toLowerCase().includes(q) ||
      (lead.notes && lead.notes.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || lead.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const bookedLeads = leads.filter((l) => l.status === 'Записан в календарь' && l.appointmentDate);

  // Dynamic current week days (Mon–Sat) computed on client mount
  const [daysOfWeek, setDaysOfWeek] = useState<Array<{ name: string; short: string; date: string; isoDate: string }>>([]);

  useEffect(() => {
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
    ].map((item, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const isoDate = d.toISOString().split('T')[0];
      return { name: item.name, short: item.short, date: dateStr, isoDate };
    });

    setDaysOfWeek(days);
  }, []);

  const timeSlots = ['10:00', '11:30', '14:00', '15:30', '17:00'];

  const handleCreateManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    addLead({
      clientName: newClientName.trim(),
      contact: newClientPhone.trim(),
      channel: newChannel,
      status: newStatus,
      appointmentDate: newAppointmentDate ? new Date(newAppointmentDate).toISOString() : null,
      tokensSpent: 0,
      notes: newNotes.trim() || 'Ручное добавление через интерфейс CRM',
    });

    showToast('Лид добавлен в воронку', `${newClientName} успешно сохранен в базе`, 'success');
    setIsAddModalOpen(false);
    setNewClientName('');
    setNewClientPhone('+998 ');
    setNewNotes('');
    setNewAppointmentDate('');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Записан в календарь' || status === 'booked') {
      return <Badge variant="success" dot>Записан в календарь</Badge>;
    }
    if (status === 'Квалифицирован' || status === 'qualified') {
      return <Badge variant="info" dot>Квалифицирован</Badge>;
    }
    return <Badge variant="warning" dot>Новое обращение</Badge>;
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Лиды и записи
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Клиенты, этапы продаж и запланированные встречи.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>Добавить лида</span>
          </Button>
        </div>
      </div>

      {/* Tabs / View Switcher */}
      <div className="flex items-center gap-6 border-b border-[var(--border)] text-xs sm:text-sm font-semibold -mt-2">
        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            viewMode === 'table'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Таблица
        </button>
        <button
          type="button"
          onClick={() => setViewMode('kanban')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            viewMode === 'kanban'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Канбан
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`pb-2.5 transition-all cursor-pointer border-b-2 ${
            viewMode === 'calendar'
              ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Календарь
        </button>
      </div>

      {/* Filter and Search Bar */}
      {viewMode !== 'calendar' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или телефону"
              className="w-full pl-9 pr-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] px-3 py-2 text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Все статусы</option>
              <option value="Новый">Новый</option>
              <option value="Квалифицирован">Квалифицирован</option>
              <option value="Записан в календарь">Записан в календарь</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] px-3 py-2 text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Все каналы</option>
              <option value="Telegram">Telegram</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>
        </div>
      )}

      {/* ================= VIEW 1: TABLE ================= */}
      {viewMode === 'table' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-2xs overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.75">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)]">
                {searchQuery || statusFilter !== 'ALL' || channelFilter !== 'ALL'
                  ? 'Ничего не найдено по вашему запросу'
                  : 'Пока нет лидов'}
              </h4>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
                {searchQuery || statusFilter !== 'ALL' || channelFilter !== 'ALL'
                  ? 'Попробуйте сбросить фильтры или изменить поисковый запрос.'
                  : 'Подключите канал общения или добавьте первого клиента вручную.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/dashboard/integrations"
                  className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors"
                >
                  Подключить канал
                </Link>
                <Button size="sm" variant="ghost" onClick={() => setIsAddModalOpen(true)}>
                  <span className="text-[var(--accent)] font-semibold">Добавить вручную</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs">
                      <th className="py-3 px-4">Клиент</th>
                      <th className="py-3 px-3">Канал</th>
                      <th className="py-3 px-3">Этап</th>
                      <th className="py-3 px-3">Ответственный</th>
                      <th className="py-3 px-3">Следующее действие</th>
                      <th className="py-3 px-3">Создан</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--text-primary)]">{lead.clientName}</div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">{lead.contact}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-[11px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded font-medium border border-[var(--border)]">
                            {lead.channel}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(lead.status)}
                        </td>

                        <td className="py-3 px-3 text-[var(--text-primary)] font-medium">
                          ИИ-менеджер
                        </td>

                        <td className="py-3 px-3 text-[var(--text-secondary)] max-w-xs truncate">
                          {lead.appointmentDate ? (
                            <span className="text-[var(--success-text)] font-medium">
                              Встреча {new Date(lead.appointmentDate).toLocaleDateString('ru-RU')}
                            </span>
                          ) : (
                            lead.notes || 'Квалификация диалога'
                          )}
                        </td>

                        <td className="py-3 px-3 text-[var(--text-muted)] font-mono text-[11px]">
                          {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">{lead.clientName}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">{lead.contact}</div>
                      </div>
                      <div>{getStatusBadge(lead.status)}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span className="bg-[var(--surface-secondary)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                        {lead.channel}
                      </span>
                      {lead.appointmentDate && (
                        <span className="flex items-center gap-1 text-[var(--success-text)] font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(lead.appointmentDate).toLocaleDateString('ru-RU')}
                          </span>
                        </span>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border)] line-clamp-2">
                        {lead.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= VIEW 2: KANBAN BOARD ================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'Новый', title: '1. Новые обращения' },
            { id: 'Квалифицирован', title: '2. Квалифицированы ИИ' },
            { id: 'Записан в календарь', title: '3. Записаны в календарь' },
          ].map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.id);

            return (
              <div key={col.id} className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[8px] p-3.5 flex flex-col min-h-[450px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border)]">
                  <div className="font-bold text-xs text-[var(--text-primary)]">{col.title}</div>
                  <span className="text-[10px] font-mono font-bold bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-primary)]">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {colLeads.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-[6px]">
                      Нет лидов на этом этапе
                    </div>
                  ) : (
                    colLeads.map((l) => (
                      <div
                        key={l.id}
                        className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] shadow-2xs space-y-2 text-left hover:border-[var(--border-strong)] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{l.clientName}</span>
                          <span className="text-[10px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-medium border border-[var(--border)]">
                            {l.channel}
                          </span>
                        </div>

                        <div className="text-[11px] text-[var(--text-muted)] font-mono">{l.contact}</div>

                        {l.appointmentDate && (
                          <div className="p-1.5 bg-[var(--success-bg)] border border-[var(--success-border)] rounded text-[11px] text-[var(--success-text)] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--success)]" />
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

                        <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                          {l.notes}
                        </div>

                        {/* Quick Kanban Action Buttons */}
                        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-end gap-1.5">
                          {col.id === 'Новый' && (
                            <button
                              type="button"
                              onClick={() => updateLeadStatus(l.id, 'Квалифицирован')}
                              className="text-[10px] font-semibold text-[var(--accent-soft-text)] bg-[var(--accent-soft)] px-2 py-1 rounded cursor-pointer hover:opacity-90"
                            >
                              Квалифицировать →
                            </button>
                          )}
                          {col.id === 'Квалифицирован' && (
                            <button
                              type="button"
                              onClick={() => updateLeadStatus(l.id, 'Записан в календарь')}
                              className="text-[10px] font-semibold text-[var(--success-text)] bg-[var(--success-bg)] px-2 py-1 rounded cursor-pointer hover:opacity-90"
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
        <div className="space-y-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[var(--surface-secondary)] text-[var(--accent)] flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                  Сетка Google Календаря — Рабочие часы (10:00–18:00)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Автоматическая проверка пересечения слотов и бронирование через ИИ
                </p>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={() => openSandbox()}>
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Проверить через песочницу</span>
            </Button>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-3 shadow-2xs overflow-x-auto">
            <div className="min-w-[760px] grid grid-cols-6 gap-2.5">
              {daysOfWeek.map((day, dayIdx) => (
                <div key={dayIdx} className="space-y-2">
                  {/* Day Header */}
                  <div className="p-2 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-center">
                    <div className="text-xs font-bold text-[var(--text-primary)]">{day.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{day.date}</div>
                  </div>

                  {/* Slots */}
                  {timeSlots.map((time, slotIdx) => {
                    const match = bookedLeads.find((l) => {
                      if (!l.appointmentDate) return false;
                      const lDate = new Date(l.appointmentDate);
                      const lIso = lDate.toISOString().split('T')[0];
                      const lHour = lDate.getHours().toString().padStart(2, '0');
                      return lIso === day.isoDate && time.startsWith(lHour);
                    });
                    const isBooked = Boolean(match);

                    return (
                      <div
                        key={slotIdx}
                        className={`p-2 rounded-md border text-xs transition-all ${
                          isBooked && match
                            ? 'bg-[var(--success-bg)] border-[var(--success-border)] shadow-2xs'
                            : 'bg-[var(--surface)] border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                          <span className={isBooked ? 'text-[var(--success-text)] font-mono font-bold' : 'text-[var(--text-muted)] font-mono'}>
                            {time}
                          </span>
                          {isBooked ? (
                            <span className="bg-[var(--surface)] border border-[var(--success-border)] text-[var(--success-text)] px-1 py-0.2 rounded text-[9px] font-bold">
                              Занят
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">Свободен</span>
                          )}
                        </div>

                        {isBooked && match ? (
                          <div>
                            <div className="font-bold text-[var(--text-primary)] text-[11px] truncate">
                              {match.clientName}
                            </div>
                            <div className="text-[10px] text-[var(--success-text)] truncate mt-0.5 font-mono">
                              {match.contact} · {match.channel}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-[var(--text-muted)] italic py-1 text-center">
                            Свободно (10:00–18:00)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL ADD LEAD MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-[8px] max-w-md w-full border border-[var(--border)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Добавить обращение клиента</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLead} className="p-5 space-y-3.5">
              <Input
                label="Имя клиента"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Например: Сардор Рахимов"
                required
              />

              <PhoneInput
                label="Телефон клиента"
                value={newClientPhone}
                onChange={setNewClientPhone}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Канал связи"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value as any)}
                  options={[
                    { value: 'Telegram', label: 'Telegram' },
                    { value: 'Instagram', label: 'Instagram' },
                  ]}
                />

                <Select
                  label="Статус воронки"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  options={[
                    { value: 'Новый', label: 'Новый' },
                    { value: 'Квалифицирован', label: 'Квалифицирован' },
                    { value: 'Записан в календарь', label: 'Записан в календарь' },
                  ]}
                />
              </div>

              {newStatus === 'Записан в календарь' && (
                <Input
                  label="Дата и время визита"
                  type="datetime-local"
                  value={newAppointmentDate}
                  onChange={(e) => setNewAppointmentDate(e.target.value)}
                />
              )}

              <Input
                label="Заметка / Результат общения"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Интересует вечерняя группа, уровень B1"
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" size="sm">
                  Сохранить лид
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
