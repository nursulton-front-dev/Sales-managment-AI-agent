'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import {
  GraduationCap,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  FileText,
  Info,
  CheckCircle2,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface NicheTemplate {
  id: string;
  title: string;
  target: string;
  image?: string;
  icon: React.ElementType;
  description: string;
  defaultPrice: string;
  defaultQuestions: string[];
  defaultName: string;
}

const PRIMARY_NICHES: NicheTemplate[] = [
  {
    id: 'courses',
    title: 'Учебный центр',
    target: 'Ответы о курсах и запись на пробный урок',
    image: '/images/niches/education.jpg',
    icon: GraduationCap,
    description: 'Ответы о курсах и запись на пробный урок.',
    defaultPrice: `Прайс-лист обучения:
- Групповые занятия (8 уроков/мес): $75 / мес
- Интенсивный курс (12 уроков/мес): $110 / мес
- Индивидуальные уроки: $18 / урок
- Бесплатный диагностический пробный урок: 0 сум (30 мин)`,
    defaultQuestions: [
      'Для кого планируете обучение (для себя или ребенка) и какой возраст?',
      'Какой у вас текущий уровень подготовки (с нуля или уже изучали)?',
      'В какой день и время вам удобно подойти на бесплатный пробный урок?'
    ],
    defaultName: 'ИИ-Менеджер Приемной Комиссии'
  },
  {
    id: 'clinic',
    title: 'Клиника',
    target: 'Информация об услугах и запись на приём',
    image: '/images/niches/clinic.jpg',
    icon: Stethoscope,
    description: 'Информация об услугах и запись на приём.',
    defaultPrice: `Прайс-лист клиники:
- Первичный осмотр и консультация врача: 120 000 сум
- Компьютерная диагностика: 180 000 сум
- Лечение кариеса и пломбирование: от 320 000 сум
- Профессиональная гигиена: 450 000 сум`,
    defaultQuestions: [
      'Какая услуга или симптом вас беспокоят в первую очередь?',
      'Были ли вы уже на приеме в нашей клинике ранее?',
      'На какую дату и половину дня (до или после 14:00) вам удобнее записаться?'
    ],
    defaultName: 'Медицинский Координатор ИИ'
  },
  {
    id: 'beauty',
    title: 'Салон красоты',
    target: 'Подбор услуги, мастера и времени визита',
    image: '/images/niches/salon.jpg',
    icon: Scissors,
    description: 'Подбор услуги, мастера и времени визита.',
    defaultPrice: `Прайс-лист салона:
- Стрижка и укладка (Топ-стилист): 220 000 сум
- Маникюр с покрытием гель-лак: 190 000 сум
- Сложное окрашивание волос: от 650 000 сум
- Спа-уход для лица: 350 000 сум`,
    defaultQuestions: [
      'Какую процедуру или комплекс услуг вы хотите сделать?',
      'Есть ли предпочтения по конкретному мастеру (стилист / топ-мастер)?',
      'Какой день недели и временное окно вам больше всего подходит?'
    ],
    defaultName: 'Администратор Салона Красоты'
  },
  {
    id: 'ecommerce',
    title: 'Магазин',
    target: 'Ответы по каталогу и помощь с оформлением заказа',
    image: '/images/niches/store.jpg',
    icon: ShoppingBag,
    description: 'Ответы по каталогу и помощь с оформлением заказа.',
    defaultPrice: `Каталог и условия:
- Базовые модели (в наличии S, M, L): от 280 000 сум
- Премиум коллекция: от 450 000 сум
- Доставка курьером до двери: 25 000 сум (от 500 000 сум — БЕСПЛАТНО)
- Примерка перед покупкой доступна в шоуруме`,
    defaultQuestions: [
      'Какая модель, цвет и размер вас интересуют?',
      'В какой город/район потребуется доставка или планируете самовывоз?',
      'Какой способ оплаты для вас удобнее (перевод, наличные или терминал)?'
    ],
    defaultName: 'ИИ-Консультант Магазина'
  }
];

