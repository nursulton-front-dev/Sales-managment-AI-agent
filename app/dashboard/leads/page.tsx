'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DataState } from '@/components/ui/DataState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  const { leads, leadsLoading, leadsError, refreshLeads, updateLeadStatus, openSandbox, addLead, showToast } = useApp();
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
  const [newStatus, setNewStatus] = useState<'Новый' | 'Квалифицирован' | 'Записан в календарь'>('Новый');
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const dirty = Boolean(newClientName || newClientPhone.replace(/\D/g, '') !== '998' || newAppointmentDate);
  useUnsavedChanges(isAddModalOpen && dirty);
  const closeLeadForm = () => { if (!isSavingLead && (!dirty || window.confirm('Изменения не сохранены. Закрыть форму?'))) setIsAddModalOpen(false); };

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

  const bookedLeads = filteredLeads.filter((l) => l.status === 'Записан в календарь' && l.appointmentDate);

  // Dynamic current week days (Mon–Sun) computed on client mount
  const [daysOfWeek] = useState<Array<{ name: string; short: string; date: string; isoDate: string }>>(() => {
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
      appointmentDate: newAppointmentDate ? new Date(newAppointmentDate).toISOString() : null,
      tokensSpent: 0,
    });

    showToast('Лид добавлен в воронку', `${newClientName} успешно сохранен в базе`, 'success');
    setIsAddModalOpen(false);
    setNewClientName('');
    setNewClientPhone('+998 ');
    setNewAppointmentDate('');
    } catch (error) { showToast('Не удалось сохранить лида', error instanceof Error ? error.message : 'Ошибка сети', 'error'); }
    finally { setIsSavingLead(false); }
  };

  if (leadsLoading || leadsError) return <DataState loading={leadsLoading} error={leadsError} retry={refreshLeads} />;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
            Лиды и записи
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Квалифицированные обращения и расписание визитов
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Новый лид</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--surface-secondary)] p-0.5 rounded-[6px] text-xs font-semibold border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Таблица ({leads.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Канбан</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Календарь</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {viewMode !== 'calendar' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Поиск лидов" placeholder="Поиск по имени или номеру..."
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-[34px] bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] font-medium"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-1 bg-[var(--surface-secondary)] p-0.5 rounded-[6px] text-xs">
              {['ALL', 'Новый', 'Квалифицирован', 'Записан в календарь'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-[4px] font-medium transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s === 'ALL' ? 'Все статусы' : s}
                </button>
              ))}
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] px-2.5 py-1.5 min-h-[38px] sm:min-h-[34px] text-xs text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
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
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2.5">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Список лидов пуст</h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                Здесь будут отображаться входящие заявки клиентов, результаты квалификации и слоты Google Календаря.
              </p>
              <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить лид вручную</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Клиент</th>
                      <th className="py-3 px-3">Канал</th>
                      <th className="py-3 px-3">Статус воронки</th>
                      <th className="py-3 px-3">Слот в Google Календаре</th>
                      <th className="py-3 px-3">Квалификация и заметки</th>
                      <th className="py-3 px-3 text-right">Токены</th>
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
                          <span className="text-[10px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-medium border border-[var(--border)]">
                            {lead.channel}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(lead.status)}
                        </td>

                        <td className="py-3 px-3">
                          {lead.appointmentDate ? (
                            <div className="flex items-center gap-1.5 text-[var(--success-text)] font-medium">
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
                            <span className="text-[var(--text-muted)] text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-[var(--text-secondary)] max-w-xs truncate">
                          {lead.notes || '—'}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                          {lead.tokensSpent > 0 ? `-${lead.tokensSpent}` : '0'}
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
            <div className="min-w-[760px] grid grid-cols-7 gap-2.5">
              {daysOfWeek.map((day, dayIdx) => (
                <div key={dayIdx} className="space-y-2">
                  {/* Day Header */}
                  <div className="p-2 rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] text-center">
                    <div className="text-xs font-bold text-[var(--text-primary)]">{day.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{day.date}</div>
                  </div>

                  {bookedLeads.filter((lead) => new Date(lead.appointmentDate!).toLocaleDateString('en-CA') === day.isoDate)
                    .sort((a, b) => new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime())
                    .map((lead) => <div key={lead.id} className="p-3 rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] text-sm">
                      <time className="font-semibold text-[var(--success-text)]">{new Date(lead.appointmentDate!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
                      <p className="font-medium break-words mt-1">{lead.clientName}</p><p className="text-xs break-words mt-1">{lead.contact}</p>
                    </div>)}
                  {!bookedLeads.some((lead) => new Date(lead.appointmentDate!).toLocaleDateString('en-CA') === day.isoDate) && <p className="text-xs text-[var(--text-muted)] p-3">Нет записей в CRM</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL ADD LEAD MODAL ================= */}
      <Dialog open={isAddModalOpen} onClose={closeLeadForm} label="Добавить обращение клиента" className="w-md">
          <div className="bg-[var(--surface)] rounded-[8px] max-w-md w-full border border-[var(--border)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Добавить обращение клиента</h3>
              <button
                type="button"
                onClick={closeLeadForm}
                aria-label="Закрыть форму лида" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 cursor-pointer"
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
                  onChange={(e) => setNewChannel(e.target.value as typeof newChannel)}
                  options={[
                    { value: 'Telegram', label: 'Telegram' },
                    { value: 'Instagram', label: 'Instagram' },
                  ]}
                />

                <Select
                  label="Статус воронки"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={closeLeadForm}>
                  Отмена
                </Button>
                <Button type="submit" disabled={isSavingLead} size="sm">
                  Сохранить лид
                </Button>
              </div>
            </form>
          </div>
      </Dialog>
    </div>
  );
}
