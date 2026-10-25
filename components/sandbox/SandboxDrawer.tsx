'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  X,
  Send,
  Bot,
  RotateCcw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calendar,
  BookOpen,
  Info,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  tokensCost?: number;
  isBooking?: boolean;
  timestamp: string;
  providerInfo?: string;
}

export function SandboxDrawer() {
  const {
    isSandboxOpen,
    closeSandbox,
    sandboxAgent,
    agents,
    tokenBalance,
    showToast,
  } = useApp();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastDeducted, setLastDeducted] = useState<number | null>(null);
  const [localBalance, setLocalBalance] = useState(tokenBalance);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected agent
  useEffect(() => {
    if (sandboxAgent?.id) {
      setSelectedAgentId(sandboxAgent.id);
    } else if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [sandboxAgent, agents]);

  useEffect(() => {
    setLocalBalance(tokenBalance);
  }, [tokenBalance]);

  const currentAgent = agents.find((a) => a.id === selectedAgentId) || sandboxAgent || agents[0];

  // Initialize chat
  useEffect(() => {
    if (isSandboxOpen && currentAgent) {
      initChat(currentAgent);
    }
  }, [isSandboxOpen, selectedAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const initChat = (agent = currentAgent) => {
    // Start with empty messages or greeting as per 11-sandbox.png
    setMessages([]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isTyping) return;

    if (localBalance <= 0) {
      showToast('Недостаточно токенов', 'Пополните баланс для тестирования ответов', 'error');
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentAgent?.id,
          message: text,
          isSandbox: true,
          history: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации ответа');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Извините, не удалось сформировать ответ.',
        tokensCost: data.tokensCost || 1,
        isBooking: data.isBooking,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerInfo: data.provider ? `${data.provider.toUpperCase()} (${data.durationMs}ms)` : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Deduct 1 token locally
      const cost = data.tokensCost || 1;
      setLastDeducted(cost);
      setLocalBalance((prev) => Math.max(0, prev - cost));
      setTimeout(() => setLastDeducted(null), 2500);

      if (data.isBooking) {
        showToast('Запись распознана', 'Клиент запросил бронь слота (тестовый режим)', 'success');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ Ошибка: ${err.message || 'Сбой запроса к AI'}. Проверьте соединение или наличие ключей.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    'Какие услуги вы предлагаете?',
    'Сколько стоит продвижение?',
    'Как связаться с менеджером?',
  ];

  if (!isSandboxOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      {/* 560-640px width on desktop, 100% full-screen on mobile */}
      <div className="w-full sm:w-[600px] max-w-full h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col text-[var(--text-primary)]">
        {/* Top Bar with Agent Selector and 'Тестовый диалог' badge */}
        <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--surface)]">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[6px] pl-8 pr-7 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer truncate appearance-none"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.niche || 'Сотрудник'}
                  </option>
                ))}
              </select>
              <div className="absolute left-2.5 top-2 pointer-events-none text-[var(--text-muted)]">
                <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.75">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            <span className="inline-flex items-center px-2 py-1 rounded-[6px] text-xs font-medium border border-[var(--accent)] text-[var(--accent)]">
              Тестовый диалог
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => initChat()}
              title="Перезапустить диалог"
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeSandbox}
              aria-label="Закрыть песочницу"
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warning Callout according to 11-sandbox.png */}
        <div className="px-4 py-2.5 bg-[var(--surface-secondary)] border-b border-[var(--border)] flex items-center gap-2 text-xs text-[var(--text-secondary)] shrink-0">
          <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <span>Сообщения не отправляются клиентам. Записи в календаре не создаются.</span>
        </div>

        {/* Empty State or Active Conversation stream */}
        {messages.length === 0 ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            {/* Center Chat Bubble Icon */}
            <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="1.75">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Проверьте ответы сотрудника
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Задайте вопрос от лица клиента.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="space-y-2 w-full max-w-sm">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left p-3 rounded-[6px] border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="w-full max-w-sm pt-4 border-t border-[var(--border)]">
              {/* Knowledge Base Callout */}
              <div className="p-4 rounded-[8px] bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-primary)]">
                  <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                  <span>Сначала добавьте прайс и услуги в базу знаний.</span>
                </div>
                <Link
                  href="/dashboard/agents/new"
                  onClick={closeSandbox}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors bg-[var(--surface)]"
                >
                  Открыть базу знаний
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--background)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-[8px] px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                      : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>

                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[var(--text-muted)]">
                  <span>{msg.timestamp}</span>
                  {msg.tokensCost && (
                    <span className="font-medium text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border)] px-1.5 py-0.2 rounded font-mono">
                      -{msg.tokensCost} ток.
                    </span>
                  )}
                  {msg.providerInfo && (
                    <span className="text-[9px] text-[var(--text-muted)] font-mono">
                      {msg.providerInfo}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-2">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] px-3.5 py-2 shadow-2xs flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                  <Bot className="w-3.5 h-3.5 text-[var(--accent)] animate-pulse" />
                  <span>ИИ-сотрудник формирует ответ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-3 py-2 min-h-[40px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="w-10 h-10 rounded-[6px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
