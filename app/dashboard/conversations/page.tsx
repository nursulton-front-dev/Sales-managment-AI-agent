'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
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
  ArrowRight,
  Headphones,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  Bot,
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
          if (
            current &&
            data.conversations.some(
              (conversation: Conversation) => conversation.id === current
            )
          ) {
            return current;
          }
          const requested = new URLSearchParams(window.location.search).get('conversation');
          return (
            data.conversations.find(
              (conversation: Conversation) => conversation.id === requested
            )?.id ||
            data.conversations[0]?.id ||
            null
          );
        });
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    const timer = setInterval(() => {
      if (!document.hidden) void loadConversations();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    const controller = new AbortController();
    setMessages([]);
    setMessagesLoading(true);
    setMessageError(null);

    const refresh = () =>
      fetch(`/api/conversations/${activeConvId}`, { signal: controller.signal })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || !data.success)
            throw new Error(data.error || 'Не удалось загрузить сообщения');
          if (!controller.signal.aborted) {
            setMessages((current) =>
              [
                ...new Map(
                  [...current, ...(data.messages || [])].map((message: Message) => [
                    message.id,
                    message,
                  ])
                ).values(),
              ].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
            );
            setMessageError(null);
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === activeConvId
                  ? { ...conversation, status: data.conversation.status }
                  : conversation
              )
            );
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setMessageError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setMessagesLoading(false);
        });

    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 4000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [activeConvId]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Toggle Human Takeover
  const handleToggleHumanTakeover = async () => {
    if (!activeConversation || toggling) return;
    setToggling(true);
    const newStatus =
      activeConversation.status === 'active' ? 'human_takeover' : 'active';
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
        showToast(
          newStatus === 'human_takeover'
            ? 'Режим ручного ответа включен'
            : 'ИИ вернулся к ответам клиенту',
          '',
          'info'
        );
      }
    } catch (err) {
      showToast(
        'Не удалось изменить режим ответа',
        err instanceof Error ? err.message : 'Ошибка сети',
        'error'
      );
    } finally {
      setToggling(false);
    }
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
      if (!res.ok || !data.success)
        throw new Error(data.error || 'Не удалось отправить сообщение');
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputText('');
      }
    } catch (err) {
      showToast(
        'Не удалось отправить сообщение',
        err instanceof Error ? err.message : 'Ошибка сети',
        'error'
      );
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.clientName.toLowerCase().includes(q) ||
      c.clientPhone.toLowerCase().includes(q) ||
      c.lastMessageText.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'active' && c.status === 'active') ||
      (statusFilter === 'human_takeover' && c.status === 'human_takeover');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 text-left">
      {/* Top Header */}
      <PageHeader
        title="Диалоги"
        description="Входящие сообщения клиентов из Telegram, Instagram и виджета сайта."
      />

      <DataState loading={isLoading} error={loadError} retry={loadConversations} />

      {!isLoading && !loadError && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[calc(100vh-230px)] min-h-[550px] max-h-[750px]">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: CONVERSATION LIST (INBOX) */}
          {/* ========================================================================= */}
          <div
            className={`md:col-span-5 lg:col-span-4 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex flex-col overflow-hidden shadow-xs ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search and Filters */}
            <div className="p-3.5 border-b border-[var(--border)] dark:border-[#29374C] space-y-2.5 bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] dark:text-[#AABAD0] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по диалогам..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] rounded-xl text-[var(--text-primary)] dark:text-[#F4F7FB] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface)] dark:bg-[#142137] border border-[var(--border)] dark:border-[#29374C] text-xs">
                {[
                  { id: 'ALL', label: `Все (${conversations.length})` },
                  { id: 'active', label: 'Авто-ИИ' },
                  { id: 'human_takeover', label: 'Ручной' },
                ].map((tabItem) => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        tabItem.id as 'ALL' | 'active' | 'human_takeover'
                      )
                    }
                    className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      statusFilter === tabItem.id
                        ? 'bg-[#FF7277] text-[#0B1220] font-bold shadow-2xs'
                        : 'text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] dark:divide-[#29374C]">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/70 space-y-3">
                  <div className="w-16 h-14 mx-auto flex items-center justify-center">
                    <Image
                      src="/illustrations/gapchi-ai/empty-inbox.png"
                      alt=""
                      width={64}
                      height={50}
                      className="object-contain max-h-14 opacity-80"
                    />
                  </div>
                  <p>
                    {conversations.length
                      ? 'Диалогов по заданным фильтрам не найдено.'
                      : 'Диалогов пока нет. Подключите канал общения в интеграциях.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const isTakeover = conv.status === 'human_takeover';

                  return (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileView('chat');
                      }}
                      className={`w-full p-3.5 transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-red-500/10 dark:bg-[#101B2E] border-l-3 border-[#FF7277]'
                          : 'hover:bg-[var(--surface-secondary)]/50 dark:hover:bg-[#101B2E]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] truncate">
                          {conv.clientName}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 shrink-0 font-mono">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] truncate mb-1.5">
                        {messageText(conv.lastMessageText || 'Нет сообщений')}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[var(--surface-secondary)] dark:bg-[#101B2E] text-[var(--text-secondary)] dark:text-[#AABAD0] px-2 py-0.5 rounded-full border border-[var(--border)] dark:border-[#29374C] font-medium">
                          {conv.channel === 'WebWidget' ? 'Сайт' : conv.channel}
                        </span>

                        {isTakeover ? (
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            Ручной ответ
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
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

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ACTIVE CONVERSATION THREAD */}
          {/* ========================================================================= */}
          <div
            className={`md:col-span-7 lg:col-span-8 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex flex-col overflow-hidden shadow-xs ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-4 border-b border-[var(--border)] dark:border-[#29374C] flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-secondary)]/40 dark:bg-[#101B2E] shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Вернуться к списку диалогов"
                      onClick={() => setMobileView('list')}
                      className="md:hidden size-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] dark:text-[#AABAD0] hover:bg-[var(--border)] cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="size-10 rounded-xl bg-red-500/10 text-[#FF7277] flex items-center justify-center font-bold text-sm shrink-0">
                      {activeConversation.clientName.slice(0, 1).toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB] leading-tight">
                        {activeConversation.clientName}
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] font-mono mt-0.5">
                        {activeConversation.clientPhone} · {activeConversation.channel === 'WebWidget' ? 'Чат на сайте' : activeConversation.channel}
                      </p>
                    </div>
                  </div>

                  {/* Takeover Control */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={
                        activeConversation.status === 'human_takeover'
                          ? 'primary'
                          : 'outline'
                      }
                      isLoading={toggling}
                      onClick={handleToggleHumanTakeover}
                      className="text-xs font-semibold"
                    >
                      {activeConversation.status === 'human_takeover' ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Вернуть ИИ</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Ответить вручную</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Messages List Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                  {messagesLoading ? (
                    <div className="py-12 text-center text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                      Загрузка сообщений…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                      В этой беседе пока нет сохранённых реплик.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isClient = m.sender === 'client';
                      const isHuman = m.sender === 'human';

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${
                            isClient ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                            <span>
                              {isClient
                                ? activeConversation.clientName
                                : isHuman
                                ? 'Оператор'
                                : 'ИИ-агент Gapchi'}
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
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                              isClient
                                ? 'bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB] rounded-tl-xs'
                                : isHuman
                                ? 'bg-amber-500 text-[#0B1220] font-medium rounded-tr-xs'
                                : 'bg-[#FF7277] text-[#0B1220] font-medium rounded-tr-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {messageText(m.text)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Area */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex items-center gap-2.5 shrink-0"
                >
                  <input
                    type="text"
                    aria-label="Ответ клиенту"
                    maxLength={4000}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeConversation.status === 'human_takeover'
                        ? 'Напишите ответ клиенту как оператор...'
                        : 'Ответить вручную (автоматически включит ручной режим)...'
                    }
                    className="min-w-0 flex-1 px-3.5 py-2 text-xs bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)] dark:text-[#F4F7FB]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSending}
                    disabled={
                      !inputText.trim() ||
                      messagesLoading ||
                      Boolean(messageError) ||
                      activeConversation.status === 'closed'
                    }
                    className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить</span>
                  </Button>
                </form>
              </>
            ) : (
              /* Empty state with empty-conversations illustration */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs">
                <div className="w-48 h-36 mx-auto mb-4 flex items-center justify-center">
                  <Image
                    src="/illustrations/gapchi-ai/empty-conversations.png"
                    alt=""
                    width={220}
                    height={150}
                    className="object-contain max-h-36 drop-shadow-md"
                  />
                </div>
                <h3 className="font-bold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Здесь будут сообщения клиентов
                </h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1 max-w-sm">
                  {conversations.length
                    ? 'Выберите диалог из списка слева, чтобы просмотреть переписку и ответить.'
                    : 'Подключите канал связи, чтобы бот начал отвечать клиентам.'}
                </p>
                {!conversations.length && (
                  <Link
                    href="/dashboard/integrations"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs mt-4 shadow-2xs"
                  >
                    <span>Подключить канал</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
