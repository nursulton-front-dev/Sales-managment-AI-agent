'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { DataState } from '@/components/ui/DataState';
import { messageText } from '@/lib/message-text';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Search,
  Send,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

interface Conversation {
  id: string;
  workspaceId: string;
  agentId: string | null;
  clientName: string;
  clientPhone: string;
  channel: string;
  status: 'active' | 'human_takeover' | 'closed';
  lastMessageText: string;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  sender: 'client' | 'agent' | 'human';
  text: string;
  tokensCost: number;
  createdAt: string;
}

export default function ConversationsPage() {
  const { user, showToast } = useApp();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'human_takeover'>('ALL');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить диалоги');
      setLoadError(null);
      if (data.success) {
        setConversations(data.conversations || []);
        setActiveConvId((current) => {
          if (current && data.conversations.some((conversation: Conversation) => conversation.id === current)) return current;
          const requested = new URLSearchParams(window.location.search).get('conversation');
          return data.conversations.find((conversation: Conversation) => conversation.id === requested)?.id || data.conversations[0]?.id || null;
        });
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
    void loadConversations();
    const timer = setInterval(() => { if (!document.hidden) void loadConversations(); }, 5000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    const controller = new AbortController();
    // A new selection clears stale messages before starting its request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]); setMessagesLoading(true); setMessageError(null);
    const refresh = () => fetch(`/api/conversations/${activeConvId}`, { signal: controller.signal }).then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить сообщения');
      if (!controller.signal.aborted) {
        setMessages((current) => [...new Map([...current, ...(data.messages || [])].map((message: Message) => [message.id, message])).values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        setMessageError(null);
        setConversations((current) => current.map((conversation) => conversation.id === activeConvId ? { ...conversation, status: data.conversation.status } : conversation));
      }
    }).catch((error) => { if (!controller.signal.aborted) setMessageError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setMessagesLoading(false); });
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 4000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [activeConvId]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Toggle Human Takeover
  const handleToggleHumanTakeover = async () => {
    if (!activeConversation || toggling) return;
    setToggling(true);
    const newStatus = activeConversation.status === 'active' ? 'human_takeover' : 'active';
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения');
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      showToast('Не удалось изменить режим ответа', err instanceof Error ? err.message : 'Ошибка сети', 'error');
    } finally { setToggling(false); }
  };

  // Send human message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, sender: 'human' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось отправить сообщение');
      if (data.success && data.message) {
        setInputText('');
        setMessages((prev) => [...prev, data.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, status: 'human_takeover', lastMessageText: textToSend, lastMessageAt: data.message.createdAt }
              : c
          )
        );
      }
    } catch (err) {
      showToast('Сообщение не отправлено', err instanceof Error ? err.message : 'Ошибка сети', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientPhone.includes(searchQuery) ||
      (c.lastMessageText || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 text-left">
      <PageHeader
        title="Диалоги"
        description="Переписка с клиентами и возможность ручного перехвата диалога"
        badge={
          <Badge variant="info">
            {conversations.length} {conversations.length === 1 ? 'диалог' : 'диалогов'}
          </Badge>
        }
      />

      {loadError ? <DataState error={loadError} retry={loadConversations} /> : isLoading ? <DataState loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[420px]">
          {/* Left Column: Conversations List */}
          <div
            className={`md:col-span-4 lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] flex flex-col overflow-hidden ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search and filters */}
            <div className="p-3 border-b border-[var(--border)] space-y-2 bg-[var(--surface-secondary)]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3 sm:top-2.5" />
                <input
                  type="text"
                  aria-label="Поиск диалогов" placeholder="Поиск по имени, номеру..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-[34px] text-base sm:text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'ALL'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)] border border-[var(--border)]'
                  }`}
                >
                  Все ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'active'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)] border border-[var(--border)]'
                  }`}
                >
                  Авто-ИИ
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('human_takeover')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'human_takeover'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--border)] border border-[var(--border)]'
                  }`}
                >
                  Ручной ответ
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  {conversations.length ? 'По заданным фильтрам диалогов не найдено' : 'Диалогов пока нет. Подключите канал общения.'}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const isTakeover = conv.status === 'human_takeover';

                  return (
                    <button type="button" aria-pressed={isSelected}
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileView('chat');
                      }}
                      className={`w-full p-3 sm:p-3.5 transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[var(--accent-soft)] border-l-3 border-[var(--accent)]'
                          : 'hover:bg-[var(--surface-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                          {conv.clientName}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] truncate mb-1.5">
                        {messageText(conv.lastMessageText || 'Нет сообщений')}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)] font-medium">
                          {conv.channel === 'WebWidget' ? 'Сайт' : conv.channel}
                        </span>

                        {isTakeover ? (
                          <span className="text-[10px] bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                            Ручной ответ
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-border)] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                            ИИ на связи
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation Chat Thread */}
          <div
            className={`md:col-span-8 lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] flex flex-col overflow-hidden ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Top Header with Client details & Takeover Toggle */}
                <div className="p-3.5 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-secondary)] shrink-0">
                  <div className="flex items-center gap-2.5">
                    {/* Mobile Back Button to list */}
                    <button
                      type="button"
                      aria-label="Вернуться к списку диалогов" onClick={() => setMobileView('list')}
                      className="md:hidden w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold flex items-center justify-center text-xs shrink-0">
                      {activeConversation.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                          {activeConversation.clientName}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {activeConversation.clientPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                        <span>Канал: <strong>{activeConversation.channel === 'WebWidget' ? 'Сайт' : activeConversation.channel}</strong></span>
                        <span>·</span>
                        <span>
                          {activeConversation.status === 'closed' ? 'Диалог закрыт' : activeConversation.status === 'active' ? 'Отвечает ИИ' : 'Отвечает оператор'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Human Takeover Button */}
                  <div>
                    {activeConversation.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleHumanTakeover} disabled={toggling}
                        className="text-[var(--warning-text)] border-[var(--warning-border)] hover:bg-[var(--warning-bg)]"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                        <span>Пауза ИИ / Ответить вручную</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleHumanTakeover} disabled={toggling}
                        className="text-[var(--success-text)] border-[var(--success-border)] hover:bg-[var(--success-bg)]"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span>Вернуть управление ИИ</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Notice Banner if Human Takeover */}
                {activeConversation.status === 'human_takeover' && (
                  <div className="p-2.5 px-4 bg-[var(--warning-bg)] border-b border-[var(--warning-border)] text-[var(--warning-text)] text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                      <span>ИИ-автоответчик на паузе. Сообщения отправляются оператором без списания токенов (0 токенов).</span>
                    </div>
                  </div>
                )}

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--background)]">
                  {messagesLoading || messageError ? <DataState loading={messagesLoading} error={messageError} /> : messages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[var(--text-muted)]">
                      Диалог открыт. Сообщений пока нет.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isClient = m.sender === 'client';
                      const isHuman = m.sender === 'human';

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-0.5 px-1">
                            <span>
                              {isClient
                                ? activeConversation.clientName
                                : isHuman
                                ? `${user?.name || 'Оператор'} (Вручную)`
                                : 'ИИ-сотрудник'}
                            </span>
                            <span>·</span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[80%] p-3 rounded-[8px] text-xs sm:text-sm leading-relaxed shadow-2xs ${
                              isClient
                                ? 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]'
                                : isHuman
                                ? 'bg-amber-600 text-white'
                                : 'bg-[var(--accent)] text-[var(--accent-text)]'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{messageText(m.text)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Area */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    aria-label="Ответ клиенту" maxLength={4000} value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeConversation.status === 'human_takeover'
                        ? 'Напишите ответ клиенту вручную...'
                        : 'Ответить как оператор (автоматически включит ручной режим)...'
                    }
                    className="min-w-0 flex-1 px-3 py-2 min-h-[44px] sm:min-h-[40px] text-base sm:text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                  />
                  <Button type="submit" size="sm" isLoading={isSending} disabled={!inputText.trim() || messagesLoading || Boolean(messageError) || activeConversation.status === 'closed'}>
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[var(--text-muted)]">
                <div><MessageSquare size={48} className="mx-auto mb-5" /><h2 className="text-lg font-semibold text-[var(--text-primary)]">Здесь будут сообщения клиентов</h2><p className="text-sm mt-3">{conversations.length ? 'Выберите диалог из списка слева.' : 'Подключите канал, чтобы начать работу.'}</p>{!conversations.length && <Link href="/dashboard/integrations" className="inline-flex mt-5 text-sm text-[var(--accent-link)]">Подключить канал →</Link>}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
