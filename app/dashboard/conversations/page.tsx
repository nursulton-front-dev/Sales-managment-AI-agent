'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Search,
  User,
  Bot,
  Send,
  PauseCircle,
  PlayCircle,
  Clock,
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
  const { user } = useApp();
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
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !activeConvId) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeConvId}`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    fetchMessages();
  }, [activeConvId]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Toggle Human Takeover
  const handleToggleHumanTakeover = async () => {
    if (!activeConversation) return;
    const newStatus = activeConversation.status === 'active' ? 'human_takeover' : 'active';
    try {
      const res = await fetch(`/api/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
        );
      }
    } catch (err) {
      console.error('Failed to update conversation status:', err);
    }
  };

  // Send human message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, sender: 'human' }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? { ...c, lastMessageText: textToSend, lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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

      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[8px]">
          Загрузка диалогов...
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Пока нет ни одного диалога"
          description="Когда клиенты напишут вашему Telegram-боту, вся история переписки появится здесь."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
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
                  placeholder="Поиск по имени, номеру..."
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
                  По заданным фильтрам диалогов не найдено
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const isTakeover = conv.status === 'human_takeover';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileView('chat');
                      }}
                      className={`p-3 sm:p-3.5 transition-colors cursor-pointer text-left ${
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
                        {conv.lastMessageText || 'Нет сообщений'}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[var(--surface-secondary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)] font-medium">
                          {conv.channel}
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
                    </div>
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
                      onClick={() => setMobileView('list')}
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
                        <span>Канал: <strong>{activeConversation.channel}</strong></span>
                        <span>·</span>
                        <span>
                          {activeConversation.status === 'active' ? 'ИИ автоответ' : 'Оператор на связи'}
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
                        onClick={handleToggleHumanTakeover}
                        className="text-[var(--warning-text)] border-[var(--warning-border)] hover:bg-[var(--warning-bg)]"
                      >
                        <PauseCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                        <span>Пауза ИИ / Ответить вручную</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleHumanTakeover}
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
                  {messages.length === 0 ? (
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
                            <p className="whitespace-pre-wrap">{m.text}</p>
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
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeConversation.status === 'human_takeover'
                        ? 'Напишите ответ клиенту вручную...'
                        : 'Ответить как оператор (автоматически включит ручной режим)...'
                    }
                    className="flex-1 px-3 py-2 min-h-[44px] sm:min-h-[40px] text-base sm:text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                  />
                  <Button type="submit" size="sm" isLoading={isSending} disabled={!inputText.trim()}>
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[var(--text-muted)]">
                Выберите диалог из списка слева для просмотра
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
