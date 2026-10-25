'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Search,
  Send,
  PauseCircle,
  PlayCircle,
  Clock,
  ShieldAlert,
  ArrowLeft,
  SlidersHorizontal,
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
  const [tabFilter, setTabFilter] = useState<'all' | 'my' | 'unanswered'>('all');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'Telegram' | 'Instagram' | 'WhatsApp'>('all');
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
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.clientName.toLowerCase().includes(q) ||
      c.clientPhone.includes(q) ||
      (c.lastMessageText || '').toLowerCase().includes(q);

    const matchesChannel = selectedChannel === 'all' || c.channel.toLowerCase() === selectedChannel.toLowerCase();
    const matchesTab =
      tabFilter === 'all'
        ? true
        : tabFilter === 'my'
        ? c.status === 'human_takeover'
        : c.status === 'active';

    return matchesSearch && matchesChannel && matchesTab;
  });

  return (
    <div className="space-y-4 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            Диалоги
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Сообщения из всех каналов в одном месте.
          </p>
        </div>

        <Link
          href="/dashboard/integrations"
          className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors self-start sm:self-auto"
        >
          Подключить канал
        </Link>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[8px]">
          Загрузка диалогов...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[520px]">
          {/* Left Column: Conversations List */}
          <div
            className={`md:col-span-5 lg:col-span-4 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] flex flex-col overflow-hidden ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search and filters */}
            <div className="p-3 border-b border-[var(--border)] space-y-3 bg-[var(--surface)]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Поиск диалогов"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[var(--border)] rounded-[6px] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Фильтры</span>
                </button>
              </div>

              {/* Tabs: Все, Мои, Без ответа */}
              <div className="flex items-center gap-4 text-xs font-semibold border-b border-[var(--border)] -mb-1 pb-1">
                <button
                  type="button"
                  onClick={() => setTabFilter('all')}
                  className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                    tabFilter === 'all'
                      ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Все <span className="text-[11px] font-normal">{conversations.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('my')}
                  className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                    tabFilter === 'my'
                      ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Мои <span className="text-[11px] font-normal">{conversations.filter(c => c.status === 'human_takeover').length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('unanswered')}
                  className={`pb-1 cursor-pointer transition-colors border-b-2 ${
                    tabFilter === 'unanswered'
                      ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Без ответа <span className="text-[11px] font-normal">{conversations.filter(c => c.status === 'active').length}</span>
                </button>
              </div>

              {/* Channels filter pills */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedChannel(selectedChannel === 'Telegram' ? 'all' : 'Telegram')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium border cursor-pointer transition-colors ${
                    selectedChannel === 'Telegram'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <Image src="/integrations/telegram.svg" alt="Telegram" width={14} height={14} />
                  <span>Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel(selectedChannel === 'Instagram' ? 'all' : 'Instagram')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium border cursor-pointer transition-colors ${
                    selectedChannel === 'Instagram'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <Image src="/integrations/instagram.svg" alt="Instagram" width={14} height={14} />
                  <span>Instagram</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel(selectedChannel === 'WhatsApp' ? 'all' : 'WhatsApp')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium border cursor-pointer transition-colors ${
                    selectedChannel === 'WhatsApp'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <Image src="/integrations/whatsapp.svg" alt="WhatsApp" width={14} height={14} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">Диалогов пока нет</div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto leading-relaxed">
                      Подключите каналы, чтобы начать получать сообщения от клиентов.
                    </p>
                  </div>
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
                          ? 'bg-[var(--accent-soft)] border-l-2 border-[var(--accent)]'
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
            className={`md:col-span-7 lg:col-span-8 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] flex flex-col overflow-hidden ${
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
                      <span>ИИ-автоответчик на паузе. Сообщения отправляются оператором без списания токенов.</span>
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--surface)]">
                <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Здесь будут сообщения клиентов
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
                  Подключите Telegram, Instagram или WhatsApp, чтобы начать работу.
                </p>
                <Link
                  href="/dashboard/integrations"
                  className="inline-flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-6 py-2.5 rounded-[6px] transition-colors shadow-2xs"
                >
                  Подключить канал
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
