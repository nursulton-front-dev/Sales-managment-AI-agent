'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Shield,
  LifeBuoy,
  Search,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Send,
  User,
  Paperclip,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  workspaceId: string;
  authorEmail: string;
  authorName: string;
  type: 'question' | 'bug' | 'complaint' | 'suggestion';
  subject: string;
  description: string;
  status: 'new' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assignedTo?: string;
  unreadByCustomer: boolean;
  unreadBySupport: boolean;
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
  attachments?: Array<{ name: string; url: string }>;
  createdAt: string;
}

export default function AdminSupportQueuePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{ ticket: Ticket; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply form state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/support');
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load tickets queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const loadTicketDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      setSelectedTicketId(id);
      const res = await fetch(`/api/admin/support/${id}`);
      const data = await res.json();
      if (data.success) {
        setTicketDetails(data);
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, unreadBySupport: false } : t))
        );
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          text: replyText,
          isInternalNote,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setReplyText('');
        setTicketDetails((prev) =>
          prev
            ? {
                ...prev,
                ticket: {
                  ...prev.ticket,
                  status: isInternalNote ? prev.ticket.status : 'waiting_customer',
                },
                messages: [...prev.messages, data.message],
              }
            : null
        );
        fetchTickets();
      }
    } catch (err) {
      console.error('Staff reply error:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (status: Ticket['status']) => {
    if (!selectedTicketId) return;
    try {
      const res = await fetch(`/api/admin/support/${selectedTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', status }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketDetails((prev) => (prev ? { ...prev, ticket: { ...prev.ticket, status } } : null));
        fetchTickets();
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.authorEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans">
      {/* Top Header */}
      <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 rounded-[6px] hover:bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] text-white flex items-center justify-center font-bold text-xs shrink-0">
            <LifeBuoy className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Очередь поддержки и тикетов
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">
              Жалобы, предложения и технические запросы клиентов
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <button
            onClick={fetchTickets}
            title="Обновить"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-[6px] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Split Queue */}
      <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Filters & Ticket List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Filters */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-3 space-y-3 shadow-2xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по номеру, теме, автору..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)]"
                >
                  <option value="all">Все типы</option>
                  <option value="question">Вопросы</option>
                  <option value="bug">Ошибки</option>
                  <option value="complaint">Жалобы</option>
                  <option value="suggestion">Предложения</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)]"
                >
                  <option value="all">Все статусы</option>
                  <option value="new">Новые</option>
                  <option value="in_progress">В работе</option>
                  <option value="waiting_customer">Ждут клиента</option>
                  <option value="resolved">Решенные</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-2xs divide-y divide-[var(--border)]">
              {loading ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Загрузка очереди...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Обращений по выбранным фильтрам не найдено
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = t.id === selectedTicketId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => loadTicketDetails(t.id)}
                      className={`p-3.5 hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[var(--surface-secondary)] border-l-2 border-l-[#DC2626]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">
                            {t.ticketNumber}
                          </span>
                          {t.unreadBySupport && (
                            <span className="w-2 h-2 rounded-full bg-[#DC2626]" title="Новый тикет" />
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate mb-1">
                        {t.subject}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span className="truncate max-w-[180px]">{t.authorEmail}</span>
                        <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-secondary)] border border-[var(--border)]">
                          {t.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (7 cols): Selected Ticket Full View & Chat */}
          <div className="lg:col-span-7">
            {selectedTicketId && ticketDetails ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-5">
                {/* Header Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                        {ticketDetails.ticket.ticketNumber}
                      </span>
                      <h2 className="text-base font-semibold text-[var(--text-primary)]">
                        {ticketDetails.ticket.subject}
                      </h2>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1 flex flex-wrap gap-2">
                      <span>Автор: {ticketDetails.ticket.authorName} ({ticketDetails.ticket.authorEmail})</span>
                      <span>•</span>
                      <span>Тип: {ticketDetails.ticket.type}</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Статус:</span>
                    <select
                      value={ticketDetails.ticket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="px-2.5 py-1 text-xs font-medium bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)]"
                    >
                      <option value="new">Новое</option>
                      <option value="in_progress">В работе</option>
                      <option value="waiting_customer">Ждет ответа клиента</option>
                      <option value="resolved">Решено</option>
                      <option value="closed">Закрыто</option>
                    </select>
                  </div>
                </div>

                {/* Messages & Notes Thread */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {ticketDetails.messages.map((m) => {
                    const isStaff = m.senderRole === 'support';
                    const isNote = m.isInternalNote;

                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-[6px] text-xs border ${
                          isNote
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50'
                            : isStaff
                            ? 'bg-[#FEF2F2]/50 dark:bg-[rgba(220,38,38,0.06)] border-[#DC2626]/20'
                            : 'bg-[var(--surface-secondary)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {m.senderName || m.senderEmail}
                            </span>
                            {isNote ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-medium">
                                Внутренняя заметка
                              </span>
                            ) : isStaff ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#DC2626] text-white font-medium">
                                Поддержка
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                                Клиент
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            {new Date(m.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="whitespace-pre-wrap text-[var(--text-primary)] leading-relaxed">
                          {m.text}
                        </div>

                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex flex-wrap gap-2">
                            {m.attachments.map((att, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)]"
                              >
                                <Paperclip className="w-3 h-3" />
                                {att.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reply / Internal Note Form */}
                <form onSubmit={handleSendStaffReply} className="pt-4 border-t border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {isInternalNote ? 'Добавить внутреннюю заметку (клиент не увидит)' : 'Ответить клиенту'}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-[var(--border)] text-amber-600 focus:ring-amber-500"
                      />
                      <span>Внутренняя заметка</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Заметка для команды (например: проверил логи, баг в calendar callback)...'
                        : 'Текст ответа клиенту...'
                    }
                    className="w-full px-3 py-2 text-xs bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:border-[#DC2626]"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className={`px-4 py-2 rounded-[6px] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isInternalNote ? 'Сохранить заметку' : 'Отправить клиенту'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-12 text-center text-xs text-[var(--text-muted)] shadow-2xs">
                Выберите обращение из левого списка для просмотра переписки и ответа
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
