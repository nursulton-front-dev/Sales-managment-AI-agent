'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  LifeBuoy,
  Plus,
  Send,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Paperclip,
  X,
  FileText,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  authorEmail: string;
  authorName: string;
  type: 'question' | 'bug' | 'complaint' | 'suggestion';
  subject: string;
  description: string;
  status: 'new' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  unreadByCustomer: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  ticketId: string;
  senderRole: 'customer' | 'support' | 'system';
  senderEmail: string;
  senderName: string;
  text: string;
  isInternalNote: boolean;
  attachments?: Array<{ name: string; url: string; size?: number }>;
  createdAt: string;
}

export default function SupportPage() {
  const { user, showToast } = useApp();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{ ticket: Ticket; messages: Message[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Ticket Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState<'question' | 'bug' | 'complaint' | 'suggestion'>('question');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Load tickets list
  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Load ticket details
  const loadTicketDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      setSelectedTicketId(id);
      const res = await fetch(`/api/support/tickets/${id}`);
      const data = await res.json();
      if (data.success) {
        setTicketDetails(data);
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unreadByCustomer: false } : t))
        );
      } else {
        showToast('Ошибка', data.error || 'Не удалось открыть обращение', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой запроса', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      showToast('Заполните поля', 'Укажите тему и подробное описание обращения', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const attachments = newAttachmentName
        ? [{ name: newAttachmentName, url: `/uploads/${encodeURIComponent(newAttachmentName)}` }]
        : [];

      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          subject: newSubject,
          description: newDescription,
          attachments,
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        showToast('Обращение создано', `Присвоен номер ${data.ticket.ticketNumber}`, 'success');
        setIsCreating(false);
        setNewSubject('');
        setNewDescription('');
        setNewAttachmentName('');
        await loadTickets();
        loadTicketDetails(data.ticket.id);
      } else {
        showToast('Ошибка', data.error || 'Не удалось отправить обращение', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message || 'Сбой отправки', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          text: replyText,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setReplyText('');
        setTicketDetails((prev) =>
          prev
            ? {
                ...prev,
                ticket: { ...prev.ticket, status: 'in_progress' },
                messages: [...prev.messages, data.message],
              }
            : null
        );
        showToast('Отправлено', 'Ваш ответ добавлен к обращению', 'success');
      } else {
        showToast('Ошибка', data.error || 'Не удалось отправить ответ', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой отправки', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Reopen ticket
  const handleReopenTicket = async () => {
    if (!selectedTicketId) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Обращение возобновлено', 'Статус изменен на "В работе"', 'success');
        loadTicketDetails(selectedTicketId);
        loadTickets();
      }
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    }
  };

  const getTypeBadge = (type: Ticket['type']) => {
    switch (type) {
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-[4px]">
            <AlertCircle className="w-3 h-3" /> Ошибка
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-[4px]">
            <AlertCircle className="w-3 h-3" /> Претензия
          </span>
        );
      case 'suggestion':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-2 py-0.5 rounded-[4px]">
            <Lightbulb className="w-3 h-3" /> Предложение
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-[4px]">
            <HelpCircle className="w-3 h-3" /> Вопрос
          </span>
        );
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-2 py-0.5 rounded-[4px]">
            <Clock className="w-3 h-3" /> Новое
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-[4px]">
            <Clock className="w-3 h-3" /> В работе
          </span>
        );
      case 'waiting_customer':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 px-2 py-0.5 rounded-[4px]">
            Ждет вашего ответа
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-[4px]">
            <CheckCircle2 className="w-3 h-3" /> Решено
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Служба заботы и предложений"
          description="Задайте вопрос, отправьте пожелание по развитию или сообщите об инциденте"
        />

        {!isCreating && (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setIsCreating(true);
              setSelectedTicketId(null);
              setTicketDetails(null);
            }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Создать обращение
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      {isCreating ? (
        /* Create Ticket Form */
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Новое обращение в поддержку</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Мы ответим в течение 15 минут в рабочее время (10:00 - 18:00 UTC+5)
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Тип обращения
                  </label>
                  <Select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    options={[
                      { value: 'question', label: 'Вопрос по использованию' },
                      { value: 'bug', label: 'Техническая ошибка / сбой' },
                      { value: 'complaint', label: 'Претензия / жалоба' },
                      { value: 'suggestion', label: 'Предложение по улучшению' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Тема обращения
                  </label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Краткая суть проблемы или вопроса"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Подробное описание
                </label>
                <textarea
                  rows={5}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Опишите, что произошло, шаги воспроизведения или ваше предложение..."
                  className="w-full px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Прикрепить скриншот или лог (название файла)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    placeholder="Например: screenshot_error_calendar.png"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Вы можете указать имя файла снимка экрана или выгрузки ошибки
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                >
                  Отправить в поддержку
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : selectedTicketId && ticketDetails ? (
        /* Ticket Details & Chat View */
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedTicketId(null);
              setTicketDetails(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться к списку обращений</span>
          </button>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-muted)] font-semibold">
                    {ticketDetails.ticket.ticketNumber}
                  </span>
                  <span className="text-[var(--text-primary)] font-semibold">{ticketDetails.ticket.subject}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {getTypeBadge(ticketDetails.ticket.type)}
                  {getStatusBadge(ticketDetails.ticket.status)}
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Создано {new Date(ticketDetails.ticket.createdAt).toLocaleDateString('ru-RU')} в{' '}
                    {new Date(ticketDetails.ticket.createdAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {(ticketDetails.ticket.status === 'resolved' || ticketDetails.ticket.status === 'closed') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReopenTicket}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Возобновить обращение
                </Button>
              )}
            </CardHeader>

            <CardBody className="space-y-4">
              {/* Message thread */}
              <div className="space-y-3 pt-2">
                {ticketDetails.messages.map((msg) => {
                  const isStaff = msg.senderRole === 'support';
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border text-sm ${
                        isStaff
                          ? 'bg-[#FEF2F2]/60 dark:bg-[rgba(220,38,38,0.08)] border-[#DC2626]/20'
                          : 'bg-[var(--surface-secondary)] border-[var(--border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">
                            {isStaff ? 'Служба заботы AI Business OS' : msg.senderName || 'Вы'}
                          </span>
                          {isStaff && (
                            <Badge variant="danger">
                              Поддержка
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-[var(--border)] flex flex-wrap gap-2">
                          {msg.attachments.map((att, attIdx) => (
                            <span
                              key={attIdx}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)]"
                            >
                              <Paperclip className="w-3 h-3 text-[var(--text-muted)]" />
                              <span className="font-mono">{att.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              {ticketDetails.ticket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="pt-4 border-t border-[var(--border)] space-y-3">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Ваш ответ
                  </label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Напишите ответ или уточнение по обращению..."
                    className="w-full px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={sendingReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Отправить ответ
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-[var(--surface-secondary)] rounded-lg text-xs text-[var(--text-muted)] text-center">
                  Обращение закрыто. Вы можете создать новое обращение или возобновить текущее.
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
        /* Tickets List */
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">История обращений</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Все зарегистрированные запросы, ошибки и предложения вашей организации
            </p>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                Загрузка обращений...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  Обращений пока нет
                </div>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Если у вас возник вопрос по подключению Google Календаря, настройке сотрудников или тарифам, создайте обращение.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Создать первое обращение
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => loadTicketDetails(ticket.id)}
                    className="p-4 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                          {ticket.subject}
                        </span>
                        {ticket.unreadByCustomer && (
                          <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" title="Новый ответ" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {getTypeBadge(ticket.type)}
                        {getStatusBadge(ticket.status)}
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
