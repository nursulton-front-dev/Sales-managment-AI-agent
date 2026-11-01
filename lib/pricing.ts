/**
 * Gapcha AI — Единый источник правды для тарифных планов и пакетов токенов (ИИ-ответов).
 * Соответствует серверному каталогу app/api/billing/subscribe/route.ts
 * и app/api/billing/topup/route.ts.
 */

export type PlanId = 'start' | 'business' | 'pro';
export type PlanOrTrialId = PlanId | 'trial';

export interface PlanDefinition {
  id: PlanId;
  name: 'START' | 'BUSINESS' | 'PRO';
  usdPrice: number;
  usdPriceFormatted: string;
  uzsPriceFormatted: string;
  tokens: number;
  tokensFormatted: string;
  responsesFormatted: string;
  maxAgents: number;
  audience: string;
  badge?: string; // «Для растущей команды»
  features: string[];
  roadmapFeatures?: string[];
}

export interface TrialDefinition {
  id: 'trial';
  name: 'TRIAL';
  days: number;
  tokens: number;
  tokensFormatted: string;
  responsesFormatted: string;
  title: string;
  description: string;
  ctaText: string;
}

export interface TokenPackage {
  id: 'pack-mini' | 'pack-optima' | 'pack-max';
  name: string;
  tokens: number;
  tokensFormatted: string;
  responsesFormatted: string;
  usdPrice: number;
  usdPriceFormatted: string;
  uzsPriceFormatted: string;
  description: string;
}

export const TRIAL_PLAN: TrialDefinition = {
  id: 'trial',
  name: 'TRIAL',
  days: 3,
  tokens: 100,
  tokensFormatted: '100 токенов',
  responsesFormatted: '100 ИИ-ответов',
  title: 'Попробовать бесплатно',
  description: '3 дня и 100 тестовых ИИ-ответов после подтверждения почты. Оплата не требуется на этапе регистрации.',
  ctaText: 'Начать бесплатно',
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  start: {
    id: 'start',
    name: 'START',
    usdPrice: 29,
    usdPriceFormatted: '$29',
    uzsPriceFormatted: '370 000 сум',
    tokens: 2000,
    tokensFormatted: '2 000 токенов',
    responsesFormatted: '2 000 ИИ-ответов / мес',
    maxAgents: 1,
    audience: 'Один ИИ-сотрудник для обработки обращений и сбора заявок',
    features: [
      '1 активный ИИ-сотрудник',
      '2 000 ИИ-ответов в месяц (1 ответ = 1 токен)',
      'Индивидуальная база знаний и прайс-лист',
      'Вопросы квалификации клиентов',
      'Сбор контактов и воронка лидов',
      'Чат на сайте, Telegram и Instagram Direct',
      'Синхронизация с 1 Google Календарём',
      'Ручной перехват диалога оператором',
    ],
    roadmapFeatures: [
      'Базовые шаблоны ниш',
    ],
  },
  business: {
    id: 'business',
    name: 'BUSINESS',
    usdPrice: 59,
    usdPriceFormatted: '$59',
    uzsPriceFormatted: '750 000 сум',
    tokens: 6000,
    tokensFormatted: '6 000 токенов',
    responsesFormatted: '6 000 ИИ-ответов / мес',
    maxAgents: 3,
    audience: 'Автоматизация записи и работа команды до 3 сотрудников',
    badge: 'Для растущей команды',
    features: [
      'До 3 ИИ-сотрудников под разные задачи и роли',
      '6 000 ИИ-ответов в месяц',
      'Все возможности тарифа START',
      'Автоматическая проверка свободных слотов в календаре',
      'Командная работа и распределение диалогов',
      'Приоритетная обработка очереди сообщений',
      'Отдельные инструкции и промпты для каждого агента',
    ],
    roadmapFeatures: [
      'Автоматические напоминания клиентам перед визитом',
      'Несколько независимых календарей',
      'Повторные сообщения клиентам по регламенту',
    ],
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    usdPrice: 119,
    usdPriceFormatted: '$119',
    uzsPriceFormatted: '1 500 000 сум',
    tokens: 15000,
    tokensFormatted: '15 000 токенов',
    responsesFormatted: '15 000 ИИ-ответов / мес',
    maxAgents: 10,
    audience: 'Несколько направлений бизнеса, аналитика и внешние системы',
    features: [
      'До 10 ИИ-сотрудников под филиалы и отделы продаж',
      '15 000 ИИ-ответов в месяц',
      'Все возможности тарифа BUSINESS',
      'Разделение баз знаний по направлениям компании',
      'Расширенная выгрузка данных диалогов и лидов',
      'Журнал аудита действий и сессий',
    ],
    roadmapFeatures: [
      'Расписание отдельных специалистов команды',
      'Сквозная аналитика и отчёты по направлениям',
      'Прямая интеграция с Bitrix24 и вебхуки',
      'Рекомендации ИИ по пробелам в базе знаний',
    ],
  },
};

export const PLANS_LIST: PlanDefinition[] = [
  PLANS.start,
  PLANS.business,
  PLANS.pro,
];

export const ROADMAP_MODULES = [
  {
    title: 'Напоминания клиентам',
    tier: 'BUSINESS / PRO',
    status: 'В разработке',
    description: 'Автоматическое сообщение в Telegram/WhatsApp с подтверждением или переносом визита накануне встречи.',
  },
  {
    title: 'Несколько календарей и расписание специалистов',
    tier: 'BUSINESS / PRO',
    status: 'В разработке',
    description: 'Привязка независимых календарей к конкретным врачам, мастерам или менеджерам с персональными слотами.',
  },
  {
    title: 'Интеграция с Bitrix24 и Webhooks',
    tier: 'PRO',
    status: 'Запланировано',
    description: 'Автоматическая передача квалифицированных лидов, контактных данных и истории общения в корпоративную CRM.',
  },
  {
    title: 'WhatsApp Business Cloud API',
    tier: 'Все тарифы',
    status: 'Бета-тест',
    description: 'Прямое подключение официального номера WhatsApp через Meta Cloud API без сторонних рисков.',
  },
];

export function getMaxAgentsForPlan(planId: string): number {
  const norm = planId.toLowerCase() as PlanId;
  return PLANS[norm]?.maxAgents || 1;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'pack-mini',
    name: 'Пакет Мини',
    tokens: 1000,
    tokensFormatted: '1 000 токенов',
    responsesFormatted: '1 000 ИИ-ответов',
    usdPrice: 10,
    usdPriceFormatted: '$10',
    uzsPriceFormatted: '125 000 сум',
    description: 'Быстрое пополнение при пиковом наплыве клиентов',
  },
  {
    id: 'pack-optima',
    name: 'Пакет Оптима',
    tokens: 3000,
    tokensFormatted: '3 000 токенов',
    responsesFormatted: '3 000 ИИ-ответов',
    usdPrice: 25,
    usdPriceFormatted: '$25',
    uzsPriceFormatted: '320 000 сум',
    description: 'Оптимальный резерв для активных сезонных продаж',
  },
  {
    id: 'pack-max',
    name: 'Пакет Макс',
    tokens: 10000,
    tokensFormatted: '10 000 токенов',
    responsesFormatted: '10 000 ИИ-ответов',
    usdPrice: 70,
    usdPriceFormatted: '$70',
    uzsPriceFormatted: '890 000 сум',
    description: 'Максимальный пакет для бесперебойной работы компании',
  },
];
