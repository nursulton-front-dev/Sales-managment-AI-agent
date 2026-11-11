'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  GraduationCap,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Target,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  Send,
  Play,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { AgentSetupWizard } from '@/components/wizard/AgentSetupWizard';
import { SparrowMascot } from '@/components/ui/SparrowMascot';
import { AgentDraft, WizardNiche } from '@/lib/wizard/types';
import { ARCHETYPES, createInitialDraft } from '@/lib/wizard/archetypes';

interface NicheTemplate {
  id: WizardNiche;
  titleRu: string;
  titleUz: string;
  targetRu: string;
  targetUz: string;
  icon: React.ElementType;
  defaultPriceRu: string;
  defaultPriceUz: string;
  defaultQuestionsRu: string[];
  defaultQuestionsUz: string[];
  defaultNameRu: string;
  defaultNameUz: string;
}

const NICHES: NicheTemplate[] = [
  {
    id: 'courses',
    titleRu: 'Учебный центр',
    titleUz: 'O‘quv markazi',
    targetRu: 'Ответы о курсах и запись на пробный урок',
    targetUz: 'Kurslar bo‘yicha maslahat va sinov darsiga yozish',
    icon: GraduationCap,
    defaultPriceRu: ARCHETYPES.courses.samplePricingRu,
    defaultPriceUz: ARCHETYPES.courses.samplePricingUz,
    defaultQuestionsRu: ARCHETYPES.courses.defaultQuestionsRu,
    defaultQuestionsUz: ARCHETYPES.courses.defaultQuestionsUz,
    defaultNameRu: ARCHETYPES.courses.defaultNameRu,
    defaultNameUz: ARCHETYPES.courses.defaultNameUz,
  },
  {
    id: 'services',
    titleRu: 'Клиника и медицина',
    titleUz: 'Klinika va tibbiyot',
    targetRu: 'Информация об услугах и запись на приём к врачу',
    targetUz: 'Xizmatlar haqida ma\'lumot va shifokor qabuliga yozish',
    icon: Stethoscope,
    defaultPriceRu: ARCHETYPES.services.samplePricingRu,
    defaultPriceUz: ARCHETYPES.services.samplePricingUz,
    defaultQuestionsRu: ARCHETYPES.services.defaultQuestionsRu,
    defaultQuestionsUz: ARCHETYPES.services.defaultQuestionsUz,
    defaultNameRu: 'Медицинский Координатор ИИ',
    defaultNameUz: 'Tibbiy AI-koordinator',
  },
  {
    id: 'marketing',
    titleRu: 'Маркетинговое агентство',
    titleUz: 'Marketing agentligi',
    targetRu: 'Консультация по услугам рекламы, SMM и запись на аудит',
    targetUz: 'Reklama xizmatlari bo‘yicha maslahat va auditga yozish',
    icon: Target,
    defaultPriceRu: ARCHETYPES.marketing.samplePricingRu,
    defaultPriceUz: ARCHETYPES.marketing.samplePricingUz,
    defaultQuestionsRu: ARCHETYPES.marketing.defaultQuestionsRu,
    defaultQuestionsUz: ARCHETYPES.marketing.defaultQuestionsUz,
    defaultNameRu: ARCHETYPES.marketing.defaultNameRu,
    defaultNameUz: ARCHETYPES.marketing.defaultNameUz,
  },
  {
    id: 'other',
    titleRu: 'Магазин / Ритейл',
    titleUz: 'Do‘kon / Chakana savdo',
    targetRu: 'Ответы по каталогу и помощь с оформлением заказа',
    targetUz: 'Katalog bo‘yicha javoblar va buyurtma rasmiylashtirish',
    icon: ShoppingBag,
    defaultPriceRu: ARCHETYPES.other.samplePricingRu,
    defaultPriceUz: ARCHETYPES.other.samplePricingUz,
    defaultQuestionsRu: ARCHETYPES.other.defaultQuestionsRu,
    defaultQuestionsUz: ARCHETYPES.other.defaultQuestionsUz,
    defaultNameRu: ARCHETYPES.other.defaultNameRu,
    defaultNameUz: ARCHETYPES.other.defaultNameUz,
  },
];

