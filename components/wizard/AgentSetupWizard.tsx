'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { SparrowMascot } from '@/components/ui/SparrowMascot';
import { Button } from '@/components/ui/Button';
import {
  Send,
  Paperclip,
  Check,
  Edit3,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  X,
  Radio,
  FileText,
} from 'lucide-react';
import { AgentDraft, WizardMessage, WizardNiche, WizardTone } from '@/lib/wizard/types';
import { ARCHETYPES } from '@/lib/wizard/archetypes';

interface AgentSetupWizardProps {
  draft: AgentDraft;
  onDraftChange: (updated: AgentDraft) => void;
  onSaveAndLaunch: () => Promise<void>;
  isSaving: boolean;
  onOpenSandbox: () => void;
}

export function AgentSetupWizard({
  draft,
  onDraftChange,
  onSaveAndLaunch,
  isSaving,
  onOpenSandbox,
}: AgentSetupWizardProps) {
  const { locale, t, showToast } = useApp();
  const isUz = locale === 'uz';

  // Mobile tab state: 'dialog' | 'resume'
  const [mobileTab, setMobileTab] = useState<'dialog' | 'resume'>('dialog');

  // Dialogue messages state
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [suggestedAnswers, setSuggestedAnswers] = useState<string[]>([]);

  // Autosave status state
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  // Edit Modal State for fields
  const [editingField, setEditingField] = useState<
    'name' | 'niche' | 'goal' | 'pricing' | 'tone' | null
  >(null);
  const [fieldValue, setFieldValue] = useState('');

  // Refs for auto-scroll and manual edits timestamp protection
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUserEditTimeRef = useRef<number>(0);
  const hasInitializedMessages = useRef<boolean>(false);

  // Initialize first greeting question
  useEffect(() => {
    if (hasInitializedMessages.current) return;
    hasInitializedMessages.current = true;

    setMessages([
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: t.wizard.firstQuestionGreeting,
        timestamp: new Date().toISOString(),
        suggestedAnswers: isUz
          ? [
              'O‘quv markazi / Kurslar',
              'Klinika / Tibbiyot',
              'Go‘zallik saloni',
              'Do‘kon / Chakana savdo',
              'Marketing agentligi',
              'Boshqa xizmatlar',
            ]
          : [
              'Учебный центр / Курсы',
              'Клиника / Медицина',
              'Салон красоты',
              'Магазин / Ритейл',
              'Маркетинговое агентство',
              'Сфера услуг',
            ],
      },
    ]);
    setSuggestedAnswers(
      isUz
        ? [
            'O‘quv markazi / Kurslar',
            'Klinika / Tibbiyot',
            'Go‘zallik saloni',
            'Do‘kon / Chakana savdo',
            'Marketing agentligi',
            'Boshqa xizmatlar',
          ]
        : [
            'Учебный центр / Курсы',
            'Клиника / Медицина',
            'Салон красоты',
            'Магазин / Ритейл',
            'Маркетинговое агентство',
            'Сфера услуг',
          ]
    );
  }, [isUz, t]);

  // Smooth scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Send message to wizard chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isSending) return;

    setSendError(null);
    setInputVal('');

    const userMsg: WizardMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setAutosaveStatus('saving');

    const requestTime = Date.now();

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await fetch('/api/assistant/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: text,
          draft,
          history: historyPayload,
          lang: locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isUz ? 'Server xatosi' : 'Ошибка сервера'));
      }

      // Safeguard: if user edited a field manually while request was in-flight, preserve user's edits
      let mergedDraft: AgentDraft = { ...data.updatedDraft };
      if (lastUserEditTimeRef.current > requestTime) {
        mergedDraft = {
          ...data.updatedDraft,
          name: draft.name,
          targetGoal: draft.targetGoal,
          servicesAndPricing: draft.servicesAndPricing,
          tone: draft.tone,
        };
      }

      onDraftChange(mergedDraft);
      setAutosaveStatus('saved');

      const botMsg: WizardMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        suggestedAnswers: data.suggestedAnswers || [],
      };

      setMessages((prev) => [...prev, botMsg]);
      setSuggestedAnswers(data.suggestedAnswers || []);
    } catch (err: any) {
      setSendError(err.message || (isUz ? 'Xatolik yuz berdi' : 'Произошла ошибка'));
      setAutosaveStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle file attachment for knowledge/pricing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(
        isUz ? 'Fayl hajmi juda katta' : 'Файл слишком большой',
        isUz ? 'Maksimal hajm — 2MB' : 'Максимальный размер — 2МБ',
        'warning'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        lastUserEditTimeRef.current = Date.now();
        const updatedServices = `${draft.servicesAndPricing}\n\n[${file.name}]:\n${content.slice(0, 5000)}`;
        const nextDraft: AgentDraft = {
          ...draft,
          servicesAndPricing: updatedServices,
          pricingConfirmed: true,
          updatedAt: new Date().toISOString(),
        };
        onDraftChange(nextDraft);
        showToast(
          isUz ? 'Fayl qo‘shildi' : 'Файл прикреплен',
          isUz ? `${file.name} xodim bilimlariga qo‘shildi` : `${file.name} добавлен в базу знаний`,
          'success'
        );
      }
    };
    reader.readAsText(file);
  };

  // Open Edit Modal for a resume item
  const openEditor = (field: 'name' | 'niche' | 'goal' | 'pricing' | 'tone') => {
    setEditingField(field);
    if (field === 'name') setFieldValue(draft.name);
    if (field === 'niche') setFieldValue(draft.nicheTemplate);
    if (field === 'goal') setFieldValue(draft.targetGoal);
    if (field === 'pricing') setFieldValue(draft.servicesAndPricing);
    if (field === 'tone') setFieldValue(draft.tone);
  };

  // Save manual edit from modal
  const saveFieldEdit = () => {
    if (!editingField) return;
    lastUserEditTimeRef.current = Date.now();

    const nextDraft: AgentDraft = { ...draft, updatedAt: new Date().toISOString() };

    if (editingField === 'name') {
      nextDraft.name = fieldValue.trim() || draft.name;
    } else if (editingField === 'niche') {
      nextDraft.nicheTemplate = (fieldValue as WizardNiche) || draft.nicheTemplate;
    } else if (editingField === 'goal') {
      nextDraft.targetGoal = fieldValue.trim() || draft.targetGoal;
      nextDraft.goalConfirmed = true;
    } else if (editingField === 'pricing') {
      nextDraft.servicesAndPricing = fieldValue.trim();
      nextDraft.pricingConfirmed = true;
    } else if (editingField === 'tone') {
      nextDraft.tone = (fieldValue as WizardTone) || draft.tone;
    }

    onDraftChange(nextDraft);
    setEditingField(null);
    showToast(t.common.saved, undefined, 'success');
  };

  const currentArchetype = ARCHETYPES[draft.nicheTemplate] || ARCHETYPES.courses;
  const nicheTitle = isUz ? currentArchetype.titleUz : currentArchetype.titleRu;

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Mobile Tab Toggle: Dialog vs Resume */}
      <div className="lg:hidden flex rounded-xl p-1 bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('dialog')}
          className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
            mobileTab === 'dialog'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.wizard.mobileTabs.dialog}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('resume')}
          className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
            mobileTab === 'resume'
              ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t.wizard.mobileTabs.resume}
        </button>
      </div>

      {/* Main Grid: Left 60% Dialogue + Right 40% Resume */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Clean Dialogue Area (~60% on desktop)         */}
        {/* ========================================================= */}
        <section
          aria-label={t.wizard.mobileTabs.dialog}
          className={`lg:col-span-7 flex flex-col h-[640px] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs overflow-hidden ${
            mobileTab !== 'dialog' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Chat Header with Sparrow Avatar */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-secondary)]/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <SparrowMascot
                  variant={isSending ? 'loading' : 'hello'}
                  size={36}
                  animate={isSending}
                />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                  gapcha AI {isUz ? 'sozlash ustasi' : 'ассистент-мастер'}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {isSending
                    ? (isUz ? 'Javob tayyorlanmoqda…' : 'Формирую ответ…')
                    : (isUz ? 'Onlayn · 1 savol bitta xabarda' : 'Онлайн · 1 вопрос за сообщение')}
                </p>
              </div>
            </div>

            {/* Step badge */}
            <span className="text-[11px] font-semibold text-[var(--text-muted)] px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">
              {isUz ? `${draft.currentStep}-bosqich` : `Этап ${draft.currentStep}`}
            </span>
          </div>

          {/* Chat Messages Body with Smooth Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="size-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <SparrowMascot variant="idle" size={24} animate={false} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isAssistant
                        ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border)]'
                        : 'bg-[#ED262A] text-white rounded-tr-sm font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>
                  </div>
                </div>
              );
            })}

            {/* Waiting/Inference indicator with Sparrow */}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-1 pl-9">
                <SparrowMascot variant="loading" size={20} />
                <span>{isUz ? 'Ma\'lumotlar tahlil qilinmoqda…' : 'Обрабатываю ответ…'}</span>
              </div>
            )}

            {/* Error & Retry Banner */}
            {sendError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold text-[11px] hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
                >
                  {t.common.retry}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Answers */}
          {suggestedAnswers.length > 0 && !isSending && (
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-secondary)]/30 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] shrink-0 mr-1">
                {t.wizard.quickAnswers}
              </span>
              {suggestedAnswers.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="px-2.5 py-1 rounded-full text-xs bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Bar (Always Accessible, No Virtual Keyboard Occlusion) */}
          <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
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
                accept=".txt,.csv,.json,.doc,.docx"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={isUz ? 'Fayl biriktirish (narxlar, reja)' : 'Прикрепить файл (прайс, прайс-лист)'}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer shrink-0"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={t.wizard.inputPlaceholder}
                disabled={isSending}
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#ED262A] transition-all"
              />

              <button
                type="submit"
                disabled={!inputVal.trim() || isSending}
                className="px-4 py-2.5 rounded-xl bg-[#ED262A] hover:bg-[#d01f23] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <span>{t.wizard.send}</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Reactive Employee Resume (~40% on desktop)  */}
        {/* ========================================================= */}
        <section
          aria-label={t.wizard.resumeTitle}
          className={`lg:col-span-5 flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs p-5 space-y-4 ${
            mobileTab !== 'resume' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Resume Header & Honest Autosave Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#ED262A]" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {t.wizard.resumeTitle}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              {autosaveStatus === 'saving' && (
                <span className="text-amber-500 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t.common.saving}
                </span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {t.common.saved}
                </span>
              )}
              {autosaveStatus === 'error' && (
                <span className="text-red-500 inline-flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t.common.saveFailed}
                </span>
              )}
            </div>
          </div>

          {/* Cards List for Structured Data */}
          <div className="space-y-3">
            {/* 1. Name */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t.wizard.resumeAgentName}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor('name')}
                  className="text-[11px] font-semibold text-[#ED262A] hover:underline cursor-pointer"
                >
                  {t.common.edit}
                </button>
              </div>
              <p className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                {draft.name || t.common.notFilled}
              </p>
            </div>

            {/* 2. Business Niche */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t.wizard.resumeNiche}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor('niche')}
                  className="text-[11px] font-semibold text-[#ED262A] hover:underline cursor-pointer"
                >
                  {t.common.edit}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                  {nicheTitle}
                </p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {t.common.confirmed}
                </span>
              </div>
            </div>

            {/* 3. Target Goal */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t.wizard.resumeGoal}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor('goal')}
                  className="text-[11px] font-semibold text-[#ED262A] hover:underline cursor-pointer"
                >
                  {t.common.edit}
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {draft.targetGoal || t.common.notFilled}
              </p>
              <div className="pt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    draft.goalConfirmed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {draft.goalConfirmed ? t.common.confirmed : t.common.suggested}
                </span>
              </div>
            </div>

            {/* 4. Services & Pricing */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t.wizard.resumePricing}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor('pricing')}
                  className="text-[11px] font-semibold text-[#ED262A] hover:underline cursor-pointer"
                >
                  {t.common.edit}
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed whitespace-pre-line font-mono">
                {draft.servicesAndPricing || t.common.notFilled}
              </p>
              <div className="pt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    draft.pricingConfirmed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {draft.pricingConfirmed ? t.common.confirmed : t.common.suggested}
                </span>
              </div>
            </div>

            {/* 5. Tone */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {t.wizard.resumeTone}
                </span>
                <button
                  type="button"
                  onClick={() => openEditor('tone')}
                  className="text-[11px] font-semibold text-[#ED262A] hover:underline cursor-pointer"
                >
                  {t.common.edit}
                </button>
              </div>
              <p className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                {t.wizard.tones[draft.tone] || draft.tone}
              </p>
            </div>

            {/* 6. Clarifications */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border)] space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                {t.wizard.resumeClarify}
              </span>
              {draft.unresolvedQuestions && draft.unresolvedQuestions.length > 0 ? (
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                  {draft.unresolvedQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1 size-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {t.wizard.resumeReady}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons: Save & Launch + Test Drive */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={onSaveAndLaunch}
              disabled={isSaving}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#ED262A] hover:bg-[#d01f23] disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <span>{t.common.saving}</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t.wizard.saveAndLaunch}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenSandbox}
              className="w-full min-h-[42px] py-2 px-4 rounded-xl font-semibold text-xs sm:text-sm text-[var(--text-secondary)] bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={15} className="text-[#ED262A]" />
              <span>{t.wizard.openSandbox}</span>
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* COMPACT MODAL: Edit Single Field in Resume                */}
      {/* ========================================================= */}
      {editingField && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                {t.common.edit}:{' '}
                {editingField === 'name' && t.wizard.resumeAgentName}
                {editingField === 'niche' && t.wizard.resumeNiche}
                {editingField === 'goal' && t.wizard.resumeGoal}
                {editingField === 'pricing' && t.wizard.resumePricing}
                {editingField === 'tone' && t.wizard.resumeTone}
              </h4>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Field input variants */}
            {editingField === 'name' && (
              <input
                type="text"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
              />
            )}

            {editingField === 'niche' && (
              <select
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
              >
                <option value="courses">{t.wizard.niches.courses}</option>
                <option value="clinic">{t.wizard.niches.clinic}</option>
                <option value="beauty">{t.wizard.niches.beauty}</option>
                <option value="ecommerce">{t.wizard.niches.ecommerce}</option>
                <option value="marketing">{t.wizard.niches.marketing}</option>
                <option value="other">{t.wizard.niches.other}</option>
              </select>
            )}

            {editingField === 'goal' && (
              <textarea
                rows={4}
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
              />
            )}

            {editingField === 'pricing' && (
              <textarea
                rows={6}
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
              />
            )}

            {editingField === 'tone' && (
              <div className="space-y-2">
                {(['consultative', 'friendly', 'professional', 'persuasive'] as WizardTone[]).map(
                  (toneKey) => (
                    <label
                      key={toneKey}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        fieldValue === toneKey
                          ? 'border-[#ED262A] bg-red-500/10 text-[var(--text-primary)] font-bold'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={toneKey}
                        checked={fieldValue === toneKey}
                        onChange={() => setFieldValue(toneKey)}
                        className="text-[#ED262A]"
                      />
                      <span className="text-xs sm:text-sm">{t.wizard.tones[toneKey]}</span>
                    </label>
                  )
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingField(null)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveFieldEdit}
                className="bg-[#ED262A] text-white hover:bg-[#d01f23]"
              >
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
