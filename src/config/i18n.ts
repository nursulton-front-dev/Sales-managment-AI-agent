/**
 * gapcha AI — Unified Platform Localization (RU / UZ)
 * Supports full Latin Uzbek terminology, natural phrasing, and reactive language switching.
 */

export type SupportedLocale = 'ru' | 'uz';

export interface TranslationDictionary {
  locale: SupportedLocale;
  appName: string;
  appSubtitle: string;

  common: {
    save: string;
    saving: string;
    saved: string;
    saveFailed: string;
    continue: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    back: string;
    close: string;
    retry: string;
    loading: string;
    search: string;
    filter: string;
    all: string;
    refresh: string;
    actions: string;
    status: string;
    active: string;
    paused: string;
    draft: string;
    noData: string;
    balance: string;
    responses: string;
    topup: string;
    logout: string;
    trial: string;
    copied: string;
    confirm: string;
    confirmed: string;
    suggested: string;
    notFilled: string;
    or: string;
    and: string;
    currencySum: string;
    testDrive: string;
  };

  nav: {
    work: string;
    company: string;
    overview: string;
    leads: string;
    conversations: string;
    agents: string;
    integrations: string;
    billing: string;
    team: string;
    support: string;
    profile: string;
    settings: string;
    platform: string;
    testDrive: string;
    openMenu: string;
    closeMenu: string;
    language: string;
  };

  overview: {
    welcome: string;
    kpiInquiries: string;
    kpiInquiriesSub: string;
    kpiQualified: string;
    kpiQualifiedSub: string;
    kpiBookings: string;
    kpiBookingsSub: string;
    kpiConversion: string;
    kpiConversionSub: string;
    funnelTitle: string;
    quickStartTitle: string;
    quickStartAgent: string;
    quickStartChannels: string;
    quickStartTest: string;
    recentLeads: string;
    activeChannels: string;
    viewAll: string;
  };

  leads: {
    title: string;
    subtitle: string;
    addLead: string;
    searchPlaceholder: string;
    allChannels: string;
    allStatuses: string;
    client: string;
    channel: string;
    appointment: string;
    spent: string;
    notes: string;
    noLeadsFound: string;
    resetFilters: string;
    emptyLeadsConnected: string;
    emptyLeadsDisconnected: string;
    statuses: {
      new: string;
      qualified: string;
      booked: string;
    };
  };

