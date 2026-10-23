/**
 * AI Business OS — Единый источник правды для тарифных планов и пакетов токенов.
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
  maxAgents: number;
  audience: string;
  badge?: string; // Мягкая визуальная подсказка: «Для растущей команды»
  features: string[];
}

export interface TrialDefinition {
  id: 'trial';
  name: 'TRIAL';
  days: number;
  tokens: number;
  tokensFormatted: string;
  title: string;
  description: string;
  ctaText: string;
}

export interface TokenPackage {
  id: 'pack-mini' | 'pack-optima' | 'pack-max';
  name: string;
  tokens: number;
  tokensFormatted: string;
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
  title: 'Попробовать бесплатно',
  description: '3 дня и 100 токенов после подтверждения почты. Оплата не требуется на этапе регистрации.',
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
    maxAgents: 1,
    audience: 'Для первого сотрудника',
    features: [
      'Ответы по вашему прайсу',
      'Лиды и диалоги',
      'Запись в Google Календарь',
      'Передача человеку',
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
    maxAgents: 3,
    audience: 'Для растущей команды',
    badge: 'Для растущей команды',
    features: [
      'Всё из START',
      'Несколько календарей',
      'Напоминания клиентам',
      'Воронка обращений',
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
    maxAgents: 10,
    audience: 'Для нескольких направлений',
    features: [
      'Всё из BUSINESS',
      'Отдельные настройки агентов',
      'Расписание специалистов',
      'Отчёты по направлениям',
    ],
  },
};

export const PLANS_LIST: PlanDefinition[] = [
  PLANS.start,
  PLANS.business,
  PLANS.pro,
];

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'pack-mini',
    name: 'Пакет Мини',
    tokens: 1000,
    tokensFormatted: '1 000 токенов',
    usdPrice: 10,
    usdPriceFormatted: '$10',
    uzsPriceFormatted: '125 000 сум',
    description: 'Для быстрого пополнения при пиковой нагрузке',
  },
  {
    id: 'pack-optima',
    name: 'Пакет Оптима',
    tokens: 3000,
    tokensFormatted: '3 000 токенов',
    usdPrice: 25,
    usdPriceFormatted: '$25',
    uzsPriceFormatted: '320 000 сум',
    description: 'Оптимальный резерв для активных продаж',
  },
  {
    id: 'pack-max',
    name: 'Пакет Макс',
    tokens: 10000,
    tokensFormatted: '10 000 токенов',
    usdPrice: 70,
    usdPriceFormatted: '$70',
    uzsPriceFormatted: '890 000 сум',
    description: 'Максимальный пакет для непрерывной работы',
  },
];