const STEPS = [
  { num: 1, titleRu: 'Бизнес', titleUz: 'Biznes' },
  { num: 2, titleRu: 'Знания', titleUz: 'Bilimlar' },
  { num: 3, titleRu: 'Проверка', titleUz: 'Tekshirish' },
  { num: 4, titleRu: 'Запуск', titleUz: 'Ishga tushirish' },
];

export default function NewAgentWizardPage() {
  const router = useRouter();
  const { createAgent, openSandbox, showToast, workspace, locale, t } = useApp();
  const isUz = locale === 'uz';

  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Unified Agent Draft state (Single source of truth)
  const [draft, setDraft] = useState<AgentDraft>(() => createInitialDraft('courses', locale));
  const [isSaved, setIsSaved] = useState(false);
  const [savedAgentId, setSavedAgentId] = useState<string | null>(null);

  // Manual mode channel configurations
  const [tgVariant, setTgVariant] = useState<'platform' | 'custom_bot'>('platform');
  const [botToken, setBotToken] = useState<string>('');

  // Synchronize draft on locale change if unedited
  useEffect(() => {
    if (!draft.pricingConfirmed && !draft.goalConfirmed) {
      setDraft(createInitialDraft(draft.nicheTemplate, locale));
    }
  }, [locale]);

  // Load existing draft from server on mount
  useEffect(() => {
    let active = true;
    async function loadServerDraft() {
      try {
        const res = await fetch('/api/assistant/wizard');
        const data = await res.json();
        if (active && data.success && data.draft) {
          setDraft(data.draft);
          if (data.draft.currentStep) {
            setCurrentStep(data.draft.currentStep);
          }
        }
      } catch {}
    }
    loadServerDraft();
    return () => {
      active = false;
    };
  }, []);

  // Update draft helper
  const updateDraft = (patch: Partial<AgentDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      // auto-save to sessionStorage
      try {
        sessionStorage.setItem('gapcha_agent_draft', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Select Niche in manual mode
  const handleSelectNiche = (niche: NicheTemplate) => {
    updateDraft({
      nicheTemplate: niche.id,
      name: isUz ? niche.defaultNameUz : niche.defaultNameRu,
      targetGoal: isUz ? niche.targetUz : niche.targetRu,
      servicesAndPricing: isUz ? niche.defaultPriceUz : niche.defaultPriceRu,
      qualificationQuestions: isUz ? [...niche.defaultQuestionsUz] : [...niche.defaultQuestionsRu],
      currentStep: 1,
    });
  };

  // Finalize / Save agent to DB
  const handleFinalizeAgent = async () => {
    if (isSavingAgent) return;
    setIsSavingAgent(true);

    try {
      const res = await fetch('/api/assistant/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize',
          draft: {
            ...draft,
            tgBotToken: tgVariant === 'custom_bot' && botToken.trim() ? botToken.trim() : null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isUz ? 'Xodimni yaratib bo‘lmadi' : 'Не удалось создать сотрудника'));
      }

      setSavedAgentId(data.agentId || 'new-agent');
      setIsSaved(true);
      showToast(t.wizard.successTitle, undefined, 'success');
      try {
        sessionStorage.removeItem('gapcha_agent_draft');
      } catch {}
    } catch (err: any) {
      showToast(
        isUz ? 'Xatolik yuz berdi' : 'Ошибка сохранения',
        err.message || (isUz ? 'Qayta urinib ko‘ring' : 'Попробуйте ещё раз'),
        'error'
      );
    } finally {
      setIsSavingAgent(false);
    }
  };

  const activeStep = creationMode === 'ai' ? draft.currentStep : currentStep;

  return (
    <div className="w-full max-w-[1300px] mx-auto pb-20 space-y-6">
      {/* ============================================================= */}
      {/* 1. CLEAN TOP HEADER: Title, Compact Mode Switcher & Steps     */}
      {/* ============================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {t.wizard.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              {t.wizard.subtitle}
            </p>
          </div>

          {/* Compact Mode Switcher: AI Assistant vs Manual */}
          {!isSaved && (
            <div
              role="tablist"
              aria-label={t.wizard.title}
              className="inline-flex items-center p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={creationMode === 'ai'}
                onClick={() => setCreationMode('ai')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  creationMode === 'ai'
                    ? 'bg-[#ED262A] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SparrowMascot variant="idle" size={16} animate={false} />
                <span>{t.wizard.modeAi}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={creationMode === 'manual'}
                onClick={() => setCreationMode('manual')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  creationMode === 'manual'
                    ? 'bg-[#ED262A] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Edit3 size={14} />
                <span>{t.wizard.modeManual}</span>
              </button>
            </div>
          )}
        </div>

        {/* 1 Clean Row of Steps: Бизнес → Знания → Проверка → Запуск */}
        {!isSaved && (
          <div className="flex items-center gap-2 sm:gap-3 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-x-auto scrollbar-none shadow-2xs">
            {STEPS.map((st, i) => {
              const isCurrent = activeStep === st.num;
              const isCompleted = activeStep > st.num;
              return (
                <React.Fragment key={st.num}>
                  {i > 0 && (
                    <span className="text-[var(--border)] font-bold text-xs select-none">
                      →
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (creationMode === 'manual') setCurrentStep(st.num);
                      else updateDraft({ currentStep: st.num as any });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#ED262A] text-white shadow-2xs'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{st.num}.</span>
                    <span>{isUz ? st.titleUz : st.titleRu}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 2. SUCCESS CONFIRMATION SCREEN (When Agent Saved)             */}
      {/* ============================================================= */}
      {isSaved ? (
        <div className="py-12 text-center space-y-5 max-w-lg mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xs">
          <div className="flex justify-center mb-1">
            <SparrowMascot variant="success" size={80} priority />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {t.wizard.successTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {(workspace?.telegramBusinessConnected || (tgVariant === 'custom_bot' && botToken.trim()))
                ? `«${draft.name}» ${t.wizard.successDescReady}`
                : `«${draft.name}» ${t.wizard.successDescNeedsChannel}`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
            {tgVariant === 'platform' && !workspace?.telegramBusinessConnected && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/integrations')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#229ED9] hover:bg-[#1c8ec4] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isUz ? 'Integratsiyalarda Telegramni ulash' : 'Подключить Telegram в Интеграциях'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openSandbox(savedAgentId || undefined)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#ED262A] hover:bg-[#d01f23] rounded-xl transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{t.wizard.openSandbox}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/agents')}
              className="px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              {t.wizard.toAgentsList}
            </button>
          </div>
        </div>
      ) : creationMode === 'ai' ? (
        /* ============================================================= */
        /* 3. AI WIZARD: 60% Dialogue + 40% Resume                      */
        /* ============================================================= */
        <AgentSetupWizard
          draft={draft}
          onDraftChange={setDraft}
          onSaveAndLaunch={handleFinalizeAgent}
          isSaving={isSavingAgent}
          onOpenSandbox={() => openSandbox()}
        />
      ) : (
        /* ============================================================= */
        /* 4. MANUAL MODE: Step-by-Step Clean Form                       */
        /* ============================================================= */
        <div className="space-y-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* STEP 1: Niche & Goal */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {isUz ? '1. Biznes sohasi va nomi' : '1. Сфера бизнеса и имя'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isUz
                    ? 'Biznesingizga mos yo‘nalishni tanlang yoki nomini kiriting'
                    : 'Выберите подходящую сферу деятельности или введите название компании'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {NICHES.map((n) => {
                  const Icon = n.icon;
                  const isSelected = draft.nicheTemplate === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelectNiche(n)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-[#ED262A] bg-red-500/10 font-bold shadow-2xs'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]'
                      }`}
                    >
                      <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[#ED262A] shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                          {isUz ? n.titleUz : n.titleRu}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-normal line-clamp-2">
                          {isUz ? n.targetUz : n.targetRu}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  {t.wizard.resumeAgentName}
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  placeholder={isUz ? 'Masalan: Savdo menejeri' : 'Например: ИИ-Менеджер продаж'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-[#ED262A] text-white font-bold text-xs sm:text-sm hover:bg-[#d01f23] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t.common.continue}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Knowledge & Pricing */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {isUz ? '2. Xizmatlar va narxlar' : '2. Услуги и прайс-лист'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isUz
                    ? 'Xodim mijozlarga to‘g‘ri ma\'lumot berishi uchun narxlar va xizmatlarni kiriting'
                    : 'Укажите перечень услуг и стоимость, чтобы сотрудник точно консультировал клиентов'}
                </p>
              </div>

              <textarea
                rows={8}
                value={draft.servicesAndPricing}
                onChange={(e) => updateDraft({ servicesAndPricing: e.target.value, pricingConfirmed: true })}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs sm:text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
              />

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>{t.common.back}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-[#ED262A] text-white font-bold text-xs sm:text-sm hover:bg-[#d01f23] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t.common.continue}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Channels */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {isUz ? '3. Tekshirish va aloqa kanallari' : '3. Проверка и каналы связи'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isUz
                    ? 'Aloqa usulini tanlang va parametrlarni tekshiring'
                    : 'Выберите способ связи с клиентами и проверьте параметры сотрудника'}
                </p>
              </div>

              {/* Telegram integration variant selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div
                  onClick={() => setTgVariant('platform')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    tgVariant === 'platform'
                      ? 'border-[#ED262A] bg-red-500/10 font-bold shadow-2xs'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Telegram Business (Kotib / Секретарь)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-normal">
                    {isUz
                      ? 'Shaxsiy profilingizdagi mijozlar bilan muloqotda bevosita javob beradi'
                      : 'Отвечает клиентам прямо в личных диалогах Telegram от вашего имени'}
                  </p>
                </div>

                <div
                  onClick={() => setTgVariant('custom_bot')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    tgVariant === 'custom_bot'
                      ? 'border-[#ED262A] bg-red-500/10 font-bold shadow-2xs'
                      : 'border-[var(--border)] bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Telegram Bot (@BotFather)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-normal">
                    {isUz
                      ? 'Kompaniyangiz uchun alohida rasmiy mijozlar boti'
                      : 'Отдельный бот компании через токен от @BotFather'}
                  </p>
                </div>
              </div>

              {tgVariant === 'custom_bot' && (
                <div className="space-y-2 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    {isUz ? 'Bot tokeni (@BotFather dan olingan)' : 'Токен Telegram-бота (из @BotFather)'}
                  </label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs sm:text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>{t.common.back}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-[#ED262A] text-white font-bold text-xs sm:text-sm hover:bg-[#d01f23] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t.common.continue}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Final Launch */}
          {currentStep === 4 && (
            <div className="space-y-5 text-center max-w-md mx-auto py-4">
              <div className="size-12 rounded-2xl bg-red-500/10 text-[#ED262A] flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)]">
                  {isUz ? 'Hammasi tayyor!' : 'Всё готово к запуску!'}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {isUz
                    ? `«${draft.name}» saqlanishga tayyor. Saqlangandan so‘ng uni test-drayvda tekshirishingiz mumkin.`
                    : `Сотрудник «${draft.name}» полностью настроен. После сохранения вы сможете протестировать его ответы в тест-драйве.`}
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {t.common.back}
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeAgent}
                  disabled={isSavingAgent}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#ED262A] text-white font-bold text-xs sm:text-sm hover:bg-[#d01f23] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSavingAgent ? t.common.saving : t.wizard.saveAndLaunch}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