  conversations: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    takeOver: string;
    returnToAi: string;
    typeMessage: string;
    send: string;
    emptyInboxSearch: string;
    emptyInboxConnected: string;
    emptyInboxDisconnected: string;
    selectConversation: string;
    aiActive: string;
    operatorActive: string;
    clientChannel: string;
  };

  agents: {
    title: string;
    subtitle: string;
    createButton: string;
    activeBadge: string;
    pausedBadge: string;
    editAgent: string;
    deleteAgent: string;
    testDrive: string;
    emptyAgents: string;
    roleSales: string;
    responsesUsed: string;
  };

  wizard: {
    title: string;
    subtitle: string;
    modeAi: string;
    modeAiDesc: string;
    modeManual: string;
    modeManualDesc: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    resumeTitle: string;
    resumeAgentName: string;
    resumeNiche: string;
    resumeGoal: string;
    resumePricing: string;
    resumeTone: string;
    resumeClarify: string;
    resumeReady: string;
    inputPlaceholder: string;
    send: string;
    firstQuestion: string;
    firstQuestionGreeting: string;
    secondQuestion: string;
    thirdQuestion: string;
    fourthQuestion: string;
    quickAnswers: string;
    saveAndLaunch: string;
    openSandbox: string;
    toAgentsList: string;
    successTitle: string;
    successDescReady: string;
    successDescNeedsChannel: string;
    tones: {
      friendly: string;
      professional: string;
      consultative: string;
      persuasive: string;
    };
    mobileTabs: {
      dialog: string;
      resume: string;
    };
    niches: {
      courses: string;
      clinic: string;
      beauty: string;
      ecommerce: string;
      marketing: string;
      other: string;
    };
  };

  integrations: {
    title: string;
    subtitle: string;
    telegramBusinessTitle: string;
    telegramBusinessDesc: string;
    telegramBotTitle: string;
    telegramBotDesc: string;
    instagramTitle: string;
    instagramDesc: string;
    calendarTitle: string;
    calendarDesc: string;
    widgetTitle: string;
    widgetDesc: string;
    connect: string;
    disconnect: string;
    connected: string;
    notConnected: string;
    workingHours: string;
    instructions: string;
    tabs: {
      all: string;
      messages: string;
      websites: string;
      calendar: string;
      history: string;
    };
    channelsSummary: {
      connectedChannels: string;
      activeDesc: string;
      viewQueue: string;
    };
    onboarding: {
      title: string;
      desc: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
    };
    supportHelper: {
      title: string;
      desc: string;
      cta: string;
    };
    status: {
      checking: string;
      unavailable: string;
      readyToInstall: string;
      accountConnected: string;
      botConnected: string;
      configure: string;
      paused: string;
      active: string;
    };
  };

  billing: {
    title: string;
    subtitle: string;
    currentPlan: string;
    tokenBalance: string;
    topupButton: string;
    plansTitle: string;
    responses: string;
    selectPlan: string;
    expiresAt: string;
    daysLeft: string;
  };

  company: {
    title: string;
    subtitle: string;
    companyName: string;
    owner: string;
    phone: string;
    email: string;
    team: string;
    inviteMember: string;
    roleOwner: string;
    roleAdmin: string;
    roleMember: string;
    timezone: string;
  };

  profile: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    logoutButton: string;
    security: string;
    verified: string;
    unverified: string;
  };

  support: {
    title: string;
    subtitle: string;
    newTicket: string;
    myTickets: string;
    assistantTitle: string;
    assistantDesc: string;
    openAssistant: string;
  };

  errors: {
    p404Title: string;
    p404Desc: string;
    toHome: string;
    toDashboard: string;
    offlineTitle: string;
    accessDeniedTitle: string;
    serverErrorTitle: string;
    genericErrorTitle: string;
    retry: string;
    loadingWorkspace: string;
    syncingData: string;
  };
}

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  ru: {
    locale: 'ru',
    appName: 'gapcha AI',
    appSubtitle: 'ИИ-сотрудники для продаж и клиентского сервиса',

    common: {
      save: 'Сохранить',
      saving: 'Сохраняем…',
      saved: 'Сохранено',
      saveFailed: 'Не удалось сохранить',
      continue: 'Продолжить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Изменить',
      create: 'Создать',
      back: 'Назад',
      close: 'Закрыть',
      retry: 'Повторить',
      loading: 'Загрузка…',
      search: 'Поиск…',
      filter: 'Фильтр',
      all: 'Все',
      refresh: 'Обновить',
      actions: 'Действия',
      status: 'Статус',
      active: 'Работает',
      paused: 'Приостановлен',
      draft: 'Черновик',
      noData: 'Нет данных',
      balance: 'Баланс',
      responses: 'ответов',
      topup: 'Пополнить',
      logout: 'Выйти',
      trial: 'Пробный',
      copied: 'Скопировано',
      confirm: 'Подтвердить',
      confirmed: 'Подтверждено',
      suggested: 'Предложение',
      notFilled: 'Не заполнено',
      or: 'или',
      and: 'и',
      currencySum: 'сум',
      testDrive: 'Тест-драйв',
    },

    nav: {
      work: 'РАБОТА',
      company: 'КОМПАНИЯ',
      overview: 'Обзор',
      leads: 'Лиды и записи',
      conversations: 'Диалоги',
      agents: 'ИИ-сотрудники',
      integrations: 'Интеграции',
      billing: 'Тарифы и баланс',
      team: 'Компания и команда',
      support: 'Поддержка',
      profile: 'Профиль',
      settings: 'Настройки',
      platform: 'Платформа',
      testDrive: 'Тест-драйв',
      openMenu: 'Открыть меню навигации',
      closeMenu: 'Закрыть меню',
      language: 'Язык интерфейса',
    },

    overview: {
      welcome: 'С возвращением',
      kpiInquiries: 'Обращения',
      kpiInquiriesSub: 'Диалоги за период',
      kpiQualified: 'Квалифицировано',
      kpiQualifiedSub: 'Целевые клиенты',
      kpiBookings: 'Записи и заказы',
      kpiBookingsSub: 'Подтверждено в календарь',
      kpiConversion: 'Конверсия',
      kpiConversionSub: 'Записи от общего трафика',
      funnelTitle: 'Воронка лидогенерации',
      quickStartTitle: 'Быстрый старт',
      quickStartAgent: '1. Создайте первого ИИ-сотрудника',
      quickStartChannels: '2. Подключите Telegram или сайт',
      quickStartTest: '3. Проверьте ответы в тест-драйве',
      recentLeads: 'Последние заявки',
      activeChannels: 'Активные каналы',
      viewAll: 'Смотреть все',
    },

    leads: {
      title: 'Лиды и записи',
      subtitle: 'Все обращения клиентов из Telegram, Instagram и виджета сайта',
      addLead: 'Добавить лид',
      searchPlaceholder: 'Поиск по имени или телефону…',
      allChannels: 'Все каналы',
      allStatuses: 'Все статусы',
      client: 'Клиент',
      channel: 'Канал',
      appointment: 'Запись / Время',
      spent: 'Расход токенов',
      notes: 'Заметки',
      noLeadsFound: 'Лидов по заданным фильтрам не найдено.',
      resetFilters: 'Сбросить фильтры',
      emptyLeadsConnected: 'Список лидов пуст. Ожидаем новые заявки от клиентов.',
      emptyLeadsDisconnected: 'Список лидов пуст. Подключите канал связи в Интеграциях, чтобы начать прием обращений.',
      statuses: {
        new: 'Новый',
        qualified: 'Квалифицирован',
        booked: 'Записан в календарь',
      },
    },

    conversations: {
      title: 'Диалоги',
      subtitle: 'История переписки клиентов с ИИ-сотрудниками и перехват оператором',
      searchPlaceholder: 'Поиск по клиентам и сообщениям…',
      takeOver: 'Перехватить диалог',
      returnToAi: 'Вернуть ИИ',
      typeMessage: 'Напишите сообщение клиенту…',
      send: 'Отправить',
      emptyInboxSearch: 'По запросу «{query}» диалогов не найдено.',
      emptyInboxConnected: 'Диалогов пока нет. Ожидаем входящие сообщения.',
      emptyInboxDisconnected: 'Диалогов пока нет. Подключите канал общения в интеграциях.',
      selectConversation: 'Выберите диалог из списка слева, чтобы просмотреть переписку.',
      aiActive: 'ИИ отвечает',
      operatorActive: 'Диалог у оператора',
      clientChannel: 'Канал клиента',
    },

    agents: {
      title: 'ИИ-сотрудники',
      subtitle: 'Управление сценариями, базой знаний и активностью ботов',
      createButton: 'Создать сотрудника',
      activeBadge: 'Работает',
      pausedBadge: 'Приостановлен',
      editAgent: 'Редактировать',
      deleteAgent: 'Удалить',
      testDrive: 'Тест-драйв',
      emptyAgents: 'У вас пока нет созданных сотрудников.',
      roleSales: 'Продажи и запись',
      responsesUsed: 'Ответов потрачено',
    },

    wizard: {
      title: 'Создать ИИ-сотрудника',
      subtitle: 'Настройте готовый сценарий продаж и консультаций для вашего бизнеса',
      modeAi: 'С помощником',
      modeAiDesc: 'Пошаговый диалог с ИИ-мастером',
      modeManual: 'Вручную',
      modeManualDesc: 'Самостоятельное заполнение полей',
      step1: 'Бизнес',
      step2: 'Знания',
      step3: 'Проверка',
      step4: 'Запуск',
      resumeTitle: 'Краткое резюме сотрудника',
      resumeAgentName: 'Имя сотрудника',
      resumeNiche: 'Сфера бизнеса',
      resumeGoal: 'Главная задача',
      resumePricing: 'Услуги и цены',
      resumeTone: 'Стиль общения',
      resumeClarify: 'Что ещё требуется уточнить',
      resumeReady: 'Все ключевые данные заполнены и готовы к проверке.',
      inputPlaceholder: 'Напишите ваш ответ…',
      send: 'Отправить',
      firstQuestion: 'Каким бизнесом вы занимаетесь?',
      firstQuestionGreeting: 'Здравствуйте! Я помогу быстро настроить ИИ-сотрудника под ваш бизнес. Каким бизнесом вы занимаетесь?',
      secondQuestion: 'Отлично! Какая главная задача будет у сотрудника — консультация по ценам, запись на приём или сбор заявок?',
      thirdQuestion: 'Принято. Какие ключевые услуги и цены должен знать сотрудник? Напишите основные позиции или прикрепите файл.',
      fourthQuestion: 'Знания зафиксированы! Теперь проверьте диалог сотрудника в тест-драйве или перейдите к запуску.',
      quickAnswers: 'Быстрые варианты:',
      saveAndLaunch: 'Сохранить и запустить',
      openSandbox: 'Открыть тест-драйв',
      toAgentsList: 'Список сотрудников',
      successTitle: 'ИИ-сотрудник успешно создан!',
      successDescReady: 'сохранен в базе и готов к работе в подключённом Telegram-канале.',
      successDescNeedsChannel: 'сохранен в базе данных. Для запуска ответов клиентам подключите канал связи в Интеграциях.',
      tones: {
        friendly: 'Дружелюбный и тёплый',
        professional: 'Деловой и точный',
        consultative: 'Консультативный эксперт',
        persuasive: 'Уверенный и продающий',
      },
      mobileTabs: {
        dialog: 'Диалог',
        resume: 'Резюме',
      },
      niches: {
        courses: 'Учебный центр / Курсы',
        clinic: 'Клиника / Медицина',
        beauty: 'Салон красоты / Мастера',
        ecommerce: 'Магазин / Ритейл',
        marketing: 'Маркетинговое агентство',
        other: 'Другая сфера бизнеса',
      },
    },

    integrations: {
      title: 'Интеграции',
      subtitle: 'Подключение каналов связи и внешних сервисов',
      telegramBusinessTitle: 'Telegram Business (Режим секретаря)',
      telegramBusinessDesc: 'ИИ отвечает от вашего личного аккаунта в диалогах с клиентами',
      telegramBotTitle: 'Свой Telegram-бот (@BotFather)',
      telegramBotDesc: 'Отдельный бот компании с собственным юзернеймом',
      instagramTitle: 'Instagram Direct',
      instagramDesc: 'Мгновенные автоответы на сообщения клиентов в директ',
      calendarTitle: 'Google Календарь',
      calendarDesc: 'Автоматическая синхронизация слотов и запись клиентов на приём',
      widgetTitle: 'Виджет для сайта',
      widgetDesc: 'Встраиваемый чат на сайт с живыми ответами сотрудника',
      connect: 'Подключить',
      disconnect: 'Отключить',
      connected: 'Подключено',
      notConnected: 'Не подключено',
      workingHours: 'Рабочие часы',
      instructions: 'Инструкция',
      tabs: {
        all: 'Все интеграции',
        messages: 'Мессенджеры',
        websites: 'Сайт',
        calendar: 'Календари',
        history: 'История работы',
      },
      channelsSummary: {
        connectedChannels: 'Каналы связи',
        activeDesc: 'Активные каналы собирают лиды и ведут диалоги круглосуточно',
        viewQueue: 'Смотреть журнал очереди →',
      },
      onboarding: {
        title: 'Начните с первого подключения',
        desc: 'Подключите любой удобный канал, чтобы ваши ИИ-сотрудники начали отвечать на входящие вопросы, квалифицировать лидов и записывать клиентов на консультации 24/7.',
        step1Title: 'Выберите канал',
        step1Desc: 'Чат на сайте, Telegram-бот или Instagram Direct',
        step2Title: 'ИИ-сотрудник',
        step2Desc: 'Привяжите обученного ассистента с базой знаний',
        step3Title: 'Первые заявки',
        step3Desc: 'Клиенты получают ответы, а лиды сохраняются в CRM',
      },
      supportHelper: {
        title: 'Нужна помощь в подключении каналов?',
        desc: 'Поможем настроить Telegram-бота, чат на сайте или связать календарь бесплатно.',
        cta: 'Написать в поддержку →',
      },
      status: {
        checking: 'Проверяем…',
        unavailable: 'Статус недоступен',
        readyToInstall: '● Готов к установке',
        accountConnected: '● Аккаунт подключён',
        botConnected: '● Бот подключён',
        configure: 'Настроить подключение',
        paused: 'На паузе',
        active: 'Автоответы активны',
      },
    },

    billing: {
      title: 'Тарифы и баланс',
      subtitle: 'Управление подпиской и пакетами ответов',
      currentPlan: 'Текущий тариф',
      tokenBalance: 'Баланс ответов',
      topupButton: 'Пополнить баланс',
      plansTitle: 'Доступные тарифы',
      responses: 'ответов',
      selectPlan: 'Выбрать тариф',
      expiresAt: 'Действует до',
      daysLeft: 'дней осталось',
    },

    company: {
      title: 'Компания и команда',
      subtitle: 'Профиль организации, участники и настройки расписания',
      companyName: 'Название компании',
      owner: 'Владелец',
      phone: 'Телефон',
      email: 'Электронная почта',
      team: 'Сотрудники и роли',
      inviteMember: 'Пригласить сотрудника',
      roleOwner: 'Владелец',
      roleAdmin: 'Администратор',
      roleMember: 'Менеджер',
      timezone: 'Часовой пояс',
    },

    profile: {
      title: 'Профиль',
      subtitle: 'Личные данные и безопасность аккаунта',
      name: 'Ваше имя',
      email: 'Электронная почта',
      phone: 'Номер телефона',
      logoutButton: 'Выйти из аккаунта',
      security: 'Безопасность',
      verified: 'Подтверждён',
      unverified: 'Не подтверждён',
    },

    support: {
      title: 'Поддержка',
      subtitle: 'Техническая помощь и диагностика платформы',
      newTicket: 'Создать обращение',
      myTickets: 'Мои обращения',
      assistantTitle: 'Помощник платформы',
      assistantDesc: 'Встроенный диалог с ИИ для быстрой проверки подключений и решений',
      openAssistant: 'Открыть помощника',
    },

    errors: {
      p404Title: 'Такой страницы нет',
      p404Desc: 'Возможно, адрес изменился или страница была удалена.',
      toHome: 'На главную',
      toDashboard: 'В кабинет',
      offlineTitle: 'Нет подключения к интернету',
      accessDeniedTitle: 'Нет доступа к разделу',
      serverErrorTitle: 'Ошибка на стороне сервера',
      genericErrorTitle: 'Не удалось загрузить данные',
      retry: 'Повторить',
      loadingWorkspace: 'Загружаем кабинет…',
      syncingData: 'Синхронизируем актуальные данные',
    },
  },

  uz: {
    locale: 'uz',
    appName: 'gapcha AI',
    appSubtitle: 'Savdo va mijozlarga xizmat ko‘rsatish uchun AI-xodimlar',

    common: {
      save: 'Saqlash',
      saving: 'Saqlanmoqda…',
      saved: 'Saqlandi',
      saveFailed: 'Saqlab bo‘lmadi',
      continue: 'Davom etish',
      cancel: 'Bekor qilish',
      delete: 'O‘chirish',
      edit: 'O‘zgartirish',
      create: 'Yaratish',
      back: 'Orqaga',
      close: 'Yopish',
      retry: 'Qayta urinish',
      loading: 'Yuklanmoqda…',
      search: 'Qidirish…',
      filter: 'Filtr',
      all: 'Barchasi',
      refresh: 'Yangilash',
      actions: 'Amallar',
      status: 'Holat',
      active: 'Faol',
      paused: 'To‘xtatilgan',
      draft: 'Qoralama',
      noData: 'Ma\'lumot yo‘q',
      balance: 'Balans',
      responses: 'ta javob',
      topup: 'To‘ldirish',
      logout: 'Chiqish',
      trial: 'Sinov',
      copied: 'Nusxa olindi',
      confirm: 'Tasdiqlash',
      confirmed: 'Tasdiqlangan',
      suggested: 'Taklif',
      notFilled: 'To‘ldirilmagan',
      or: 'yoki',
      and: 'va',
      currencySum: 'so‘m',
      testDrive: 'Sinov drayvi',
    },

    nav: {
      work: 'ISH',
      company: 'KOMPANIYA',
      overview: 'Umumiy ko‘rinish',
      leads: 'Mijozlar va yozuvlar',
      conversations: 'Suhbatlar',
      agents: 'AI xodimlar',
      integrations: 'Integratsiyalar',
      billing: 'Tariflar va balans',
      team: 'Kompaniya va jamoa',
      support: 'Yordam',
      profile: 'Profil',
      settings: 'Sozlamalar',
      platform: 'Platforma',
      testDrive: 'Test-drayv',
      openMenu: 'Navigatsiya menyusini ochish',
      closeMenu: 'Menyuni yopish',
      language: 'Interfeys tili',
    },

    overview: {
      welcome: 'Xush kelibsiz',
      kpiInquiries: 'Murojaatlar',
      kpiInquiriesSub: 'Davrdagi suhbatlar',
      kpiQualified: 'Saralangan',
      kpiQualifiedSub: 'Maqsadli mijozlar',
      kpiBookings: 'Yozuvlar va buyurtmalar',
      kpiBookingsSub: 'Taqvimga tasdiqlangan',
      kpiConversion: 'Konversiya',
      kpiConversionSub: 'Umumiy trafikdan yozuvlar',
      funnelTitle: 'Lidlar voronkasi',
      quickStartTitle: 'Tezkor boshlash',
      quickStartAgent: '1. Birinchi AI-xodimni yarating',
      quickStartChannels: '2. Telegram yoki saytni ulang',
      quickStartTest: '3. Javoblarni test-drayvda tekshiring',
      recentLeads: 'So‘nggi arizalar',
      activeChannels: 'Faol kanallar',
      viewAll: 'Barchasini ko‘rish',
    },

    leads: {
      title: 'Mijozlar va yozuvlar',
      subtitle: 'Telegram, Instagram va sayt vidjetidan tushgan barcha murojaatlar',
      addLead: 'Lid qo‘shish',
      searchPlaceholder: 'Ism yoki telefon bo‘yicha qidirish…',
      allChannels: 'Barcha kanallar',
      allStatuses: 'Barcha holatlar',
      client: 'Mijoz',
      channel: 'Kanal',
      appointment: 'Yozuv / Vaqti',
      spent: 'Token sarfi',
      notes: 'Eslatmalar',
      noLeadsFound: 'Belgilangan filtrlar bo‘yicha lidlar topilmadi.',
      resetFilters: 'Filtrlarni bekor qilish',
      emptyLeadsConnected: 'Lidlar ro‘yxati bo‘sh. Mijozlardan yangi arizalarni kutmoqdamiz.',
      emptyLeadsDisconnected: 'Lidlar ro‘yxati bo‘sh. Murojaatlarni qabul qilish uchun Integratsiyalarda kanalni ulang.',
      statuses: {
        new: 'Yangi',
        qualified: 'Saralangan',
        booked: 'Taqvimga yozilgan',
      },
    },

    conversations: {
      title: 'Suhbatlar',
      subtitle: 'Mijozlarning AI-xodimlar bilan yozishmalari tarixi va operatorga o‘tkazish',
      searchPlaceholder: 'Mijozlar va xabarlar bo‘yicha qidirish…',
      takeOver: 'Suhbatni boshqarish',
      returnToAi: 'AI ga qaytarish',
      typeMessage: 'Mijozga xabar yozing…',
      send: 'Yuborish',
      emptyInboxSearch: '«{query}» so‘rovi bo‘yicha suhbatlar topilmadi.',
      emptyInboxConnected: 'Hozircha suhbatlar yo‘q. Kiruvchi xabarlarni kutmoqdamiz.',
      emptyInboxDisconnected: 'Hozircha suhbatlar yo‘q. Integratsiyalarda aloqa kanalini ulang.',
      selectConversation: 'Yozishmani ko‘rish uchun chapdagi ro‘yxatdan suhbatni tanlang.',
      aiActive: 'AI javob bermoqda',
      operatorActive: 'Suhbat operatorda',
      clientChannel: 'Mijoz kanali',
    },

    agents: {
      title: 'AI xodimlar',
      subtitle: 'Ssenariylar, bilimlar bazasi va botlar faolligini boshqarish',
      createButton: 'AI xodim yaratish',
      activeBadge: 'Faol',
      pausedBadge: 'To‘xtatilgan',
      editAgent: 'Tahrirlash',
      deleteAgent: 'O‘chirish',
      testDrive: 'Test-drayv',
      emptyAgents: 'Sizda hali yaratilgan xodimlar yo‘q.',
      roleSales: 'Sotuv va qabul',
      responsesUsed: 'Sarflangan javoblar',
    },

    wizard: {
      title: 'AI xodim yaratish',
      subtitle: 'Biznesingiz uchun tayyor sotuv va konsultatsiya ssenariysini sozlang',
      modeAi: 'AI yordamida',
      modeAiDesc: 'AI-usta bilan bosqichma-bosqich muloqot',
      modeManual: 'Qo‘lda',
      modeManualDesc: 'Barcha maydonlarni mustaqil to‘ldirish',
      step1: 'Biznes',
      step2: 'Bilimlar',
      step3: 'Tekshirish',
      step4: 'Ishga tushirish',
      resumeTitle: 'Xodimning qisqacha ma\'lumotnomasi',
      resumeAgentName: 'Xodim nomi',
      resumeNiche: 'Biznes sohasi',
      resumeGoal: 'Asosiy vazifasi',
      resumePricing: 'Xizmatlar va narxlar',
      resumeTone: 'Muloqot uslubi',
      resumeClarify: 'Aniqlashtirish kerak bo‘lgan ma\'lumotlar',
      resumeReady: 'Barcha asosiy ma\'lumotlar to‘ldirilgan va tekshirishga tayyor.',
      inputPlaceholder: 'Javobingizni yozing…',
      send: 'Yuborish',
      firstQuestion: 'Qaysi sohada ishlaysiz?',
      firstQuestionGreeting: 'Assalomu alaykum! Biznesingiz uchun AI-xodimni tez sozlashga yordam beraman. Qaysi sohada ishlaysiz?',
      secondQuestion: 'Ajoyib! Xodimning asosiy vazifasi nima bo‘ladi — narxlar bo‘yicha maslahat, qabulga yozish yoki arizalarni yig‘ish?',
      thirdQuestion: 'Qabul qilindi. Xodim bilishi kerak bo‘lgan asosiy xizmatlar va narxlar qanday? Asosiy narxlarni yozishingiz yoki fayl biriktirishingiz mumkin.',
      fourthQuestion: 'Bilimlar saqlandi! Endi xodimning javoblarini test-drayvda sinab ko‘ring yoki ishga tushirishga o‘ting.',
      quickAnswers: 'Tezkor variantlar:',
      saveAndLaunch: 'Saqlash va ishga tushirish',
      openSandbox: 'Test-drayvni ochish',
      toAgentsList: 'Xodimlar ro‘yxati',
      successTitle: 'AI-xodim muvaffaqiyatli yaratildi!',
      successDescReady: 'bazada saqlandi va ulangan Telegram-kanalida ishlashga tayyor.',
      successDescNeedsChannel: 'ma\'lumotlar bazasida saqlandi. Mijozlarga javob berishni boshlash uchun Integratsiyalarda kanalni ulang.',
      tones: {
        friendly: 'Do‘stona va samimiy',
        professional: 'Rasmiy va aniq',
        consultative: 'Maslahatchi ekspert',
        persuasive: 'Ishonarli va sotuvchi',
      },
      mobileTabs: {
        dialog: 'Muloqot',
        resume: 'Ma\'lumotnoma',
      },
      niches: {
        courses: 'O‘quv markazi / Kurslar',
        clinic: 'Klinika / Tibbiyot',
        beauty: 'Go‘zallik saloni / Ustalar',
        ecommerce: 'Do‘kon / Chakana savdo',
        marketing: 'Marketing agentligi',
        other: 'Boshqa biznes sohasi',
      },
    },

    integrations: {
      title: 'Integratsiyalar',
      subtitle: 'Aloqa kanallari va tashqi xizmatlarni ulash',
      telegramBusinessTitle: 'Telegram Business (Kotib rejimi)',
      telegramBusinessDesc: 'AI shaxsiy hisobingizdan mijozlar bilan muloqotda avtomatik javob beradi',
      telegramBotTitle: 'Alohida Telegram-bot (@BotFather)',
      telegramBotDesc: 'Kompaniyaning o‘z nomidagi rasmiy mijozlar boti',
      instagramTitle: 'Instagram Direct',
      instagramDesc: 'Instagram directdagi mijozlar xabarlariga tezkor avtojavoblar',
      calendarTitle: 'Google Taqvim',
      calendarDesc: 'Bo‘sh vaqtlarni avtomatik tekshirish va mijozlarni qabulga yozish',
      widgetTitle: 'Sayt uchun vidjet',
      widgetDesc: 'Saytingizga tashrif buyuruvchilar uchun jonli AI-chat',
      connect: 'Ulash',
      disconnect: 'Uzish',
      connected: 'Ulangan',
      notConnected: 'Ulanmagan',
      workingHours: 'Ish soatlari',
      instructions: 'Ko‘rsatma',
      tabs: {
        all: 'Barcha integratsiyalar',
        messages: 'Messenjerlar',
        websites: 'Sayt',
        calendar: 'Taqvimlar',
        history: 'Ish tarixi',
      },
      channelsSummary: {
        connectedChannels: 'Aloqa kanallari',
        activeDesc: 'Faol kanallar lidlarni yig‘adi va tun-u kun muloqot olib boradi',
        viewQueue: 'Navbat jurnalini ko‘rish →',
      },
      onboarding: {
        title: 'Birinchi ulanishdan boshlang',
        desc: 'AI-xodimlaringiz kiruvchi savollarga 24/7 javob berishi, lidlarni saralashi va mijozlarni qabulga yozishi uchun istalgan qulay kanalni ulang.',
        step1Title: 'Kanalni tanlang',
        step1Desc: 'Saytdagi chat, Telegram-bot yoki Instagram Direct',
        step2Title: 'AI-xodim',
        step2Desc: 'Bilimlar bazasi yuklangan tayyor assistentni biriktiring',
        step3Title: 'Birinchi arizalar',
        step3Desc: 'Mijozlar javob oladi, lidlar esa CRM tizimida saqlanadi',
      },
      supportHelper: {
        title: 'Kanallarni ulashda yordam kerakmi?',
        desc: 'Telegram-bot, sayt vidjeti yoki taqvimni bepul sozlashga yordam beramiz.',
        cta: 'Yordamga yozish →',
      },
      status: {
        checking: 'Tekshirilmoqda…',
        unavailable: 'Holat mavjud emas',
        readyToInstall: '● O‘rnatishga tayyor',
        accountConnected: '● Hisob ulangan',
        botConnected: '● Bot ulangan',
        configure: 'Ulanishni sozlash',
        paused: 'To‘xtatilgan',
        active: 'Avtojavoblar faol',
      },
    },

    billing: {
      title: 'Tariflar va balans',
      subtitle: 'Obuna va javoblar paketlarini boshqarish',
      currentPlan: 'Joriy tarif',
      tokenBalance: 'Javoblar balansi',
      topupButton: 'Balansni to‘ldirish',
      plansTitle: 'Mavjud tariflar',
      responses: 'ta javob',
      selectPlan: 'Tarifni tanlash',
      expiresAt: 'Amal qilish muddati',
      daysLeft: 'kun qoldi',
    },

    company: {
      title: 'Kompaniya va jamoa',
      subtitle: 'Tashkilot profili, jamoa a\'zolari va ish jadvali sozlamalari',
      companyName: 'Kompaniya nomi',
      owner: 'Egasi',
      phone: 'Telefon',
      email: 'Elektron pochta',
      team: 'Xodimlar va rollar',
      inviteMember: 'Xodimni taklif qilish',
      roleOwner: 'Egasi',
      roleAdmin: 'Administrator',
      roleMember: 'Menejer',
      timezone: 'Vaqt mintaqasi',
    },

    profile: {
      title: 'Profil',
      subtitle: 'Shaxsiy ma\'lumotlar va hisob xavfsizligi',
      name: 'Ismingiz',
      email: 'Elektron pochta',
      phone: 'Telefon raqami',
      logoutButton: 'Hisobdan chiqish',
      security: 'Xavfsizlik',
      verified: 'Tasdiqlangan',
      unverified: 'Tasdiqlanmagan',
    },

    support: {
      title: 'Yordam',
      subtitle: 'Texnik yordam va platforma diagnostikasi',
      newTicket: 'Yangi murojaat',
      myTickets: 'Mening murojaatlarim',
      assistantTitle: 'Platforma yordamchisi',
      assistantDesc: 'Ulanishlar va yechimlarni tez tekshirish uchun o‘rnatilgan AI-dialog',
      openAssistant: 'Yordamchini ochish',
    },

    errors: {
      p404Title: 'Bunday sahifa mavjud emas',
      p404Desc: 'Ehtimol manzil o‘zgargan yoki sahifa o‘chirilgan.',
      toHome: 'Bosh sahifaga',
      toDashboard: 'Kabinetga',
      offlineTitle: 'Internet aloqasi yo‘q',
      accessDeniedTitle: 'Bo‘limga kirish huquqi yo‘q',
      serverErrorTitle: 'Serverda xatolik yuz berdi',
      genericErrorTitle: 'Ma\'lumotlarni yuklab bo‘lmadi',
      retry: 'Qayta urinish',
      loadingWorkspace: 'Kabinet yuklanmoqda…',
      syncingData: 'Dolzarb ma\'lumotlar yangilanmoqda',
    },
  },
};

/**
 * Format number with space grouping according to locale rules
 */
export function formatNumber(n: number, locale: SupportedLocale = 'ru'): string {
  if (isNaN(n) || n === null || n === undefined) return '0';
  return new Intl.NumberFormat(locale === 'uz' ? 'uz-UZ' : 'ru-RU').format(n);
}

/**
 * Format currency without altering the actual numeric sum
 */
export function formatCurrency(amount: number, currency: string = 'UZS', locale: SupportedLocale = 'ru'): string {
  const formatted = formatNumber(amount, locale);
  if (currency === 'USD') return `$${formatted}`;
  const suffix = locale === 'uz' ? 'so‘m' : 'сум';
  return `${formatted} ${suffix}`;
}

/**
 * Format date nicely according to locale
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  locale: SupportedLocale = 'ru',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    return new Intl.DateTimeFormat(locale === 'uz' ? 'uz-UZ' : 'ru-RU', defaultOptions).format(d);
  } catch {
    return '—';
  }
}