const OTHER_NICHE: NicheTemplate = {
  id: 'other',
  title: 'Другая сфера бизнеса',
  target: 'Настройте сценарий под свои услуги',
  icon: Briefcase,
  description: 'Настройте сценарий под свои услуги.',
  defaultPrice: `Прайс-лист и условия услуг:
- Первичная консультация специалиста: Бесплатно (20 мин)
- Базовый пакет услуг: от 500 000 сум
- Комплексное обслуживание под ключ: от 1 500 000 сум
- График работы: Понедельник–Суббота с 09:00 до 19:00`,
  defaultQuestions: [
    'Какая конкретно услуга или задача вас интересует?',
    'Какой у вас ориентировочный бюджет или желаемые сроки реализации?',
    'В какой день и время вам удобно принять звонок или встретиться с экспертом?'
  ],
  defaultName: 'ИИ-Менеджер по работе с клиентами'
};

const ALL_NICHES = [...PRIMARY_NICHES, OTHER_NICHE];

const STEP_TITLES = [
  'Сфера бизнеса',
  'Прайс и вопросы',
  'Подключения',
  'Запуск'
];

export default function NewAgentWizardPage() {
  const router = useRouter();
  const { createAgent, openSandbox, showToast } = useApp();
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  const [currentStep, setCurrentStep] = useState<number>(1);
  // Do NOT select first niche automatically. Allow null or restore from draft
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [customBusinessName, setCustomBusinessName] = useState<string>('');

  // Step 2 state
  const [priceList, setPriceList] = useState<string>('');
  const [questions, setQuestions] = useState<string[]>([]);

  // Step 3 state
  const [botToken, setBotToken] = useState<string>('');
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState<boolean>(true);
  const autoReminderEnabled = false;

  // Step 4 state
  const [agentName, setAgentName] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedAgentId, setSavedAgentId] = useState<string | null>(null);

  // Restore draft if user returns or has existing draft in session
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('ai_agent_wizard_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.nicheId) {
          const matched = ALL_NICHES.find((n) => n.id === parsed.nicheId);
          if (matched) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser draft after hydration.
            setSelectedNiche(matched);
            setPriceList(parsed.priceList || matched.defaultPrice);
            setQuestions(parsed.questions || matched.defaultQuestions);
            setAgentName(parsed.agentName || matched.defaultName);
            if (parsed.customBusinessName) setCustomBusinessName(parsed.customBusinessName);
            if (parsed.botToken) setBotToken(parsed.botToken);
            return;
          }
        }
      }
    } catch {}
  }, []);

  // Save draft whenever key states change
  useEffect(() => {
    if (selectedNiche) {
      try {
        sessionStorage.setItem(
          'ai_agent_wizard_draft',
          JSON.stringify({
            nicheId: selectedNiche.id,
            priceList,
            questions,
            agentName,
            customBusinessName,
            botToken,
          })
        );
      } catch {}
    }
  }, [selectedNiche, priceList, questions, agentName, customBusinessName, botToken]);

  const handleSelectNiche = (niche: NicheTemplate) => {
    setSelectedNiche(niche);
    setPriceList(niche.defaultPrice);
    setQuestions(niche.defaultQuestions);
    setAgentName(niche.defaultName);
  };

  const handleCustomBusinessNameChange = (name: string) => {
    setCustomBusinessName(name);
    if (name.trim()) {
      setAgentName(`ИИ-Менеджер (${name.trim()})`);
    } else {
      setAgentName('ИИ-Менеджер по работе с клиентами');
    }
  };

  const handleAppendFAQ = () => {
    const faqSnippet = `\n\nЧастые вопросы и ответы (FAQ):
- Где вы находитесь? Наш адрес: г. Ташкент (рядом с метро).
- Есть ли парковка? Да, бесплатная парковка перед входом.
- Какие способы оплаты? Наличные, Payme, Click, терминал Uzcard/Humo.
- Можно ли отменить или перенести запись? Да, не позднее чем за 2 часа до времени.`;
    setPriceList((prev) => prev + faqSnippet);
    showToast('FAQ добавлен', 'Блок типовых вопросов и ответов добавлен в прайс-лист.', 'info');
  };

  const handleQuestionChange = (index: number, val: string) => {
    const updated = [...questions];
    updated[index] = val;
    setQuestions(updated);
  };

  // Compile auto-generated system prompt
  const generatedSystemPrompt = `Ты — профессиональный ИИ-сотрудник по продажам для компании "${selectedNiche?.title || 'Компания'}".
Твое имя: "${agentName}".

БИЗНЕС-ЦЕЛЬ:
${selectedNiche?.target || 'Квалифицировать запрос и записать клиента'}.

ПРАВИЛА КВАЛИФИКАЦИИ КЛИЕНТА:
Перед записью в календарь последовательно уточни следующие 3 вопроса:
1. ${questions[0] || 'Уточнить запрос'}
2. ${questions[1] || 'Уточнить детали'}
3. ${questions[2] || 'Уточнить желаемое время'}

ПРАЙС-ЛИСТ И УСЛУГИ:
${priceList}

ИНТЕГРАЦИЯ С КАЛЕНДАРЕМ:
${
  googleCalendarEnabled
    ? 'Уточни желаемое время. Не придумывай свободные часы и не подтверждай запись без результата календаря.'
    : 'Календарь отключен — принимай контактные данные клиента для ручной связи.'
}
${
  autoReminderEnabled
    ? 'Авто-напоминание за 2 часа до визита включено (расход: 1 токен).'
    : ''
}

ТОНАЛЬНОСТЬ:
Вежливая, деловая, лаконичная. Не пиши простыни текста, общайся живыми короткими сообщениями.`;

  const handleSaveAgent = async () => {
    if (!selectedNiche || isSavingAgent) return;
    setIsSavingAgent(true);
    try {
    const newAgent = await createAgent({
      name: agentName || selectedNiche.defaultName,
      niche: selectedNiche.title,
      nicheId: selectedNiche.id,
      systemPrompt: generatedSystemPrompt,
      priceList: priceList,
      qualificationQuestions: questions,
      telegramToken: botToken,
      googleCalendarEnabled: googleCalendarEnabled,
      autoReminderEnabled: autoReminderEnabled,
      isActive: true
    });

    setSavedAgentId(newAgent.id);
    setIsSaved(true);
    try {
      sessionStorage.removeItem('ai_agent_wizard_draft');
    } catch {}
    } catch (error) { showToast('Не удалось создать сотрудника', error instanceof Error ? error.message : 'Ошибка сети', 'error'); }
    finally { setIsSavingAgent(false); }
  };

  // Keyboard navigation for radio group
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % ALL_NICHES.length;
      handleSelectNiche(ALL_NICHES[nextIndex]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + ALL_NICHES.length) % ALL_NICHES.length;
      handleSelectNiche(ALL_NICHES[prevIndex]);
    }
  };

  return (
    <div className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 pb-24 space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header: Clean title + "Как это работает" button              */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Создание ИИ-сотрудника
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Выберите сферу бизнеса – мы предложим подходящий сценарий.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Как это работает</span>
          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Guide explanation popup / collapsible card */}
      {isGuideOpen && (
        <div className="p-4 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-xs animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[var(--text-secondary)]">
            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>1. Ответы 24/7</span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Мгновенно отвечает на русском и узбекском языках в Telegram, консультирует по ценам и каталогу.
              </p>
            </div>

            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>2. Квалификация</span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Задает 3 обязательных вопроса (потребность, уровень, время) перед внесением записи.
              </p>
            </div>

            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>3. Запись в календарь</span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-snug">
                Сверяется с графиком (10:00–18:00) и бронирует свободный слот в Google Календаре.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Compact Stepper (Desktop: 4 items; Mobile: Step X of 4)     */}
      {/* ------------------------------------------------------------- */}
      <nav aria-label="Прогресс создания сотрудника" className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-2.5 shadow-2xs">
        {/* Desktop indicator */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2">
          {STEP_TITLES.map((title, idx) => {
            const stepNum = idx + 1;
            const isCurrent = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;

            return (
              <div
                key={stepNum}
                className={`flex items-center gap-2 p-2 rounded-[6px] transition-colors ${
                  isCurrent
                    ? 'bg-[#FFF5F5] dark:bg-rose-950/30 text-[#DC2626] font-semibold'
                    : isCompleted
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 font-medium ${
                    isCurrent
                      ? 'bg-[#DC2626] text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : stepNum}
                </div>
                <span className="text-xs truncate">{stepNum}. {title}</span>
              </div>
            );
          })}
        </div>

        {/* Mobile indicator */}
        <div className="sm:hidden flex items-center justify-between px-2 py-1 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            Шаг {currentStep} из 4: <span className="text-[#DC2626]">{STEP_TITLES[currentStep - 1]}</span>
          </span>
          <span className="text-[var(--text-muted)] font-mono">{Math.round((currentStep / 4) * 100)}%</span>
        </div>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* 3. STEP CONTENT                                               */}
      {/* ------------------------------------------------------------- */}
      <div className="transition-all duration-200">
        {/* ================= STEP 1: Выбор сферы бизнеса ================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDuration: '200ms' }}>
            {/* 4 Primary Niches Grid: 2 columns x 2 rows on desktop */}
            <div
              role="radiogroup"
              aria-label="Выберите сферу вашего бизнеса"
              className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
            >
              {PRIMARY_NICHES.map((niche, idx) => {
                const isSelected = selectedNiche?.id === niche.id;

                return (
                  <div
                    key={niche.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelectNiche(niche)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    style={{ animationDelay: `${idx * 35}ms` }}
                    className={`rounded-[8px] p-4 sm:p-5 flex items-center gap-4 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'bg-[#FFF5F5] dark:bg-rose-950/25 border-2 border-[#DC2626] shadow-xs'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {/* Photo on left: ~112x88px on desktop, ~80x72px on mobile */}
                    <div className="w-[80px] h-[72px] sm:w-[112px] sm:h-[88px] relative rounded-[6px] overflow-hidden bg-[var(--surface-secondary)] shrink-0">
                      <Image
                        src={niche.image || '/images/niches/education.jpg'}
                        alt={niche.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 80px, 112px"
                      />
                    </div>

                    {/* Text on right */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                          {niche.title}
                        </h3>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DC2626] text-white shrink-0 animate-fade-in">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Выбрано</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-snug">
                        {niche.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5th Option: Full-width compact row for "Другая сфера бизнеса" */}
            <div
              role="radio"
              aria-checked={selectedNiche?.id === 'other'}
              tabIndex={0}
              onClick={() => handleSelectNiche(OTHER_NICHE)}
              onKeyDown={(e) => handleKeyDown(e, 4)}
              className={`rounded-[8px] p-4 sm:p-4.5 flex items-center justify-between gap-4 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 ${
                selectedNiche?.id === 'other'
                  ? 'bg-[#FFF5F5] dark:bg-rose-950/25 border-2 border-[#DC2626] shadow-xs'
                  : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--text-muted)]">
                  <Briefcase className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)] leading-tight">
                    Другая сфера бизнеса
                  </h3>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-snug">
                    Настройте сценарий под свои услуги
                  </p>
                </div>
              </div>

              {selectedNiche?.id === 'other' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DC2626] text-white shrink-0 animate-fade-in">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Выбрано</span>
                </span>
              ) : (
                <div className="w-5 h-5 rounded-full border border-[var(--border)] shrink-0" />
              )}
            </div>

            {/* Custom Business Input if "other" selected */}
            {selectedNiche?.id === 'other' && (
              <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] space-y-2 animate-fade-in">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Уточните сферу или название бизнеса:
                </label>
                <input
                  type="text"
                  value={customBusinessName}
                  onChange={(e) => handleCustomBusinessNameChange(e.target.value)}
                  placeholder="Например: Автосервис, Юридическая фирма, Недвижимость"
                  className="w-full h-[48px] px-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                />
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: Прайс и вопросы ================= */}
        {currentStep === 2 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 sm:p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Прайс-лист и вопросы квалификации
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                ИИ-сотрудник отвечает клиентам строго на основании этого прайс-листа
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Прайс-лист услуг и условия:</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAppendFAQ}
                    className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                  >
                    + Добавить блок FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceList(selectedNiche?.defaultPrice || '')}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Сбросить к шаблону
                  </button>
                </div>
              </div>

              <textarea
                rows={7}
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
                placeholder="Вставьте текстовый прайс-лист, тарифы и базовые ответы на частые вопросы..."
                className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626] leading-relaxed"
              />
            </div>

            {/* 3 Qualification questions */}
            <div className="pt-2 border-t border-[var(--border)] space-y-3">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                3 обязательных вопроса квалификации:
              </label>

              {questions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-[4px] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono font-medium flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    placeholder={`Вопрос #${idx + 1}`}
                    className="flex-1 h-[44px] px-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 3: Подключения ================= */}
        {currentStep === 3 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 sm:p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Подключение каналов и Календаря
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Привяжите Telegram бота и включите синхронизацию со слотами
              </p>
            </div>

            {/* Telegram Bot Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Image
                    src="/images/brands/telegram.svg"
                    alt="Telegram"
                    width={14}
                    height={14}
                    className="object-contain"
                  />
                  <span>Telegram Bot Token (от @BotFather):</span>
                </label>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#DC2626] hover:underline flex items-center gap-0.5"
                >
                  <span>Открыть @BotFather</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGHIjkl... (можно оставить пустым для теста в песочнице)"
                className="w-full h-[48px] px-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
              />

              <p className="text-[11px] text-[var(--text-muted)]">
                Если токена пока нет, оставьте поле пустым — вы сможете протестировать сотрудника во встроенной песочнице.
              </p>
            </div>

            {/* Google Calendar Toggle */}
            <div className="p-4 border border-[var(--border)] rounded-[6px] bg-[var(--surface-secondary)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/images/brands/google-calendar.png"
                    alt="Google Calendar"
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] text-xs">
                      Запись в Google Календарь
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Проверка слотов 10:00–18:00 и авто-бронирование
                    </div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={googleCalendarEnabled}
                  onChange={(e) => setGoogleCalendarEnabled(e.target.checked)}
                  className="h-4 w-4 text-[#DC2626] rounded border-[var(--border)] focus:ring-[#DC2626] cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoReminder"
                  checked={autoReminderEnabled}
                  disabled
                  className="h-4 w-4 text-[#DC2626] rounded border-[var(--border)] focus:ring-[#DC2626] cursor-pointer"
                />
                <label htmlFor="autoReminder" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Автоматические напоминания пока недоступны
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Проверка и запуск ================= */}
        {currentStep === 4 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 sm:p-6 space-y-5 animate-fade-in">
            {!isSaved ? (
              <>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Проверка и сохранение
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Системный промпт автоматически сформирован на основе указанных данных
                  </p>
                </div>

                {/* Employee Name */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Имя ИИ-сотрудника
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full h-[48px] px-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[#DC2626] focus:border-[#DC2626]"
                  />
                </div>

                {/* Prompt Preview */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Сформированная инструкция (System Prompt):
                  </label>
                  <pre className="p-3.5 bg-[#0B1220] text-slate-100 rounded-[6px] text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto border border-slate-800">
                    {generatedSystemPrompt}
                  </pre>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAgent} disabled={isSavingAgent}
                    className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold rounded-[6px] transition-colors cursor-pointer text-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Сохранить и запустить сотрудника</span>
                  </button>
                </div>
              </>
            ) : (
              /* Success confirmation */
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    ИИ-сотрудник успешно создан!
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1 leading-relaxed">
                    «{agentName}» сохранен в базе и готов к работе. Вы можете проверить диалог в песочнице прямо сейчас.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => openSandbox(savedAgentId || undefined)}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[6px] transition-colors cursor-pointer min-h-[44px]"
                  >
                    Открыть песочницу
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/agents')}
                    className="px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer min-h-[44px]"
                  >
                    Список сотрудников
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Action Panel: Always visible at bottom of content layout     */}
      {/* ------------------------------------------------------------- */}
      {!isSaved && (
        <div className="sticky bottom-0 z-20 py-3 px-4 sm:px-6 -mx-4 sm:-mx-6 md:-mx-8 bg-[var(--surface)]/95 backdrop-blur-xs border-t border-[var(--border)] flex items-center justify-between gap-3 shadow-sm">
          {/* Back button (only starting from step 2) */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1.5 px-4 h-[44px] border border-[var(--border)] rounded-[6px] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">
              {selectedNiche ? (
                <span className="text-slate-600 dark:text-slate-300">
                  Выбрано: <b>{selectedNiche.title}</b>
                </span>
              ) : (
                'Выберите сферу бизнеса'
              )}
            </div>
          )}

          {/* Forward / Save button */}
          {currentStep < 4 ? (
            <div className="flex items-center gap-3">
              {currentStep === 1 && !selectedNiche && (
                <span className="hidden sm:inline text-xs text-[var(--text-muted)]">
                  Выберите сферу бизнеса
                </span>
              )}
              <button
                type="button"
                disabled={currentStep === 1 && !selectedNiche}
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="inline-flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-6 h-[44px] rounded-[6px] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                <span>Продолжить</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
