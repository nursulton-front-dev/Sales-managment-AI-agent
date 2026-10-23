'use client';

import React, { useState } from 'react';
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
  Send,
  FileText,
  Info,
  CheckCircle2,
  Terminal,
  Bot,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
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

const NICHES: NicheTemplate[] = [
  {
    id: 'courses',
    title: 'Учебный центр / Курсы',
    target: 'Узнать возраст/уровень и записать на пробный урок',
    image: '/images/niches/education.jpg',
    icon: GraduationCap,
    description: 'Для языковых школ, IT-академий, подготовки к экзаменам и детских центров.',
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
    title: 'Клиника / Стоматология',
    target: 'Уточнить симптом/услугу и записать к врачу',
    image: '/images/niches/clinic.jpg',
    icon: Stethoscope,
    description: 'Для стоматологий, медицинских центров, косметологий и врачей.',
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
    title: 'Салон красоты / Услуги',
    target: 'Подобрать мастера и свободное окошко',
    image: '/images/niches/salon.jpg',
    icon: Scissors,
    description: 'Для барбершопов, студий маникюра, SPA, стилистов и массажных кабинетов.',
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
    title: 'Instagram / Telegram магазин',
    target: 'Проверить наличие по каталогу и оформить заказ',
    image: '/images/niches/store.jpg',
    icon: ShoppingBag,
    description: 'Для шоурумов одежды, магазинов электроники, косметики и подарков.',
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
  },
  {
    id: 'other',
    title: 'Другая ниша (Свой бизнес)',
    target: 'Выявить запрос, сориентировать по прайсу и записать на встречу',
    icon: Briefcase,
    description: 'Для автосервисов, недвижимости, юристов, консалтинга, туризма и ремонта.',
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
  }
];

