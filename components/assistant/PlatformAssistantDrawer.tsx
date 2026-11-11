'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Ticket,
  ExternalLink,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { AssistantMessage, AssistantLanguage, AssistantPendingAction } from '@/lib/assistant/types';
import { BrandMascot } from '@/components/ui/BrandMascot';
import { useApp } from '@/context/AppContext';

interface PlatformAssistantDrawerProps {
  className?: string;
}

export function PlatformAssistantDrawer({ className = '' }: PlatformAssistantDrawerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<AssistantLanguage>('ru');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AssistantPendingAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { locale } = useApp();

  // Load language preference or sync with app locale
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('gapcha_assistant_lang');
      if (savedLang === 'uz' || savedLang === 'ru') {
        setLang(savedLang);
      } else {
        setLang(locale);
      }
    } catch {
      setLang(locale);
    }
  }, [locale]);

  const handleLangChange = (newLang: AssistantLanguage) => {
    setLang(newLang);
    try {
      localStorage.setItem('gapcha_assistant_lang', newLang);
    } catch {}
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg: AssistantMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          lang,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === 'uz' ? 'Xatolik yuz berdi' : 'Ошибка при обращении к помощнику'));
      }

      const assistantMsg: AssistantMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        diagnostics: data.diagnostics,
        pendingAction: data.pendingAction,
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (data.pendingAction) {
        setPendingAction(data.pendingAction);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (actionToConfirm: AssistantPendingAction) => {
    setIsExecutingAction(true);
    setError(null);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_action',
          pendingAction: actionToConfirm,
          lang,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось выполнить действие');
      }

      const updateMsg: AssistantMessage = {
        id: `msg_action_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        actionResult: data.actionResult,
      };

      setMessages(prev => [...prev, updateMsg]);
      setPendingAction(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка выполнения действия');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const formatTextWithLinks = (text: string) => {
    // Regex matches /dashboard/... links
    const parts = text.split(/(\/dashboard[a-zA-Z0-9_\-\/]*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('/dashboard')) {
        return (
          <Link
            key={idx}
            href={part}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-0.5 text-red-600 hover:text-red-700 underline font-medium"
          >
            {part}
            <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </Link>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className={`fixed bottom-5 right-5 z-40 ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          aria-label={lang === 'uz' ? 'Yordam' : 'Помощь'}
          className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <BrandMascot pose="avatar" size={20} className="shrink-0" />
          <span className="font-semibold text-xs sm:text-sm tracking-wide">
            {lang === 'uz' ? 'Yordam' : 'Помощь'}
          </span>
        </button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-drawer-title"
          className="fixed inset-0 z-50 overflow-hidden flex justify-end"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Shell (Right slide on desktop, Fullscreen on mobile) */}
          <div className="relative w-full sm:w-[440px] max-w-full h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col z-10 transition-transform duration-300 animate-in slide-in-from-right">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <BrandMascot pose="avatar" size={32} className="shrink-0" />
                <div>
                  <h3 id="assistant-drawer-title" className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {lang === 'uz' ? 'gapcha AI Yordamchisi' : 'Помощник gapcha AI'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {lang === 'uz' ? 'Kabinetingiz diagnostikasi va yoʻriqnomalar' : 'Поддержка и диагностика кабинета'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-md p-0.5 text-[11px] font-semibold">
                  <button
                    onClick={() => handleLangChange('ru')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${lang === 'ru' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'}`}
                  >
                    RU
                  </button>
                  <button
                    onClick={() => handleLangChange('uz')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${lang === 'uz' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'}`}
                  >
                    UZ
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Закрыть панель помощи"
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Flow Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
              {messages.length === 0 ? (
                <div className="py-6 flex flex-col items-center text-center space-y-4">
                  <div className="flex justify-center">
                    <BrandMascot pose="help" size={56} className="mb-1" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                      {lang === 'uz' ? 'gapcha AI Yordamchisiga xush kelibsiz' : 'Помощник платформы gapcha AI'}
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1">
                      {lang === 'uz'
                        ? 'Kanal integratsiyalari holati, xodim sozlamalari yoki xatolar boʻyicha savolingizni bering.'
                        : 'Задайте вопрос по настройке каналов, сотрудникам, тарифам или диагностике работы кабинета.'}
                    </p>
                  </div>

                  {/* 4 Quick Actions */}
                  <div className="w-full grid grid-cols-1 gap-2 pt-2 text-left">
                    <button
                      onClick={() => handleSend(lang === 'uz' ? 'Kanalni qanday ulayman?' : 'Как подключить канал связи?')}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-all flex items-center justify-between text-zinc-800 dark:text-zinc-200 group"
                    >
                      <span className="font-medium">🔌 {lang === 'uz' ? 'Kanalni ulash' : 'Подключить канал'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => handleSend(lang === 'uz' ? 'AI-xodimni qanday sozlayman?' : 'Как настроить ИИ-сотрудника?')}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-all flex items-center justify-between text-zinc-800 dark:text-zinc-200 group"
                    >
                      <span className="font-medium">🤖 {lang === 'uz' ? 'Xodimni sozlash' : 'Настроить сотрудника'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => handleSend(lang === 'uz' ? 'Kanallar va oxirgi xatolarni tekshir' : 'Проверь статус каналов и последние ошибки')}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-all flex items-center justify-between text-zinc-800 dark:text-zinc-200 group"
                    >
                      <span className="font-medium">🔍 {lang === 'uz' ? 'Xatoni aniqlash' : 'Разобраться с ошибкой'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => handleSend(lang === 'uz' ? 'Qo\'llab-quvvatlash xizmatiga murojaat yaratish' : 'Создать обращение в поддержку')}
                      className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-all flex items-center justify-between text-zinc-800 dark:text-zinc-200 group"
                    >
                      <span className="font-medium">🎫 {lang === 'uz' ? 'Qoʻllab-quvvatlash' : 'Связаться с поддержкой'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}
                  >
                    {msg.role === 'assistant' && (
                      <BrandMascot pose="avatar" size={24} className="mt-1 shrink-0" />
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-red-600 text-white rounded-br-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.role === 'assistant' ? formatTextWithLinks(msg.content) : msg.content}
                      </div>

                      {/* Diagnostic badges snippet */}
                      {msg.diagnostics && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px] space-y-1">
                          <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">
                            {lang === 'uz' ? 'Diagnostika holati' : 'Фактический статус'}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                              TG: {msg.diagnostics.channels?.telegramBusiness?.status === 'connected' ? '✅' : '⚪'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                              IG: {msg.diagnostics.channels?.instagram?.status === 'connected' ? '✅' : '⚪'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                              Google: {msg.diagnostics.calendar?.connected ? '✅' : '⚪'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
                              {msg.diagnostics.quota?.plan.toUpperCase()}: {msg.diagnostics.quota?.tokenBalance} tok.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Ticket Confirmation Card */}
                      {msg.pendingAction && (
                        <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Ticket className="w-4 h-4 text-amber-600" />
                            <span>{msg.pendingAction.title}</span>
                          </div>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300">
                            {msg.pendingAction.description}
                          </p>
                          <div className="pt-1 flex gap-2">
                            <button
                              onClick={() => handleConfirmAction(msg.pendingAction!)}
                              disabled={isExecutingAction}
                              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isExecutingAction ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>{lang === 'uz' ? 'Tasdiqlash va yuborish' : 'Отправить обращение'}</span>
                            </button>
                            <button
                              onClick={() => setPendingAction(null)}
                              disabled={isExecutingAction}
                              className="px-2.5 py-1.5 rounded-md border border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            >
                              {lang === 'uz' ? 'Bekor qilish' : 'Отмена'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Ticket Action Result */}
                      {msg.actionResult && (
                        <div className="mt-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {lang === 'uz' ? 'Murojaat saqlandi:' : 'Номер обращения:'}{' '}
                              <strong>#{msg.actionResult.ticketNumber}</strong>
                            </span>
                          </div>
                          <Link
                            href="/dashboard/support"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-emerald-700 dark:text-emerald-300 underline font-semibold flex items-center gap-0.5"
                          >
                            {lang === 'uz' ? 'Koʻrish' : 'В поддержку'}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs p-2">
                  <BrandMascot pose="thinking" size={20} className="shrink-0" />
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                  <span>{lang === 'uz' ? 'gapcha AI javob tayyorlamoqda...' : 'Помощник анализирует статус...'}</span>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => handleSend()}
                    className="text-red-600 font-semibold underline text-xs ml-2 cursor-pointer"
                  >
                    {lang === 'uz' ? 'Qayta urinish' : 'Повторить'}
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={lang === 'uz' ? 'Savolingizni yozing...' : 'Напишите ваш вопрос...'}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  aria-label={lang === 'uz' ? 'Yuborish' : 'Отправить'}
                  className="p-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-1.5 text-center text-[10px] text-zinc-400">
                {lang === 'uz'
                  ? 'Token sarflanmaydi (0 javob). Maxfiylik kafolatlangan.'
                  : '0 токенов расхода. Помощь и диагностика бесплатны.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
