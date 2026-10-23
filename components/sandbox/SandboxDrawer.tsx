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

  // Initialize greeting
  useEffect(() => {
    if (isSandboxOpen && currentAgent) {
      initChat(currentAgent);
    }
  }, [isSandboxOpen, selectedAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const initChat = (agent = currentAgent) => {
    if (!agent) return;
    let initialGreeting = `Здравствуйте! Я виртуальный координатор ${agent.name}. Чем я могу помочь вам сегодня?`;
    if (agent.nicheId === 'courses' || agent.niche === 'education') {
      initialGreeting = `Здравствуйте! Я онлайн-консультант центра ${agent.name}. Хотите узнать направления обучения, стоимость или записаться на пробное занятие?`;
    } else if (agent.nicheId === 'clinic' || agent.niche === 'clinic') {
      initialGreeting = `Добрый день! Медицинский центр ${agent.name} на связи. Подскажите, какой специалист или консультация вас интересует?`;
    } else if (agent.nicheId === 'beauty' || agent.niche === 'salon') {
      initialGreeting = `Приветствуем! Салон ${agent.name} на связи. Хотите уточнить свободные окна для записи к мастеру?`;
    } else if (agent.nicheId === 'ecommerce' || agent.niche === 'ecommerce') {
      initialGreeting = `Здравствуйте! Магазин ${agent.name} рад помочь. Какой товар вы ищете? Подскажу наличие и доставку.`;
    }

    setMessages([
      {
        id: 'msg-init',
        sender: 'bot',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
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
        showToast('Запись распознана', 'Клиент запросил бронь слота', 'success');
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
    'Сколько стоит обучение?',
    'Какие направления у вас есть?',
    'Хочу записаться на завтра на 15:00',
    'Где вы находитесь?',
  ];

  if (!isSandboxOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full sm:w-[440px] max-w-full h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col text-[var(--text-primary)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                Песочница тестирования
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Проверка логики квалификации и ответов ИИ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {agents.length > 0 && (
              <button
                onClick={() => initChat()}
                title="Очистить и перезапустить диалог"
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeSandbox}
              aria-label="Закрыть песочницу"
              className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Agent Selector or Empty State */}
        {agents.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">У вас пока нет ИИ-сотрудников</h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                Создайте первого сотрудника для вашей ниши, чтобы протестировать его квалификацию и сценарии записи.
              </p>
            </div>
            <Link href="/dashboard/agents/new" onClick={closeSandbox}>
              <Button size="sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Создать сотрудника</span>
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Agent Dropdown Selector */}
            <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex-1">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-2.5 py-1.5 min-h-[38px] text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] cursor-pointer"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[var(--surface)] text-[var(--text-primary)]">
                      {a.name} ({a.niche || 'Сотрудник'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Token balance indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-xs font-mono shrink-0">
                <span className="text-[11px] text-[var(--text-muted)] font-sans">Баланс:</span>
                <span className="font-semibold text-[var(--text-primary)]">{localBalance} ток.</span>
                {lastDeducted && (
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    (-{lastDeducted})
                  </span>
                )}
              </div>
            </div>

            {/* Sandbox Rules Notice */}
            <div className="px-4 py-2 bg-[var(--accent-soft)] border-b border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--accent-soft-text)] shrink-0">
              <span>За реальный ответ списывается 1 токен. Записи в боевой календарь не создаются.</span>
            </div>

            {/* Messages Area */}
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

            {/* Quick Prompt Chips */}
            <div className="p-2 bg-[var(--surface)] border-t border-[var(--border)] flex flex-nowrap gap-1.5 overflow-x-auto shrink-0">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] shrink-0 bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

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
                placeholder="Задайте вопрос как потенциальный клиент..."
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-3 py-2 min-h-[40px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)]"
              />
              <Button type="submit" size="sm" isLoading={isTyping} disabled={!inputText.trim()}>
                <Send className="w-3.5 h-3.5" />
                <span>Отправить</span>
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