export default function NewAgentWizardPage() {
  const router = useRouter();
  const { createAgent, openSandbox, showToast, user } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate>(NICHES[0]);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [customBusinessName, setCustomBusinessName] = useState<string>('');

  // Step 2 state
  const [priceList, setPriceList] = useState<string>(NICHES[0].defaultPrice);
  const [questions, setQuestions] = useState<string[]>(NICHES[0].defaultQuestions);

  // Step 3 state
  const [botToken, setBotToken] = useState<string>('');
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState<boolean>(true);
  const [autoReminderEnabled, setAutoReminderEnabled] = useState<boolean>(true);

  // Step 4 state
  const [agentName, setAgentName] = useState<string>(NICHES[0].defaultName);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedAgentId, setSavedAgentId] = useState<string | null>(null);

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
  const generatedSystemPrompt = `Ты — профессиональный ИИ-сотрудник по продажам для компании "${selectedNiche.title}".
Твое главное имя: "${agentName}".

БИЗНЕС-ЦЕЛЬ:
${selectedNiche.target}.

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
    ? 'Ты подключен к Google Календарю. При согласии клиента предложи свободные слоты в интервале 10:00–18:00 и подтверди авто-бронь.'
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
    const newAgent = createAgent({
      name: agentName,
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

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            await (supabase.from('agents') as any).insert({
              user_id: authUser.id,
              name: agentName,
              niche: selectedNiche.title,
              niche_id: selectedNiche.id,
              system_prompt: generatedSystemPrompt,
              price_list: priceList,
              qualification_questions: questions,
              telegram_token: botToken,
              google_calendar_enabled: googleCalendarEnabled,
              auto_reminder_enabled: autoReminderEnabled,
              is_active: true
            });
          }
        }
      } catch {}
    }

    setSavedAgentId(newAgent.id);
    setIsSaved(true);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Title */}
      <div className="pb-3 border-b border-[var(--border)]">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Мастер создания ИИ-сотрудника
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Настройка сценария квалификации, прайса и каналов в 4 шага
        </p>
      </div>

      {/* Educational Collapsible Banner */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 text-xs text-[var(--text-secondary)] space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[var(--text-primary)] block leading-tight">
                Как работает ИИ-сотрудник в AI Business OS?
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Автономный консультант на базе нейросети для диалогов 24/7
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-medium cursor-pointer min-h-[36px] px-2"
          >
            <span>{isGuideOpen ? 'Скрыть' : 'Подробнее'}</span>
            {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isGuideOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>1. Ответы 24/7</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Мгновенно отвечает на русском и узбекском языках в Telegram и на сайте, консультирует по ценам.
              </p>
            </div>

            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>2. Квалификация</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Задает 3 обязательных вопроса (потребность, уровень, время) перед внесением записи.
              </p>
            </div>

            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>3. Запись в календарь</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Сверяется с графиком (10:00–18:00) и бронирует свободный слот в Google Календаре.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4-Step Stepper */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-2 sm:p-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { step: 1, title: '1. Ниша бизнеса' },
            { step: 2, title: '2. Прайс и вопросы' },
            { step: 3, title: '3. Подключения' },
            { step: 4, title: '4. Проверка и запуск' }
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-2 p-2 rounded-[6px] transition-colors ${
                currentStep === s.step
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : currentStep > s.step
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 font-medium ${
                  currentStep === s.step
                    ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                    : currentStep > s.step
                    ? 'bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                }`}
              >
                {currentStep > s.step ? <Check className="w-3 h-3" /> : s.step}
              </div>
              <span className="text-xs truncate">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Content Body */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-6 space-y-6 shadow-2xs">
        {/* ================= STEP 1: Ниша ================= */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Шаг 1. Выберите сферу вашего бизнеса
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                ИИ применит готовый шаблон квалификационных вопросов и формат прайса
              </p>
            </div>

            {/* Niche Cards with Real Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {NICHES.map((niche) => {
                const Icon = niche.icon;
                const isSelected = selectedNiche.id === niche.id;

                return (
                  <div
                    key={niche.id}
                    onClick={() => handleSelectNiche(niche)}
                    className={`rounded-[8px] border overflow-hidden transition-all cursor-pointer flex flex-col justify-between bg-[var(--surface)] ${
                      isSelected
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-2xs'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {/* Real Photo at top (Text strictly below photo) */}
                    {niche.image ? (
                      <div className="relative w-full aspect-[16/9] bg-[var(--surface-secondary)] overflow-hidden">
                        <Image
                          src={niche.image}
                          alt={niche.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-[var(--surface-secondary)] flex items-center justify-center relative">
                        <Icon className="w-8 h-8 text-[var(--text-muted)]" />
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content below photo */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-xs">{niche.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">
                          {niche.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--accent)] font-medium">
                        Цель: {niche.target}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Business Name if "other" is selected */}
            {selectedNiche.id === 'other' && (
              <div className="p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Уточните сферу или название бизнеса:
                </label>
                <input
                  type="text"
                  value={customBusinessName}
                  onChange={(e) => handleCustomBusinessNameChange(e.target.value)}
                  placeholder="Например: Автосервис, Юридическая фирма, Недвижимость"
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] min-h-[44px] sm:min-h-[38px]"
                />
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: Прайс и вопросы ================= */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Шаг 2. Прайс-лист и вопросы квалификации
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
                    className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    + Добавить блок FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceList(selectedNiche.defaultPrice)}
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
                className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] leading-relaxed"
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
                    className="flex-1 px-3 py-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] min-h-[44px] sm:min-h-[38px]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 3: Подключения ================= */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Шаг 3. Подключение каналов и Календаря
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
                  className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-0.5"
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
                className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] min-h-[44px] sm:min-h-[38px]"
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
                  className="h-4 w-4 text-[var(--accent)] rounded border-[var(--border)] focus:ring-[var(--focus-ring)] cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoReminder"
                  checked={autoReminderEnabled}
                  onChange={(e) => setAutoReminderEnabled(e.target.checked)}
                  className="h-4 w-4 text-[var(--accent)] rounded border-[var(--border)] focus:ring-[var(--focus-ring)] cursor-pointer"
                />
                <label htmlFor="autoReminder" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Отправлять напоминание клиенту за 2 часа до визита (1 токен)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Проверка и запуск ================= */}
        {currentStep === 4 && (
          <div className="space-y-5">
            {!isSaved ? (
              <>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Шаг 4. Проверка и сохранение
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Системный промпт автоматически сформирован на основе указанных данных
                  </p>
                </div>

                {/* Employee Name */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Имя ИИ-сотрудника
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] min-h-[44px] sm:min-h-[38px]"
                  />
                </div>

                {/* Prompt Preview */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Сформированная инструкция (System Prompt):
                  </label>
                  <pre className="p-3.5 bg-[#0B1220] text-slate-100 rounded-[6px] text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto border border-slate-800">
                    {generatedSystemPrompt}
                  </pre>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAgent}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] font-semibold py-2.5 rounded-[6px] transition-colors cursor-pointer text-xs min-h-[44px]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Сохранить и запустить сотрудника</span>
                  </button>
                </div>
              </>
            ) : (
              /* Success confirmation */
              <div className="py-6 text-center space-y-4">
                <div className="w-10 h-10 bg-[var(--success-bg)] text-[var(--success-text)] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    ИИ-сотрудник успешно создан!
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1 leading-relaxed">
                    «{agentName}» сохранен в базе и готов к работе. Вы можете проверить диалог в песочнице прямо сейчас.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                  <button
                    onClick={() => openSandbox(savedAgentId || undefined)}
                    className="px-4 py-2 text-xs font-medium text-[var(--accent-text)] bg-[var(--accent)] hover:opacity-90 rounded-[6px] transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
                  >
                    Открыть песочницу
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/agents')}
                    className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
                  >
                    Список сотрудников
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Navigation Controls */}
        {!isSaved && (
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-[6px] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>

            {currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] px-4 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
              >
                <span>Далее</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
