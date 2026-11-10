'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { BrandMascot } from '@/components/ui/BrandMascot';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Paperclip,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Edit3,
  MessageSquare,
  Play,
  Settings2,
  Trash2,
  Plus,
  ShieldAlert,
  Calendar,
  Globe,
  Radio,
} from 'lucide-react';
import { AgentDraft, WizardMessage, WizardNiche } from '@/lib/wizard/types';
import { ARCHETYPES, createInitialDraft } from '@/lib/wizard/archetypes';

interface AgentSetupWizardProps {
  onCancelManual: () => void;
}

export function AgentSetupWizard({ onCancelManual }: AgentSetupWizardProps) {
  const router = useRouter();
  const { workspace, refreshWorkspace, showToast } = useApp();
  const [lang, setLang] = useState<'ru' | 'uz'>('ru');
  const [draft, setDraft] = useState<AgentDraft>(() => createInitialDraft('courses', 'ru'));
  const [activeTab, setActiveTab] = useState<'dialog' | 'sandbox'>('dialog');
  const [mobileView, setMobileView] = useState<'chat' | 'draft'>('chat');

  // Wizard Dialog state
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestedAnswers, setSuggestedAnswers] = useState<string[]>([]);
  const [attachedText, setAttachedText] = useState<string | null>(null);

  // Sandbox state
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; tag?: string }>>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [isSandboxSending, setIsSandboxSending] = useState(false);

  // Finalization state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const sandboxEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing draft from server on mount
  useEffect(() => {
    let mounted = true;
    async function loadDraft() {
      try {
        const res = await fetch('/api/assistant/wizard');
        const data = await res.json();
        if (mounted && data.success && data.draft) {
          setDraft(data.draft);
          const arch = ARCHETYPES[data.draft.nicheTemplate as WizardNiche] || ARCHETYPES.courses;
          setMessages([
            {
              id: 'init_msg',
              role: 'assistant',
              content: lang === 'uz'
                ? `Assalomu alaykum! Men gapcha AI-sozlash ustasiman. Sizga mijozlarga avtomatik javob beruvchi va qabulga yozuvchi raqamli xodim yaratishga yordam beraman.\n\nBirinchi navbatda: biznesingiz yo'nalishi nima va xodimdan asosiy kutayotgan natijangiz qanday?`
                : `Здравствуйте! Я интерактивный ИИ-мастер gapcha AI. Помогу настроить вашего цифрового сотрудника для консультаций, работы с возражениями и записи клиентов.\n\nДля начала расскажите: в какой сфере работает ваш бизнес и какая главная задача у сотрудника?`,
              timestamp: new Date().toISOString(),
              suggestedAnswers: lang === 'uz'
                ? ['Oʻquv markazi (kurslar)', 'Marketing agentligi', 'Xizmatlar koʻrsatish', 'Umumiy savdo']
                : ['Учебный центр (курсы)', 'Маркетинговое агентство', 'Сфера услуг', 'Торговля и B2B'],
            },
          ]);
        }
      } catch {}
    }
    loadDraft();
    return () => { mounted = false; };
  }, [lang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    sandboxEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sandboxMessages, isSandboxSending]);

  // Handle Wizard chat send
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if ((!text && !attachedText) || isSending) return;

    const userMessage: WizardMessage = {
      id: `w_u_${Date.now()}`,
      role: 'user',
      content: text || (lang === 'uz' ? '[Fayl biriktirildi]' : '[Прикреплен файл с прайсом]'),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputVal('');
    setIsSending(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const res = await fetch('/api/assistant/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: text,
          draft,
          history: historyPayload,
          lang,
          attachedText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка диалога настройки');
      }

      setDraft(data.updatedDraft);
      setMessages(prev => [
        ...prev,
        {
          id: `w_a_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          suggestedAnswers: data.suggestedAnswers,
        },
      ]);
      setSuggestedAnswers(data.suggestedAnswers || []);
      setAttachedText(null);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `w_err_${Date.now()}`,
          role: 'assistant',
          content: lang === 'uz' ? `Xatolik: ${err.message}` : `Ошибка: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Handle sandbox send
  const handleSandboxSend = async (textToSend?: string, instruction?: string) => {
    const text = (textToSend || sandboxInput).trim();
    if (!text || isSandboxSending) return;

    setSandboxMessages(prev => [...prev, { role: 'user', content: text }]);
    if (!textToSend) setSandboxInput('');
    setIsSandboxSending(true);

    try {
      const historyPayload = sandboxMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/assistant/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sandbox_chat',
          message: text,
          draft,
          history: historyPayload,
          tuningInstruction: instruction,
          lang,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка тест-драйва');

      setSandboxMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          tag: data.simulatedAction?.details,
        },
      ]);
    } catch (err: any) {
      setSandboxMessages(prev => [
        ...prev,
        { role: 'assistant', content: `[Ошибка]: ${err.message}` },
      ]);
    } finally {
      setIsSandboxSending(false);
    }
  };

  // Handle Finalize & Create Agent
  const handleFinalize = async () => {
    setIsFinalizing(true);
    setFinalError(null);
    try {
      const res = await fetch('/api/assistant/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          draft,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось создать сотрудника');
      }

      await refreshWorkspace();
      showToast('Сотрудник создан', `«${draft.name}» успешно сохранен и готов к работе.`, 'success');
      router.push('/dashboard/agents');
    } catch (err: any) {
      setFinalError(err.message || 'Ошибка создания');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Handle manual draft field updates
  const updateDraftField = <K extends keyof AgentDraft>(field: K, value: AgentDraft[K]) => {
    const updated = { ...draft, [field]: value, updatedAt: new Date().toISOString() };
    setDraft(updated);
    // Silent auto-save to server
    fetch('/api/assistant/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_draft', draft: updated }),
    }).catch(() => {});
  };

  // Handle text/file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'uz' ? 'Fayl hajmi 2 MB dan oshmasligi kerak' : 'Размер файла не должен превышать 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setAttachedText(content);
        showToast(
          lang === 'uz' ? 'Fayl biriktirildi' : 'Файл прикреплен',
          lang === 'uz' ? `${file.name} tahlil uchun tayyor` : `${file.name} готов для анализа мастером`,
          'info'
        );
      }
    };
    reader.readAsText(file);
  };

  const steps = [
    { num: 1, titleRu: 'Бизнес', titleUz: 'Biznes' },
    { num: 2, titleRu: 'Знания', titleUz: 'Bilimlar' },
    { num: 3, titleRu: 'Проверка', titleUz: 'Tekshirish' },
    { num: 4, titleRu: 'Запуск', titleUz: 'Ishga tushirish' },
  ];

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Bar: Stepper & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 dark:bg-red-950/40 text-red-600">
              AI WIZARD
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {lang === 'uz' ? 'AI-sozlash ustasi' : 'ИИ-мастер настройки сотрудника'}
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {lang === 'uz'
              ? 'Xodimni dialog orqali yarating — oʻng tomonda qoralama real vaqtda yangilanadi'
              : 'Создание сценария через интерактивный диалог с живым обновлением карточки'}
          </p>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {steps.map((st) => (
            <div
              key={st.num}
              onClick={() => updateDraftField('currentStep', st.num as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                draft.currentStep === st.num
                  ? 'bg-red-600 text-white shadow-xs'
                  : draft.currentStep > st.num
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              <span>{st.num}.</span>
              <span className="hidden sm:inline">{lang === 'uz' ? st.titleUz : st.titleRu}</span>
            </div>
          ))}
        </div>

        {/* Cancel / Switch to Manual */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'ru' ? 'uz' : 'ru')}
            className="px-2 py-1 text-xs font-semibold rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            {lang.toUpperCase()}
          </button>
          <button
            onClick={onCancelManual}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
          >
            {lang === 'uz' ? 'Qoʻlda toʻldirish' : 'Заполнить вручную'}
          </button>
        </div>
      </div>

      {/* Mobile Toggle Bar */}
      <div className="sm:hidden flex rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 py-1.5 rounded-md text-center transition-all ${
            mobileView === 'chat' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
          }`}
        >
          {lang === 'uz' ? 'Muloqot / Test' : 'Диалог / Тест'}
        </button>
        <button
          onClick={() => setMobileView('draft')}
          className={`flex-1 py-1.5 rounded-md text-center transition-all ${
            mobileView === 'draft' ? 'bg-white dark:bg-zinc-900 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'
          }`}
        >
          {lang === 'uz' ? 'Qoralama' : 'Черновик сотрудника'}
        </button>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[600px]">
        {/* Left Column: Conversational Assistant & Sandbox (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col h-[650px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden ${mobileView === 'draft' ? 'hidden sm:flex' : 'flex'}`}>
          {/* Subheader: Mode tabs */}
          <div className="shrink-0 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('dialog')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'dialog'
                    ? 'bg-white dark:bg-zinc-800 text-red-600 shadow-xs border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <BrandMascot pose="avatar" size={16} className="shrink-0" />
                <span>{lang === 'uz' ? 'Sozlash muloqoti' : 'Диалог с мастером'}</span>
              </button>

              <button
                onClick={() => setActiveTab('sandbox')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'sandbox'
                    ? 'bg-white dark:bg-zinc-800 text-red-600 shadow-xs border border-zinc-200 dark:border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{lang === 'uz' ? 'Test-drayv (Sandbox)' : 'Тест-драйв (Sandbox)'}</span>
              </button>
            </div>

            <div className="text-[11px] text-zinc-400">
              {activeTab === 'dialog' ? (lang === 'uz' ? '1 ta savol / qadam' : '1 вопрос за шаг') : (lang === 'uz' ? 'Xavfsiz simulyatsiya' : 'Безопасная симуляция')}
            </div>
          </div>

          {/* TAB 1: INTERACTIVE DIALOG */}
          {activeTab === 'dialog' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Message scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
                  >
                    {m.role === 'assistant' && (
                      <BrandMascot
                        pose={m.id === 'init_msg' ? 'hello' : 'hint'}
                        size={28}
                        className="mt-0.5 shrink-0"
                      />
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        m.role === 'user'
                          ? 'bg-red-600 text-white rounded-br-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs p-2">
                    <BrandMascot pose="thinking" size={22} className="shrink-0" />
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                    <span>{lang === 'uz' ? 'Usta qoralamani tahlil qilmoqda...' : 'Мастер обновляет параметры...'}</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggested quick chips */}
              {suggestedAnswers.length > 0 && !isSending && (
                <div className="shrink-0 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900 flex flex-wrap gap-1.5">
                  {suggestedAnswers.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-red-400 hover:text-red-600 transition-colors shadow-2xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* File Attachment preview */}
              {attachedText && (
                <div className="shrink-0 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between border-t border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate">{lang === 'uz' ? 'Fayl matni biriktirildi' : 'Материалы прикреплены для анализа'}</span>
                  </div>
                  <button
                    onClick={() => setAttachedText(null)}
                    className="text-amber-700 hover:text-amber-900 dark:hover:text-amber-100 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={lang === 'uz' ? 'Fayl biriktirish (.txt, .md)' : 'Прикрепить файл с прайсом (.txt, .md)'}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={lang === 'uz' ? 'Javobingizni yozing...' : 'Опишите ваши услуги, цены или ответьте на вопрос...'}
                    disabled={isSending}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />

                  <button
                    type="submit"
                    disabled={(!inputVal.trim() && !attachedText) || isSending}
                    className="p-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: SANDBOX TEST-DRIVE */}
          {activeTab === 'sandbox' && (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/40 dark:bg-zinc-900/40">
              <div className="shrink-0 p-3 bg-red-50/60 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between text-xs text-red-900 dark:text-red-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                  <span>{lang === 'uz' ? 'Sinov muloqoti (Sandbox)' : 'Тестовый диалог (Sandbox)'}</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  {lang === 'uz' ? 'Mijozlarga xabar ketmaydi · 0 token' : '0 токенов · Без побочных действий'}
                </span>
              </div>

              {/* Sandbox messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs sm:text-sm">
                {sandboxMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-red-600" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {lang === 'uz' ? 'Xodim bilan suhbatlashib koʻring' : 'Протестируйте ответы будущего сотрудника'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                      {lang === 'uz'
                        ? 'Masalan: «Qanday kurslar bor?», «Narxi qancha?», «Qabulga yozilish mumkinmi?»'
                        : 'Например: «Какие курсы у вас есть?», «Сколько стоит обучение?», «Хочу записаться»'}
                    </p>
                  </div>
                ) : (
                  sandboxMessages.map((sm, i) => (
                    <div key={i} className={`flex flex-col ${sm.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          sm.role === 'user'
                            ? 'bg-zinc-800 text-white rounded-br-xs'
                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">{sm.content}</div>
                        {sm.tag && (
                          <div className="mt-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-700 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{sm.tag}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isSandboxSending && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    <span>{lang === 'uz' ? 'Xodim javob yozmoqda...' : 'Сотрудник формирует ответ...'}</span>
                  </div>
                )}
                <div ref={sandboxEndRef} />
              </div>

              {/* Quick tuning suggestions */}
              <div className="shrink-0 px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-zinc-400 font-medium whitespace-nowrap">
                  {lang === 'uz' ? 'Sozlash:' : 'Коррекция:'}
                </span>
                <button
                  onClick={() => handleSandboxSend('Расскажи о ценах', 'Отвечай максимально кратко и структурированно')}
                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                >
                  ⚡ {lang === 'uz' ? 'Qisqaroq javob' : 'Отвечай короче'}
                </button>
                <button
                  onClick={() => handleSandboxSend('Хочу записаться', 'Сначала вежливо уточни возраст и уровень подготовки')}
                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                >
                  🎯 {lang === 'uz' ? 'Avval yoshini soʻra' : 'Уточни возраст'}
                </button>
                <button
                  onClick={() => handleSandboxSend('Сделайте скидку', 'Вежливо откажи в скидке, объясни ценность программы')}
                  className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                >
                  🛡️ {lang === 'uz' ? 'Chegirma bermaslik' : 'Без скидок'}
                </button>
              </div>

              {/* Sandbox Input */}
              <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSandboxSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    placeholder={lang === 'uz' ? 'Mijoz nomidan xabar yozing...' : 'Напишите реплику от лица клиента...'}
                    disabled={isSandboxSending}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={!sandboxInput.trim() || isSandboxSending}
                    className="p-2.5 rounded-lg bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Structured Live Draft Inspector (5 cols) */}
        <div className={`lg:col-span-5 flex flex-col h-[650px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'}`}>
          <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                {lang === 'uz' ? 'Xodim qoralamasi' : 'Карточка черновика'}
              </h3>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'uz' ? 'Avto-saqlangan' : 'Автосохранение'}</span>
            </span>
          </div>

          {/* Draft Form Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {lang === 'uz' ? 'Xodim nomi' : 'Имя сотрудника'}
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => updateDraftField('name', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Niche & Tone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  {lang === 'uz' ? 'Soha' : 'Отрасль'}
                </label>
                <select
                  value={draft.nicheTemplate}
                  onChange={(e) => updateDraftField('nicheTemplate', e.target.value as WizardNiche)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                >
                  <option value="courses">{lang === 'uz' ? 'Oʻquv markazi' : 'Учебный центр'}</option>
                  <option value="marketing">{lang === 'uz' ? 'Marketing' : 'Маркетинг'}</option>
                  <option value="services">{lang === 'uz' ? 'Xizmatlar' : 'Услуги'}</option>
                  <option value="other">{lang === 'uz' ? 'Umumiy' : 'Универсальный'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  {lang === 'uz' ? 'Muloqot ohangi' : 'Тон общения'}
                </label>
                <select
                  value={draft.tone}
                  onChange={(e) => updateDraftField('tone', e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none"
                >
                  <option value="consultative">{lang === 'uz' ? 'Maslahat beruvchi' : 'Консультативный'}</option>
                  <option value="friendly">{lang === 'uz' ? 'Doʻstona' : 'Дружелюбный'}</option>
                  <option value="professional">{lang === 'uz' ? 'Rasmiy / Ishbilarmon' : 'Деловой'}</option>
                  <option value="persuasive">{lang === 'uz' ? 'Ishontiruvchi' : 'Убедительный'}</option>
                </select>
              </div>
            </div>

            {/* Target Goal */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {lang === 'uz' ? 'Asosiy maqsad' : 'Главная цель'}
              </label>
              <textarea
                rows={2}
                value={draft.targetGoal}
                onChange={(e) => updateDraftField('targetGoal', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Services & Confirmed Pricing */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                {lang === 'uz' ? 'Xizmatlar va narxlar (Pravda bazasi)' : 'Услуги и подтвержденные цены'}
              </label>
              <textarea
                rows={4}
                value={draft.servicesAndPricing}
                onChange={(e) => updateDraftField('servicesAndPricing', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Qualification Questions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {lang === 'uz' ? 'Saralash savollari (1 tadan)' : 'Вопросы квалификации (по одному)'}
                </label>
                <button
                  type="button"
                  onClick={() => updateDraftField('qualificationQuestions', [...draft.qualificationQuestions, ''])}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'uz' ? 'Qoʻshish' : 'Добавить'}</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {draft.qualificationQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-xs w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const next = [...draft.qualificationQuestions];
                        next[idx] = e.target.value;
                        updateDraftField('qualificationQuestions', next);
                      }}
                      className="flex-1 px-2.5 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.qualificationQuestions.filter((_, i) => i !== idx);
                        updateDraftField('qualificationQuestions', next);
                      }}
                      className="text-zinc-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels & Calendar Integration */}
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {lang === 'uz' ? 'Ulanadigan aloqa kanallari' : 'Каналы связи и запись'}
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.channels.includes('telegram')}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...draft.channels, 'telegram' as const]
                        : draft.channels.filter((c) => c !== 'telegram');
                      updateDraftField('channels', next);
                    }}
                    className="rounded text-red-600"
                  />
                  <span>Telegram</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.channels.includes('instagram')}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...draft.channels, 'instagram' as const]
                        : draft.channels.filter((c) => c !== 'instagram');
                      updateDraftField('channels', next);
                    }}
                    className="rounded text-red-600"
                  />
                  <span>Instagram Direct</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.channels.includes('widget')}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...draft.channels, 'widget' as const]
                        : draft.channels.filter((c) => c !== 'widget');
                      updateDraftField('channels', next);
                    }}
                    className="rounded text-red-600"
                  />
                  <span>{lang === 'uz' ? 'Sayt vidjeti' : 'Виджет сайта'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.googleCalendarConnected}
                    onChange={(e) => updateDraftField('googleCalendarConnected', e.target.checked)}
                    className="rounded text-red-600"
                  />
                  <span>Google Calendar</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-2">
            {finalError && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{finalError}</span>
              </div>
            )}

            <button
              onClick={handleFinalize}
              disabled={isFinalizing || !draft.name.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'uz' ? 'Xodim yaratilmoqda...' : 'Создание сотрудника...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'uz' ? 'Xodimni yaratish va saqlash' : 'Создать и запустить сотрудника'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
