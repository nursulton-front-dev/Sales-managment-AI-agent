'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  MessageSquare,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Paperclip,
  X,
  FileText,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Plus,
  Send,
  HelpCircle,
  ExternalLink,
  CreditCard,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  // Form State: 3 types as per 09-support.png: Вопрос, Ошибка, Предложение
  const [activeType, setActiveType] = useState<'question' | 'bug' | 'suggestion'>('question');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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

  const loadTicketDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/support/tickets/${id}`);
      const data = await res.json();
      if (data.success) {
        setTicketDetails({ ticket: data.ticket, messages: data.messages });
        setSelectedTicketId(id);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Заполните поля', 'Укажите тему и текст сообщения', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          subject: subject.trim(),
          description: message.trim(),
          attachments: attachmentName.trim()
            ? [{ name: attachmentName.trim(), url: '#' }]
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        showToast('Обращение отправлено', `Присвоен номер ${data.ticket.ticketNumber}`, 'success');
        setSubject('');
        setMessage('');
        setAttachmentName('');
        await loadTickets();
        loadTicketDetails(data.ticket.id);
      } else {
        showToast('Ошибка', data.error || 'Не удалось отправить обращение', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой отправки', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          text: replyText.trim(),
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

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Поддержка и предложения
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Поможем разобраться с работой Chorla AI.
        </p>
      </div>

      {/* Main Grid: Left Column Form (7-8 cols) & Right Column FAQ Guide (4-5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Новое обращение */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Новое обращение
            </h2>

            {/* 3 Type Selector Cards according to 09-support.png */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Вопрос */}
              <button
                type="button"
                onClick={() => setActiveType('question')}
                className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeType === 'question'
                    ? 'border-[var(--accent)] bg-red-50/40 dark:bg-red-950/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40 text-[var(--accent)] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  </div>
                  <span className="font-bold text-xs text-[var(--text-primary)]">Вопрос</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  Нужна помощь или консультация
                </p>
              </button>

              {/* 2. Ошибка */}
              <button
                type="button"
                onClick={() => setActiveType('bug')}
                className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeType === 'bug'
                    ? 'border-[var(--accent)] bg-red-50/40 dark:bg-red-950/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <span className="font-bold text-xs text-[var(--text-primary)]">Ошибка</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  Что-то не работает или работает неверно
                </p>
              </button>

              {/* 3. Предложение */}
              <button
                type="button"
                onClick={() => setActiveType('suggestion')}
                className={`p-3.5 rounded-[6px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  activeType === 'suggestion'
                    ? 'border-[var(--accent)] bg-red-50/40 dark:bg-red-950/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--surface-secondary)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Lightbulb className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </div>
                  <span className="font-bold text-xs text-[var(--text-primary)]">Предложение</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  Идея по улучшению Chorla AI
                </p>
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Тема
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Коротко опишите вопрос"
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Сообщение
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Расскажите, что произошло и какой результат вы ожидали"
                  className="w-full p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt('Введите имя прикрепляемого файла (например: error.png):');
                      if (name) setAttachmentName(name);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--text-primary)] hover:underline cursor-pointer font-medium"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{attachmentName ? `Прикреплено: ${attachmentName}` : 'Прикрепить файл'}</span>
                  </button>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Скриншот поможет быстрее разобраться
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-6 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {submitting ? 'Отправка...' : 'Отправить обращение'}
                </button>
              </div>
            </form>
          </div>

          {/* Мои обращения */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Мои обращения
            </h3>

            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[8px]">
                Загрузка обращений...
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-8 text-center text-xs text-[var(--text-secondary)]">
                У вас пока нет отправленных обращений.
              </div>
            ) : (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] divide-y divide-[var(--border)] shadow-2xs overflow-hidden">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => loadTicketDetails(t.id)}
                    className="p-4 hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">{t.ticketNumber}</span>
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">{t.subject}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                        <span>{new Date(t.createdAt).toLocaleDateString('ru-RU')}</span>
                        <span>·</span>
                        <span className="capitalize">{t.type === 'question' ? 'Вопрос' : t.type === 'bug' ? 'Ошибка' : 'Предложение'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border)]">
                        {t.status === 'resolved' ? 'Решено' : 'В работе'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Перед обращением (4 cols) according to 09-support.png */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Перед обращением
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Возможно, ответ уже есть в этих разделах.
            </p>

            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {/* Item 1 */}
              <Link
                href="/dashboard/integrations"
                className="py-3 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <ExternalLink className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Подключение каналов
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                      Как подключить Telegram, Instagram и WhatsApp к Chorla AI
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Item 2 */}
              <Link
                href="/dashboard/billing"
                className="py-3 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <CreditCard className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Оплата и токены
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                      Как пополнить баланс и управлять токенами
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Item 3 */}
              <Link
                href="/dashboard/agents"
                className="py-3 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <Settings className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Настройка сотрудника
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                      Как создать и настроить ИИ-сотрудника
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Security Notice according to 09-support.png */}
          <div className="p-4 rounded-[8px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <span>ⓘ</span>
              <span>Не отправляйте пароли и API-ключи.</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              В целях безопасности не указывайте конфиденциальные данные в обращении.
            </p>
          </div>
        </div>
      </div>

      {/* Ticket Details View Modal if selected */}
      {selectedTicketId && ticketDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--border)] shrink-0">
              <div>
                <span className="font-mono text-xs text-[var(--text-muted)] font-bold">
                  {ticketDetails.ticket.ticketNumber}
                </span>
                <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  {ticketDetails.ticket.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(null);
                  setTicketDetails(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              <div className="p-3 bg-[var(--surface-secondary)] rounded-[6px] text-xs space-y-1">
                <span className="font-semibold text-[var(--text-primary)]">Описание:</span>
                <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{ticketDetails.ticket.description}</p>
              </div>

              {ticketDetails.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-[6px] text-xs ${
                    m.senderRole === 'support'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50'
                      : 'bg-[var(--surface)] border border-[var(--border)]'
                  }`}
                >
                  <div className="font-bold text-[var(--text-primary)] mb-1">
                    {m.senderRole === 'support' ? 'Служба заботы Chorla AI' : 'Вы'}
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendReply} className="pt-3 border-t border-[var(--border)] flex gap-2 shrink-0">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Напишите ответ..."
                className="flex-1 px-3 py-2 text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)] focus:outline-none"
              />
              <Button type="submit" size="sm" isLoading={sendingReply} disabled={!replyText.trim()}>
                <Send className="w-3.5 h-3.5" />
                <span>Ответить</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
