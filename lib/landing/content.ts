/**
 * gapcha AI — Текстовый и контентный модуль лендинга.
 * Двуязычный словарь (Русский и Узбекский (латиница)).
 * Синхронизирован с фактическими возможностями продукта и тарифами (lib/pricing.ts).
 */

import { PLANS, TRIAL_PLAN } from '@/lib/pricing';

export type LandingLocale = 'ru' | 'uz';

export interface LandingContent {
  meta: {
    title: string;
    description: string;
    keywords: string;
    ogTitle: string;
    ogDescription: string;
  };
  nav: {
    howItWorks: string;
    demo: string;
    scenarios: string;
    features: string;
    integrations: string;
    pricing: string;
    faq: string;
    login: string;
    register: string;
    dashboard: string;
  };
  hero: {
    badge: string;
    headline: string;
    headlineAccent: string;
    subhead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trialNote: string;
    dialogCard: {
      title: string;
      channelBadge: string;
      statusBadge: string;
      clientQuestion: string;
      assistantAnswer: string;
      clientFollowup: string;
      assistantClosing: string;
      leadStatus: string;
    };
  };
  howItWorks: {
    tag: string;
    title: string;
    subtitle: string;
    steps: Array<{
      number: string;
      title: string;
      description: string;
      badge: string;
    }>;
  };
  demo: {
    tag: string;
    title: string;
    subtitle: string;
    tabs: Array<{
      id: string;
      label: string;
      title: string;
      description: string;
      messages: Array<{
        sender: 'client' | 'ai' | 'operator' | 'system';
        senderName: string;
        text: string;
        time: string;
        badge?: string;
      }>;
      sideNoteTitle: string;
      sideNoteText: string;
    }>;
  };
  scenarios: {
    tag: string;
    title: string;
    subtitle: string;
    items: Array<{
      niche: string;
      badge: string;
      icon: 'education' | 'marketing' | 'services';
      problem: string;
      solution: string;
      example: {
        query: string;
        reply: string;
      };
      benefit: string;
    }>;
  };
  features: {
    tag: string;
    title: string;
    subtitle: string;
    items: Array<{
      title: string;
      description: string;
      result: string;
      icon: 'clock' | 'book' | 'userCheck' | 'funnel' | 'inbox' | 'calendar';
    }>;
  };
  integrations: {
    tag: string;
    title: string;
    subtitle: string;
    items: Array<{
      id: string;
      name: string;
      type: string;
      description: string;
      requirement: string;
      status: string;
    }>;
  };
  pricing: {
    tag: string;
    title: string;
    subtitle: string;
    trialBadge: string;
    trialText: string;
    tokenExplanation: string;
    paymentStatusNote: string;
    monthPeriod: string;
    ctaTrial: string;
    ctaSelect: string;
    plans: Array<{
      id: string;
      name: string;
      priceUsd: string;
      priceUzs: string;
      tokens: string;
      audience: string;
      badge?: string;
      features: string[];
    }>;
  };
  faq: {
    tag: string;
    title: string;
    subtitle: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  finalCta: {
    title: string;
    subtitle: string;
    button: string;
    note: string;
  };
  footer: {
    tagline: string;
    rights: string;
    privacy: string;
    dataDeletion: string;
    support: string;
    telegramBot: string;
    language: string;
  };
}

export const LANDING_CONTENT: Record<LandingLocale, LandingContent> = {
  ru: {
    meta: {
      title: 'gapcha AI — ИИ-сотрудники для продаж и клиентского сервиса',
      description: 'Отвечайте клиентам вовремя — даже когда вы заняты. Автоответы в Telegram, Instagram Direct и на сайте, квалификация обращений и сбор лидов из одного кабинета.',
      keywords: 'ИИ продажи, Telegram бот, Telegram Business секретарь, чат на сайте, Instagram Direct автоответы, CRM лиды, gapcha AI, Узбекистан',
      ogTitle: 'gapcha AI — Платформа умных ответов для бизнеса в Узбекистане',
      ogDescription: 'Мгновенные ответы клиентам 24/7 в Telegram, Instagram и на сайте. Квалификация потребностей и сбор лидов по вашей базе знаний.',
    },
    nav: {
      howItWorks: 'Как это работает',
      demo: 'Демонстрация',
      scenarios: 'Сценарии',
      features: 'Возможности',
      integrations: 'Интеграции',
      pricing: 'Тарифы',
      faq: 'Вопросы и ответы',
      login: 'Войти',
      register: 'Попробовать бесплатно',
      dashboard: 'В кабинет',
    },
    hero: {
      badge: 'Платформа умных ответов для малого бизнеса и услуг',
      headline: 'Отвечайте клиентам вовремя —',
      headlineAccent: 'даже когда заняты',
      subhead: 'gapcha AI мгновенно отвечает на частые вопросы по вашим ценам и услугам в Telegram, Instagram Direct и на сайте. Квалифицирует запрос, фиксирует контакты и передаёт диалог человеку, когда требуется участие менеджера.',
      ctaPrimary: 'Попробовать бесплатно',
      ctaSecondary: 'Посмотреть, как работает',
      trialNote: '100 бесплатных ответов на 3 дня • Без привязки карты',
      dialogCard: {
        title: 'Пример диалога',
        channelBadge: 'Telegram Business',
        statusBadge: 'ИИ на связи',
        clientQuestion: 'Здравствуйте! Подскажите, сколько стоит обучение IELTS и есть ли группы по выходным?',
        assistantAnswer: 'Здравствуйте! Подготовка к IELTS стоит 850 000 сум в месяц (3 занятия в неделю по 90 минут, все материалы включены). По выходным есть утренняя группа в субботу с 10:00. Какой у вас ориентировочный уровень английского?',
        clientFollowup: 'У меня Intermediate. Хотел бы сначала попробовать формат.',
        assistantClosing: 'Отлично! В субботней группе как раз осталось 2 места. Давайте запишем вас на бесплатный пробный урок для тестирования уровня. Как к вам удобнее обращаться и какой номер записать?',
        leadStatus: 'Лид зафиксирован: Алишер • IELTS • Ожидает подтверждения',
      },
    },
    howItWorks: {
      tag: 'Простой запуск',
      title: 'Три шага к первым автоответам',
      subtitle: 'Без сложных настроек и программирования. Вы управляете логикой ответов обычным понятным текстом.',
      steps: [
        {
          number: '01',
          title: 'Добавьте информацию и цены',
          description: 'Загрузите описание ваших услуг, прайс-лист, частые вопросы и правила общения. Помощник опирается только на ваши факты и не придумывает скидок.',
          badge: 'База знаний и прайс',
        },
        {
          number: '02',
          title: 'Подключите доступный канал',
          description: 'Привяжите личный аккаунт Telegram (Telegram Business), своего бота, профессиональный Instagram Direct или установите виджет на сайт одной строчкой кода.',
          badge: 'Telegram / Instagram / Сайт',
        },
        {
          number: '03',
          title: 'Проверьте ответы и начните работу',
          description: 'Протестируйте помощника в безопасной песочнице прямо в панели управления, убедитесь в качестве диалога и включите приём обращений.',
          badge: 'Тест-драйв перед запуском',
        },
      ],
    },
    demo: {
      tag: 'Продукт в действии',
      title: 'Как gapcha AI ведёт клиента к целевому действию',
      subtitle: 'Нажмите на этапы, чтобы увидеть реальную логику ответов, квалификацию и передачу диалога оператору.',
      tabs: [
        {
          id: 'inquiry',
          label: '1. Точный ответ по прайсу',
          title: 'Быстрый ответ без шаблонных отписок',
          description: 'Клиент задаёт конкретный вопрос по стоимости и условиям. ИИ сразу выдаёт актуальные данные из вашей базы знаний.',
          messages: [
            {
              sender: 'client',
              senderName: 'Клиент (Telegram)',
              text: 'Добрый день! Сколько стоит разработка брендбука и презентации для компании?',
              time: '14:20',
            },
            {
              sender: 'ai',
              senderName: 'gapcha AI (Ассистент)',
              text: 'Здравствуйте! Разработка базового брендбука стоит от $600 (срок 10–14 рабочих дней), корпоративная презентация — от $300. Если заказываете комплектом, презентацию оформляем в едином стиле бренда. Подскажите, в какой сфере работает ваша компания?',
              time: '14:20',
              badge: 'Ответ за 1.2 сек',
            },
          ],
          sideNoteTitle: 'Контроль фактов',
          sideNoteText: 'ИИ не выдумывает несуществующие пакеты услуг. Все цены и сроки берутся строго из введённого вами прайс-листа.',
        },
        {
          id: 'qualify',
          label: '2. Квалификация и контакт',
          title: 'Выявление задачи за 1–2 вопроса',
          description: 'Вместо длинных опросников помощник мягко ведёт диалог и помогает клиенту сформулировать потребность.',
          messages: [
            {
              sender: 'client',
              senderName: 'Клиент (Telegram)',
              text: 'У нас сеть кофеен в Ташкенте, открываем ещё две точки. Нужна свежая презентация для арендодателей.',
              time: '14:22',
            },
            {
              sender: 'ai',
              senderName: 'gapcha AI (Ассистент)',
              text: 'Отличная задача! Для презентаций арендодателям мы делаем акцент на трафике, визуализации концепта и показателях посадочных мест. Готовы показать примеры готовых ресторанных кейсов. На какой номер в Telegram отправить портфолио?',
              time: '14:23',
              badge: 'Квалификация',
            },
            {
              sender: 'client',
              senderName: 'Клиент (Telegram)',
              text: '+998 90 123-45-67, меня зовут Сардор.',
              time: '14:24',
            },
          ],
          sideNoteTitle: 'Автоматический лид',
          sideNoteText: 'Контакт сразу записывается в раздел «Лиды и записи» с пометкой ниши (общепит/кофейни) и телефона.',
        },
        {
          id: 'handover',
          label: '3. Перехват оператором',
          title: 'Человек всегда имеет главный приоритет',
          description: 'Как только менеджер или владелец отправляет сообщение в чат, ИИ немедленно уступает диалог человеку.',
          messages: [
            {
              sender: 'system',
              senderName: 'Система gapcha AI',
              text: 'Менеджер Алишер подключился к диалогу. Автоответы ИИ временно приостановлены.',
              time: '14:25',
            },
            {
              sender: 'operator',
              senderName: 'Алишер (Ведущий менеджер)',
              text: 'Сардор, приветствую! Отправил вам 2 презентации ресторанных проектов в личные сообщения. Посмотрите, пожалуйста, и давайте обсудим структуру вашей сети.',
              time: '14:26',
              badge: 'Ручной ответ',
            },
          ],
          sideNoteTitle: 'Безопасность общения',
          sideNoteText: 'Никаких накладок и одновременных сообщений. ИИ возобновит ответы только тогда, когда оператор нажмёт кнопку возобновления.',
        },
      ],
    },
    scenarios: {
      tag: 'Примеры для Узбекистана',
      title: 'Три проверенных сценария работы',
      subtitle: 'Посмотрите, как помощник решает повседневные задачи в разных сферах бизнеса.',
      items: [
        {
          niche: 'Учебные центры и языковые школы',
          badge: 'Образование',
          icon: 'education',
          problem: 'Клиенты пишут вечерами и по выходным: спрашивают уровни, стоимость, преподавателей и забывают записаться.',
          solution: 'gapcha AI отвечает на вопросы о программах обучения, подбирает удобное время и записывает на бесплатный пробный урок.',
          example: {
            query: '«Сколько длится курс General English для взрослых?»',
            reply: '«Курс длится 3 месяца на каждый уровень. Занятия 3 раза в неделю. Предлагаю пройти бесплатное 15-минутное тестирование уровня — когда вам удобнее подойти?»',
          },
          benefit: 'Заявки на пробный урок фиксируются в CRM сразу с указанием языка и уровня.',
        },
        {
          niche: 'Маркетинговые и digital-агентства',
          badge: 'B2B услуги',
          icon: 'marketing',
          problem: 'Много обращений без бюджета или конкретной задачи, отнимающих время старших специалистов.',
          solution: 'Помощник за 2 вопроса выясняет сферу бизнеса, текущий объём рекламы и цель обращения, отсеивая нецелевой трафик.',
          example: {
            query: '«Здравствуйте, вы настраиваете таргет в Instagram?»',
            reply: '«Здравствуйте! Да, ведем таргет под ключ. Подскажите, какой у вас проект и какой ориентировочный рекламный бюджет планируете на первый месяц?»',
          },
          benefit: 'На созвон к ведущему специалисту приходят только квалифицированные клиенты.',
        },
        {
          niche: 'Компании сферы услуг и консультации',
          badge: 'Сервис и B2B',
          icon: 'services',
          problem: 'Администратор занят текущими клиентами и отвечает на новые сообщения с задержкой в 30–60 минут.',
          solution: 'gapcha AI мгновенно ориентирует по стоимости услуг, графику работы и фиксирует контакт для обратного звонка.',
          example: {
            query: '«Работаете ли вы сегодня и сколько стоит первичный приём?»',
            reply: '«Да, сегодня работаем до 19:00. Первичная консультация стоит 200 000 сум. Могу записать вас на свободное время или соединить с дежурным специалистом.»',
          },
          benefit: 'Клиент получает ответ за 2 секунды и не уходит к конкурентам.',
        },
      ],
    },
    features: {
      tag: 'Реальные возможности',
      title: 'Всё необходимое для контроля диалогов',
      subtitle: 'Никаких абстрактных функций. Только то, что проверено в коде и ежедневно работает в системе.',
      items: [
        {
          title: 'Круглосуточный приём обращений',
          description: 'Клиенты получают внятные ответы в нерабочее время, ночью и в праздники без ожидания утренней смены.',
          result: '0 потерянных ночных заявок',
          icon: 'clock',
        },
        {
          title: 'Ответы строго по вашим правилам',
          description: 'ИИ читает только загруженную базу знаний компании. Если информации нет, честно предлагает позвать человека.',
          result: 'Защита от выдуманных цен и обещаний',
          icon: 'book',
        },
        {
          title: 'Ручной перехват в любой момент',
          description: 'Менеджер видит весь диалог и может ответить клиенту сам. ИИ мгновенно уступает диалог при сообщении человека.',
          result: 'Полный контроль со стороны команды',
          icon: 'userCheck',
        },
        {
          title: 'Единая воронка лидов без дублей',
          description: 'Контакты, телефоны и запросы клиентов собираются в единую таблицу. Повторные сообщения обновляют существующую карточку.',
          result: 'Порядок в базе контактов',
          icon: 'funnel',
        },
        {
          title: 'Управление из одного кабинета',
          description: 'Сообщения из Telegram, Instagram и виджета сайта стекаются в общий раздел диалогов без переключения между приложениями.',
          result: 'Все каналы в едином окне',
          icon: 'inbox',
        },
        {
          title: 'Учёт графика и проверка слотов',
          description: 'При подключении Google Календаря ИИ проверяет рабочие часы (например, 09:00–19:00) и предлагает только свободные окна.',
          result: 'Защита от накладок в расписании',
          icon: 'calendar',
        },
      ],
    },
    integrations: {
      tag: 'Каналы связи',
      title: 'Подключайте туда, где уже общаются ваши клиенты',
      subtitle: 'Разделяем каналы входящих сообщений и служебные инструменты расписания.',
      items: [
        {
          id: 'tg_business',
          name: 'Telegram Business (Секретарь)',
          type: 'Канал общения',
          description: 'Подключение личного аккаунта Telegram через сервисного бота @gapcha_assistant_bot. ИИ отвечает в личных чатах аккаунта от вашего имени.',
          requirement: 'Требуется подписка Telegram Premium на личном аккаунте.',
          status: 'Работает',
        },
        {
          id: 'tg_bot',
          name: 'Свой Telegram-бот',
          type: 'Канал общения',
          description: 'Подключение независимого бота компании через токен BotFather. Подходит для приёма входящих заявок и публичных каталогов.',
          requirement: 'Бесплатный токен бота из @BotFather.',
          status: 'Работает',
        },
        {
          id: 'widget',
          name: 'Чат на сайте (Веб-виджет)',
          type: 'Канал общения',
          description: 'Компактная кнопка чата на вашем сайте. Настраиваемые цвета, приветствие и заголовок. Устанавливается одной строчкой кода.',
          requirement: 'Любой сайт (HTML, WordPress, Tilda, Next.js).',
          status: 'Работает',
        },
        {
          id: 'instagram',
          name: 'Instagram Direct',
          type: 'Канал общения',
          description: 'Автоответы на входящие сообщения в Direct через официальный Meta Facebook Login.',
          requirement: 'Профессиональный аккаунт Instagram, связанный со страницей Facebook.',
          status: 'Подключение через Meta Login',
        },
        {
          id: 'calendar',
          name: 'Google Календарь',
          type: 'Интеграция расписания',
          description: 'Синхронизация рабочих часов и свободных окон. ИИ проверяет доступность слотов и фиксирует встречи в вашем календаре.',
          requirement: 'Аккаунт Google с рабочим календарём.',
          status: 'Синхронизация слотов',
        },
      ],
    },
    pricing: {
      tag: 'Прозрачные тарифы',
      title: 'Платите за объём ответов, а не за обещания',
      subtitle: 'Каждый тариф включает базовые возможности платформы. Различие — в числе активных ИИ-сотрудников и пакете ответов.',
      trialBadge: 'Бесплатный старт',
      trialText: '3 дня и 100 бонусных ИИ-ответов при регистрации для проверки на реальных вопросах.',
      tokenExplanation: 'Единица расхода: 1 ответ ИИ = 1 токен. При обращении клиента списывается ровно 1 единица.',
      paymentStatusNote: 'Модуль онлайн-оплаты через Payme / Click находится на стадии юридического оформления. Регистрация сразу активирует тестовый баланс, а расширенные тарифы подключаются через поддержку.',
      monthPeriod: '/ месяц',
      ctaTrial: 'Попробовать 100 ответов',
      ctaSelect: 'Выбрать тариф',
      plans: [
        {
          id: 'start',
          name: 'START',
          priceUsd: PLANS.start.usdPriceFormatted,
          priceUzs: PLANS.start.uzsPriceFormatted,
          tokens: PLANS.start.responsesFormatted,
          audience: PLANS.start.audience,
          features: [
            '1 активный ИИ-сотрудник',
            '2 000 ИИ-ответов в месяц',
            'Индивидуальная база знаний и прайс',
            'Вопросы квалификации клиентов',
            'Сбор лидов в CRM без дублей',
            'Telegram, Чат на сайте и Instagram Direct',
            'Синхронизация с Google Календарём',
            'Ручной перехват диалога оператором',
          ],
        },
        {
          id: 'business',
          name: 'BUSINESS',
          priceUsd: PLANS.business.usdPriceFormatted,
          priceUzs: PLANS.business.uzsPriceFormatted,
          tokens: PLANS.business.responsesFormatted,
          audience: PLANS.business.audience,
          badge: 'Оптимально для команды',
          features: [
            'До 3 ИИ-сотрудников под разные роли',
            '6 000 ИИ-ответов в месяц',
            'Все возможности тарифа START',
            'Проверка свободных слотов в календаре',
            'Командный доступ и распределение диалогов',
            'Приоритетная очередь сообщений',
            'Отдельные промпты для каждого сотрудника',
          ],
        },
        {
          id: 'pro',
          name: 'PRO',
          priceUsd: PLANS.pro.usdPriceFormatted,
          priceUzs: PLANS.pro.uzsPriceFormatted,
          tokens: PLANS.pro.responsesFormatted,
          audience: PLANS.pro.audience,
          features: [
            'До 10 ИИ-сотрудников под филиалы компании',
            '15 000 ИИ-ответов в месяц',
            'Все возможности тарифа BUSINESS',
            'Разделение баз знаний по направлениям',
            'Расширенная выгрузка истории диалогов',
            'Журнал аудита действий и сессий',
          ],
        },
      ],
    },
    faq: {
      tag: 'Ответы на частые вопросы',
      title: 'Всё, что важно знать перед подключением',
      subtitle: 'Честные ответы об устройстве системы, правилах платформ и безопасности данных.',
      items: [
        {
          question: 'Чем подключение аккаунта (Telegram Business) отличается от создания бота?',
          answer: 'Telegram Business позволяет подключить вашего ИИ-секретаря прямо к личному или рабочему номеру: бот отвечает клиентам в ваших личных чатах от вашего имени. Обычный Telegram-бот — это отдельный контакт (например, @my_company_bot), которому клиенты пишут целенаправленно.',
        },
        {
          question: 'Какие условия нужны для подключения Telegram Business?',
          answer: 'Для режима секретаря требуется подписка Telegram Premium на подключаемом аккаунте (это официальное требование Telegram для раздела Business). Подключение выполняется в 2 шага через служебного бота @gapcha_assistant_bot.',
        },
        {
          question: 'Как подключить Instagram Direct и почему требуется страница Facebook?',
          answer: 'Instagram Graph API работает строго через экосистему Meta: ваш аккаунт Instagram должен быть переведён в статус профессионального (бизнес или автор) и привязан к публичной странице Facebook. Авторизация проходит через официальный Meta Login.',
        },
        {
          question: 'Откуда ИИ знает цены и услуги моей компании?',
          answer: 'Вы сами указываете данные в разделе «База знаний» при создании сотрудника: можно вставить текст прайс-листа, описание пакетов, условия доставки и ответы на частые вопросы. ИИ отвечает строго по этому тексту и не придумывает того, чего в нём нет.',
        },
        {
          question: 'Что произойдёт, если клиент задаст нестандартный вопрос?',
          answer: 'Если в базе знаний нет точного ответа, ИИ не станет фантазировать. Он вежливо сообщит, что уточнит информацию у специалистов, сохранит контакт клиента и предложит дождаться ответа менеджера.',
        },
        {
          question: 'Может ли человек вмешаться в диалог и как это работает?',
          answer: 'Да, в любой момент. Как только вы или ваш оператор пишете сообщение в чат с клиентом, автоответы ИИ немедленно приостанавливаются (режим Human Takeover). Возобновить автоответы можно одной кнопкой в панели управления.',
        },
        {
          question: 'Что входит в бесплатный пробный период?',
          answer: 'Сразу после регистрации и подтверждения почты вам начисляется 100 бесплатных ответов на 3 дня. Вы можете создать ИИ-сотрудника, заполнить базу знаний и полностью протестировать его в песочнице или на живом канале без привязки банковской карты.',
        },
        {
          question: 'Как рассчитывается баланс ответов?',
          answer: 'Один ответ ИИ клиенту расходует 1 токен из вашего баланса. Если клиент прислал сообщение, на которое ответил человек (или диалог на паузе), токены не списываются. Баланс отображается в шапке кабинета в реальном времени.',
        },
        {
          question: 'Как временно отключить помощника или поставить на паузу?',
          answer: 'В разделе «Интеграции» или карточке сотрудника есть переключатель активности. Вы можете поставить автоответы на паузу в один клик: диалоги останутся доступны для ручной переписки.',
        },
      ],
    },
    finalCta: {
      title: 'Перестаньте терять клиентов из-за долгих ответов',
      subtitle: 'Подключите gapcha AI за 10 минут и протестируйте автоответы на первых 100 вопросах бесплатно.',
      button: 'Зарегистрироваться бесплатно',
      note: '100 ответов при регистрации • Без привязки карты • Быстрый старт',
    },
    footer: {
      tagline: 'Платформа умных ответов и управления диалогами для бизнеса.',
      rights: '© 2026 gapcha AI. Все права защищены.',
      privacy: 'Политика конфиденциальности',
      dataDeletion: 'Удаление данных',
      support: 'Поддержка: privacy@gapcha.ai',
      telegramBot: 'Служебный бот: @gapcha_assistant_bot',
      language: 'Язык интерфейса',
    },
  },

  uz: {
    meta: {
      title: "gapcha AI — Savdo va mijozlarga xizmat ko'rsatish uchun AI-xodimlar",
      description: "Mijozlarga o'z vaqtida javob bering — hatto band bo'lsangiz ham. Telegram, Instagram Direct va saytda tezkor javoblar, mijozlarni saralash va yagona kabinetda boshqaruv.",
      keywords: "AI savdo, Telegram bot, Telegram Business kotib, sayt uchun chat, Instagram Direct avtojavoblar, CRM lidlar, gapcha AI, O'zbekiston",
      ogTitle: "gapcha AI — O'zbekiston biznesi uchun aqlli javoblar platformasi",
      ogDescription: "Telegram, Instagram va saytingizda 24/7 tezkor javoblar. Ehtiyojlarni aniqlash va o'z bilimlar bazangiz asosida lidlarni yig'ish.",
    },
    nav: {
      howItWorks: 'Qanday ishlaydi',
      demo: 'Namoyish',
      scenarios: 'Ssenariylar',
      features: 'Imkoniyatlar',
      integrations: 'Integratsiyalar',
      pricing: 'Tariflar',
      faq: "Ko'p so'raladigan savollar",
      login: 'Kirish',
      register: "Bepul sinab ko'rish",
      dashboard: 'Kabinetga',
    },
    hero: {
      badge: "Kichik biznes va xizmat ko'rsatish sohasi uchun aqlli javoblar",
      headline: "Mijozlarga o'z vaqtida javob bering —",
      headlineAccent: "hatto band bo'lsangiz ham",
      subhead: "gapcha AI Telegram, Instagram Direct va saytingizda xizmatlar hamda narxlar bo'yicha darhol javob beradi. Mijoz ehtiyojini aniqlaydi, kontaktlarni saqlaydi va zarur bo'lganda suhbatni menejerga topshiradi.",
      ctaPrimary: "Bepul sinab ko'rish",
      ctaSecondary: "Qanday ishlashini ko'rish",
      trialNote: "Ro'yxatdan o'tganda 100 ta bepul javob • Karta talab qilinmaydi",
      dialogCard: {
        title: 'Muloqot misoli',
        channelBadge: 'Telegram Business',
        statusBadge: 'AI aloqada',
        clientQuestion: 'Assalomu alaykum! IELTS kurslari qancha turadi va dam olish kunlari darslar bormi?',
        assistantAnswer: "Assalomu alaykum! IELTS tayyorlov kursi oyiga 850 000 so'm (haftada 3 marta 90 daqiqadan, barcha o'quv materiallari ichida). Shanba kunlari soat 10:00 da ertalabki guruhimiz bor. Hozirgi ingliz tili darajangiz taxminan qanday?",
        clientFollowup: "Menda Intermediate daraja. Avval formatni ko'rmoqchi edim.",
        assistantClosing: "Juda yaxshi! Shanba kungi guruhimizda aynan 2 ta joy qoldi. Darajangizni aniqlash va ustoz bilan tanishish uchun bepul sinov darsiga yozib qo'yaymi? Ismingiz va telefon raqamingizni qoldirsangiz kifoya.",
        leadStatus: "Lid saqlandi: Alisher • IELTS • Tasdiqlash kutilmoqda",
      },
    },
    howItWorks: {
      tag: 'Oddiy ishga tushirish',
      title: 'Dastlabki avtojavoblar uchun uch qadam',
      subtitle: "Murakkab sozlamalar va dasturlashsiz. Yordamchi mantiqini oddiy tushunarli matn orqali boshqarasiz.",
      steps: [
        {
          number: '01',
          title: "Ma'lumotlar va narxlarni kiriting",
          description: "Xizmatlar tavsifi, amaldagi narxlar, ko'p beriladigan savollar va qoidalarni kiriting. Yordamchi faqat siz ko'rsatgan dalillarga tayanadi.",
          badge: "Bilimlar bazasi va narxlar",
        },
        {
          number: '02',
          title: 'Qulay aloqa kanalini ulang',
          description: "Shaxsiy Telegram hisobingizni (Telegram Business), alohida botni, Instagram Direct-ni ulang yoki saytingizga vidjet kodini joylashtiring.",
          badge: 'Telegram / Instagram / Sayt',
        },
        {
          number: '03',
          title: 'Javoblarni sinab ko\'ring va boshlang',
          description: "Kabinet ichidagi xavfsiz sinov maydonida yordamchini savollar bilan tekshiring, javoblar sifatiga ishonch hosil qilib, ishga tushiring.",
          badge: 'Ishga tushirishdan oldin sinov',
        },
      ],
    },
    demo: {
      tag: 'Mahsulot amalda',
      title: 'gapcha AI mijozni maqsadli natijaga qanday olib boradi',
      subtitle: "Javoblar sifati, mijozni saralash va muloqotni insonga topshirish jarayonini ko'rish uchun bosqichlarni bosing.",
      tabs: [
        {
          id: 'inquiry',
          label: '1. Narxlar bo\'yicha aniq javob',
          title: 'Qolipdagi quruq javoblarsiz aniqlik',
          description: "Mijoz xizmat narxi va shartlarini so'raganda, AI siz kiritgan ma'lumotlar asosida darhol to'liq javob qaytaradi.",
          messages: [
            {
              sender: 'client',
              senderName: 'Mijoz (Telegram)',
              text: "Assalomu alaykum! Kompaniya uchun brendbuk va taqdimot tayyorlash narxi qancha?",
              time: '14:20',
            },
            {
              sender: 'ai',
              senderName: 'gapcha AI (Yordamchi)',
              text: "Assalomu alaykum! Asosiy brendbuk ishlab chiqish $600 dan boshlanadi (muddati 10–14 ish kuni), korporativ taqdimot esa $300 dan. Ikkalasini birgalikda buyurtma qilsangiz, taqdimotni brendingizning yagona uslubida tayyorlaymiz. Kompaniyangiz qaysi sohada faoliyat yuritadi?",
              time: '14:20',
              badge: '1.2 soniyada javob',
            },
          ],
          sideNoteTitle: 'Faktlar nazorati',
          sideNoteText: "AI mavjud bo'lmagan xizmatlarni o'ylab topmaydi. Narxlar va muddatlar faqat siz tasdiqlagan ma'lumotlardan olinadi.",
        },
        {
          id: 'qualify',
          label: '2. Ehtiyojni aniqlash va raqam olish',
          title: '1–2 savol bilan ehtiyojni aniqlash',
          description: "Ortiqcha so'rovnomalarsiz yordamchi muloqotni samimiy davom ettiradi va mijozga maqsadini aniq aytishga yordam beradi.",
          messages: [
            {
              sender: 'client',
              senderName: 'Mijoz (Telegram)',
              text: "Toshkentda qahvaxonalar tarmog'imiz bor, yana ikkita yangi filial ochyapmiz. Joy egalari uchun yaxshi taqdimot kerak.",
              time: '14:22',
            },
            {
              sender: 'ai',
              senderName: 'gapcha AI (Yordamchi)',
              text: "Ajoyib loyiha! Joy egalari uchun taqdimotda biz mijozlar oqimi, konsept vizualizatsiyasi va o'rindiqlar ko'rsatkichlariga asosiy urg'u beramiz. Ushbu sohada tayyor keyslarimizni ko'rsatishimiz mumkin. Portfolioni qaysi raqamingizga yuboraylik?",
              time: '14:23',
              badge: 'Saralash',
            },
            {
              sender: 'client',
              senderName: 'Mijoz (Telegram)',
              text: "+998 90 123-45-67, ismim Sardor.",
              time: '14:24',
            },
          ],
          sideNoteTitle: 'Avtomatik lid',
          sideNoteText: "Aloqa raqami darhol «Mijozlar va yozuvlar» bo'limiga tarmoq sohasi (umumiy ovqatlanish) bilan birga saqlanadi.",
        },
        {
          id: 'handover',
          label: '3. Operator aralashuvi',
          title: 'Inson boshqaruvi har doim ustun',
          description: "Menejer yoki rahbar chatga yozishi bilan AI darhol javob berishni to'xtatadi va boshqaruvni insonga topshiradi.",
          messages: [
            {
              sender: 'system',
              senderName: 'gapcha AI tizimi',
              text: 'Menejer Alisher suhbatga qo\'shildi. AI avtojavoblari vaqtincha to\'xtatildi.',
              time: '14:25',
            },
            {
              sender: 'operator',
              senderName: 'Alisher (Yetakchi menejer)',
              text: "Sardor, assalomu alaykum! Qahvaxona loyihalari bo'yicha ikkita taqdimotni shaxsiy xabaringizga yubordim. Ko'rib chiqing, loyihangiz tuzilishini birgalikda muhokama qilamiz.",
              time: '14:26',
              badge: "Qo'lda javob",
            },
          ],
          sideNoteTitle: 'Muloqot xavfsizligi',
          sideNoteText: "Bir vaqtning o'zida ikkita xabar ketishi holatlari bo'lmaydi. Faqat operator tugmani bosgandagina AI javoblari qayta yoqiladi.",
        },
      ],
    },
    scenarios: {
      tag: "O'zbekiston uchun misollar",
      title: 'Uchta sinovdan o\'tgan ish ssenariysi',
      subtitle: 'Yordamchi turli sohalardagi kundalik vazifalarni qanday yengillashtirishini ko\'ring.',
      items: [
        {
          niche: "O'quv markazlari va kurslar",
          badge: "Ta'lim",
          icon: 'education',
          problem: "Mijozlar kechqurun va dam olish kunlari yozishadi: narxlar, dars vaqtlari, o'qituvchilar haqida so'rab, keyin esdan chiqarishadi.",
          solution: "gapcha AI o'quv dasturlari bo'yicha to'liq ma'lumot beradi, qulay vaqtni taklif qiladi va bepul sinov darsiga yozadi.",
          example: {
            query: "«Kattalar uchun General English kursi qancha davom etadi?»",
            reply: "«Har bir daraja 3 oy davom etadi. Haftada 3 marta dars. Darajangizni aniqlash uchun bepul 15 daqiqalik testdan o'tishni taklif qilaman — qaysi kun sizga qulay?»",
          },
          benefit: "Sinov darsiga arizalar til va daraja ko'rsatilgan holda CRM-ga avtomatik tushadi.",
        },
        {
          niche: "Marketing va digital agentliklar",
          badge: 'B2B xizmatlar',
          icon: 'marketing',
          problem: "Byudjeti yoki aniq maqsadi bo'lmagan so'rovlar mutaxassislarning ko'p vaqtini oladi.",
          solution: "Yordamchi 2 ta savol bilan biznes yo'nalishi, rejalashtirilgan byudjet va maqsadni aniqlab, samarasiz so'rovlarni elaydi.",
          example: {
            query: "«Assalomu alaykum, Instagramda target yoqib berasizlarmi?»",
            reply: "«Assalomu alaykum! Ha, to'liq target xizmatini ko'rsatamiz. Loyihangiz qanday sohada va birinchi oyga qancha reklama byudjeti rejalashtiryapsiz?»",
          },
          benefit: "Mutaxassis bilan uchrashuvga faqat tayyor va saralangan mijozlar chiqadi.",
        },
        {
          niche: "Xizmat ko'rsatish va konsalting",
          badge: 'Servis va B2B',
          icon: 'services',
          problem: "Administrator amaldagi mijozlar bilan band bo'lib, yangi xabarlarga 30–60 daqiqa kechikib javob beradi.",
          solution: "gapcha AI xizmatlar narxi, ish tartibini darhol tushuntiradi va qayta qo'ng'iroq uchun kontaktni oladi.",
          example: {
            query: "«Bugun ishlaysizlarmi va qabul narxi qancha?»",
            reply: "«Ha, bugun 19:00 gacha ochiqmiz. Birlamchi konsultatsiya 200 000 so'm. Sizni bo'sh vaqtga yozib qo'yaymi yoki navbatchi mutaxassisga bog'laymi?»",
          },
          benefit: "Mijoz 2 soniyada aniq javob oladi va raqobatchilarga ketib qolmaydi.",
        },
      ],
    },
    features: {
      tag: 'Haqiqiy imkoniyatlar',
      title: 'Muloqotni nazorat qilish uchun zarur barcha vositalar',
      subtitle: "Mavhum va'dalar yo'q. Faqat kodda mavjud va amalda ishlayotgan qulayliklar.",
      items: [
        {
          title: '24/7 uzluksiz javoblar',
          description: "Mijozlar ishdan tashqari vaqtda, kechalari va bayram kunlarida ham kutmasdan darhol javob oladi.",
          result: "Kechasi kelgan 0 ta yo'qotilgan mijoz",
          icon: 'clock',
        },
        {
          title: 'Faqat sizning ma\'lumotlaringiz asosida',
          description: "AI faqat kiritilgan bilimlar bazasi bo'yicha javob beradi. Ma'lumot bo'lmasa, insonni chaqirishni taklif qiladi.",
          result: "To'qima narxlar va yolg'on va'dalardan himoya",
          icon: 'book',
        },
        {
          title: 'Istalgan paytda qo\'lda boshqaruv',
          description: "Menejer barcha suhbatlarni ko'rib turadi va o'zi yoza oladi. Inson yozgan zahoti AI o'rnini bo'shatadi.",
          result: "Jamoa tomonidan to'liq nazorat",
          icon: 'userCheck',
        },
        {
          title: 'Dublikatlarsiz yagona lidlar ro\'yxati',
          description: "Mijozlar raqami va so'rovlari bitta jadvalga yig'iladi. Qayta yozgan mijoz yangi qator ochmasdan yangilanadi.",
          result: "Mijozlar bazasida tartib",
          icon: 'funnel',
        },
        {
          title: 'Yagona kabinetdan boshqarish',
          description: "Telegram, Instagram va saytdan kelgan xabarlar ilovalar orasida o'tmasdan bitta oynaga tushadi.",
          result: "Barcha kanallar bitta darchada",
          icon: 'inbox',
        },
        {
          title: 'Ish vaqti va taqvim bilan muvofiqlik',
          description: "Google Taqvim ulanganda AI kompaniya ish vaqtini (masalan, 09:00–19:00) tekshiradi va faqat bo'sh vaqtlarni taklif qiladi.",
          result: "Jadvaldagi chalkashliklardan himoya",
          icon: 'calendar',
        },
      ],
    },
    integrations: {
      tag: 'Aloqa kanallari',
      title: 'Mijozlaringiz allaqachon yozayotgan joylarga ulang',
      subtitle: "Muloqot kanallari va taqvim vositalarini alohida ajratib ko'rsatamiz.",
      items: [
        {
          id: 'tg_business',
          name: 'Telegram Business (Kotib)',
          type: 'Muloqot kanali',
          description: "Shaxsiy Telegram hisobingizni @gapcha_assistant_bot orqali ulash. AI shaxsiy chatlaringizda sizning nomingizdan javob beradi.",
          requirement: "Shaxsiy hisobda Telegram Premium obunasi bo'lishi shart.",
          status: 'Ishlaydi',
        },
        {
          id: 'tg_bot',
          name: 'Alohida Telegram-bot',
          type: 'Muloqot kanali',
          description: "BotFather tokeni orqali kompaniyangizning mustaqil botini ulash. Ommaviy arizalar va murojaatlar uchun qulay.",
          requirement: "@BotFather orqali olingan bepul bot tokeni.",
          status: 'Ishlaydi',
        },
        {
          id: 'widget',
          name: 'Sayt uchun chat (Vidjet)',
          type: 'Muloqot kanali',
          description: "Saytingiz burchagidagi qulay chat tugmasi. Ranglar, salomlashuv va sarlavhalar moslashtiriladi. Bir qator kod bilan o'rnatiladi.",
          requirement: "Ixtiyoriy veb-sayt (HTML, WordPress, Tilda, Next.js).",
          status: 'Ishlaydi',
        },
        {
          id: 'instagram',
          name: 'Instagram Direct',
          type: 'Muloqot kanali',
          description: "Rasmiy Meta Facebook Login orqali Direct-dagi kiruvchi xabarlarga avtojavoblar berish.",
          requirement: "Facebook sahifasiga ulangan professional (biznes) Instagram hisobi.",
          status: 'Meta Login orqali ulash',
        },
        {
          id: 'calendar',
          name: 'Google Taqvim',
          type: 'Taqvim integratsiyasi',
          description: "Ish vaqtlari va band oraliqlarni sinxronlashtirish. AI bo'sh vaqtlarni tekshiradi va uchrashuvlarni taqvimingizga kiritadi.",
          requirement: "Ishchi Google hisobi va taqvim.",
          status: 'Sinxronlashuv',
        },
      ],
    },
    pricing: {
      tag: 'Shaffof tariflar',
      title: 'Quruq va\'dalar uchun emas, javoblar hajmi uchun to\'lang',
      subtitle: "Har bir tarif asosiy imkoniyatlarni o'z ichiga oladi. Farqi — faol xodimlar soni va oylik javoblar paketida.",
      trialBadge: 'Bepul boshlash',
      trialText: "Ro'yxatdan o'tganda haqiqiy savollarda sinab ko'rish uchun 3 kunga 100 ta bonus javob beriladi.",
      tokenExplanation: "Hisob birligi: 1 ta AI javobi = 1 ta token. Mijoz yozganda aynan 1 birlik yechiladi.",
      paymentStatusNote: "Payme / Click orqali onlayn to'lov moduli yuridik rasmiylashtirish jarayonida. Ro'yxatdan o'tish darhol sinov balansini yoqadi, kengaytirilgan tariflar esa qo'llab-quvvatlash xizmati orqali ulanadi.",
      monthPeriod: '/ oy',
      ctaTrial: '100 ta javobni sinab ko\'rish',
      ctaSelect: 'Tarifni tanlash',
      plans: [
        {
          id: 'start',
          name: 'START',
          priceUsd: PLANS.start.usdPriceFormatted,
          priceUzs: PLANS.start.uzsPriceFormatted,
          tokens: '2 000 ta AI javobi / oy',
          audience: 'Murojaatlarni qabul qilish va lidlarni yig\'ish uchun bitta AI-xodim',
          features: [
            '1 ta faol AI-xodim',
            'Oyiga 2 000 ta AI javobi',
            'Shaxsiy bilimlar bazasi va narxlar',
            'Mijozlarni saralash savollari',
            'CRM-da dublikatlarsiz lidlar',
            'Telegram, Sayt vidjeti va Instagram Direct',
            'Google Taqvim bilan sinxronizatsiya',
            'Menejer tomonidan qo\'lda boshqaruv',
          ],
        },
        {
          id: 'business',
          name: 'BUSINESS',
          priceUsd: PLANS.business.usdPriceFormatted,
          priceUzs: PLANS.business.uzsPriceFormatted,
          tokens: '6 000 ta AI javobi / oy',
          audience: "Qabulni avtomatlashtirish va 3 tagacha xodimdan iborat jamoa uchun",
          badge: 'Jamoalar uchun qulay',
          features: [
            'Har xil vazifalar uchun 3 tagacha AI-xodim',
            'Oyiga 6 000 ta AI javobi',
            'START tarifining barcha imkoniyatlari',
            'Taqvimdagi bo\'sh vaqtlarni avtomatik tekshirish',
            'Jamoaviy kirish va suhbatlarni taqsimlash',
            'Xabarlar navbatini ustuvor qayta ishlash',
            'Har bir xodim uchun alohida ko\'rsatmalar',
          ],
        },
        {
          id: 'pro',
          name: 'PRO',
          priceUsd: PLANS.pro.usdPriceFormatted,
          priceUzs: PLANS.pro.uzsPriceFormatted,
          tokens: '15 000 ta AI javobi / oy',
          audience: "Filiallar, keng tarmoqlar va faol savdo bo'limlari uchun",
          features: [
            'Filiallar uchun 10 tagacha AI-xodim',
            'Oyiga 15 000 ta AI javobi',
            'BUSINESS tarifining barcha imkoniyatlari',
            'Yo\'nalishlar bo\'yicha alohida bilim bazalari',
            'Suhbatlar tarixini kengaytirilgan yuklab olish',
            'Harakatlar va sessiyalar audit jurnali',
          ],
        },
      ],
    },
    faq: {
      tag: "Ko'p beriladigan savollar",
      title: 'Ulanishdan oldin bilish kerak bo\'lgan barcha ma\'lumotlar',
      subtitle: "Tizim ishlashi, platformalar qoidalari va ma'lumotlar xavfsizligi haqida ochiq javoblar.",
      items: [
        {
          question: "Telegram Business hisobini ulash alohida bot yaratishdan nimasi bilan farq qiladi?",
          answer: "Telegram Business orqali AI to'g'ridan-to'g'ri shaxsiy yoki ishchi raqamingizga ulanadi: mijozlar sizning shaxsiy chatingizga yozganda AI sizning nomingizdan javob beradi. Oddiy Telegram-bot esa alohida kontakt (masalan, @kompaniya_bot) bo'lib, unga mijozlar alohida kiradi.",
        },
        {
          question: "Telegram Business rejimini yoqish uchun nimalar talab qilinadi?",
          answer: "Kotib rejimi ishlashi uchun ulanayotgan shaxsiy hisobda Telegram Premium obunasi bo'lishi lozim (bu Telegram kompaniyasining Business bo'limi uchun rasmiy talabidir). Ulanish @gapcha_assistant_bot orqali 2 qadamda amalga oshiriladi.",
        },
        {
          question: "Instagram Direct qanday ulanadi va nima uchun Facebook sahifasi kerak?",
          answer: "Instagram Graph API faqat Meta tizimi orqali ishlaydi: Instagram hisobingiz professional (biznes) maqomiga o'tkazilgan va Facebook sahifasiga bog'langan bo'lishi kerak. Ulanish rasmiy Meta Login darchasi orqali amalga oshiriladi.",
        },
        {
          question: "AI kompaniyamning narxlari va xizmatlarini qayerdan biladi?",
          answer: "Xodim yaratishda «Bilimlar bazasi» bo'limiga ma'lumotlarni o'zingiz kiritasiz: narxlar ro'yxati, xizmat shartlari, yetkazib berish qoidalari va ko'p beriladigan savollarni joylaysiz. AI faqat shu matnga tayanadi va to'qima ma'lumot bermaydi.",
        },
        {
          question: "Mijoz kutilmagan yoki murakkab savol bersa nima bo'ladi?",
          answer: "Agar bilimlar bazasida savolga aniq javob bo'lmasa, AI o'zidan gap to'qimaydi. U ma'lumotni mutaxassislardan aniqlab berishini muloyim aytadi, mijoz raqamini saqlaydi va operator javobini kutishni taklif qiladi.",
        },
        {
          question: "Inson suhbatga aralasha oladimi va bu qanday ishlaydi?",
          answer: "Ha, istalgan daqiqada. Siz yoki operatoringiz mijozga chatda yozishi bilanoq, AI avtojavoblari to'xtatiladi (Human Takeover rejimi). Avtojavoblarni boshqaruv panelidagi bitta tugma bilan qayta yoqish mumkin.",
        },
        {
          question: "Bepul sinov muddatiga nimalar kiradi?",
          answer: "Ro'yxatdan o'tib, pochtangizni tasdiqlashingiz bilan 3 kunga 100 ta bepul javob balansingizga yuklanadi. Bank kartasini kiritmasdan AI-xodim yaratishingiz, bilimlar bazasini to'ldirishingiz va sinov maydonida tekshirishingiz mumkin.",
        },
        {
          question: "Javoblar balansi qanday hisoblanadi?",
          answer: "AI mijozga yuborgan har bir javobi uchun balansingizdan 1 ta token yechiladi. Agar savolga inson javob bersa yoki chat pauzada tursa, token sarflanmaydi. Balans kabinet tepasida real vaqtda ko'rinib turadi.",
        },
        {
          question: "Yordamchini qanday qilib vaqtincha to'xtatish yoki o'chirish mumkin?",
          answer: "«Integratsiyalar» bo'limida yoki xodim kartasida faollik tugmasi mavjud. Bitta bosish bilan avtojavoblarni pauzaga qo'yishingiz mumkin: suhbatlar qo'lda yozish uchun ochiq qoladi.",
        },
      ],
    },
    finalCta: {
      title: "Kechikkan javoblar tufayli mijozlarni yo'qotishni to'xtating",
      subtitle: "gapcha AI-ni 10 daqiqada ulang va dastlabki 100 ta savolda avtojavoblarni bepul sinab ko'ring.",
      button: "Bepul ro'yxatdan o'tish",
      note: "Ro'yxatdan o'tganda 100 ta javob • Karta talab qilinmaydi • Tezkor start",
    },
    footer: {
      tagline: "Biznes uchun aqlli javoblar va muloqotni boshqarish platformasi.",
      rights: "© 2026 gapcha AI. Barcha huquqlar himoyalangan.",
      privacy: 'Maxfiylik siyosati',
      dataDeletion: "Ma'lumotlarni o'chirish",
      support: 'Qo\'llab-quvvatlash: privacy@gapcha.ai',
      telegramBot: 'Xizmat boti: @gapcha_assistant_bot',
      language: 'Interfeys tili',
    },
  },
};
