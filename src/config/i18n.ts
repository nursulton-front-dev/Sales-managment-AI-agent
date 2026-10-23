export type SupportedLocale = 'ru' | 'uz' | 'en';

export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  aiEmployee: string;
  aiEmployees: string;
  token: string;
  tokens: string;
  balance: string;
  topup: string;
  logout: string;
  settings: string;
  save: string;
  cancel: string;
  delete: string;
  create: string;
  status: string;
  active: string;
  draft: string;
  paused: string;
  loading: string;
  noData: string;
  search: string;
  filter: string;

  nav: {
    overview: string;
    leads: string;
    conversations: string;
    agents: string;
    billing: string;
    settings: string;
    admin: string;
    sandbox: string;
    calendar: string;
  };

  kpi: {
    inquiries: string;
    inquiriesSub: string;
    qualified: string;
    qualifiedSub: string;
    bookings: string;
    bookingsSub: string;
    conversion: string;
    conversionSub: string;
  };

  funnel: {
    new: string;
    qualified: string;
    booked: string;
    orderNew: string;
    orderConfirmed: string;
    orderPaid: string;
    orderDelivered: string;
  };

  niches: {
    education: string;
    clinic: string;
    beauty: string;
    ecommerce: string;
    other: string;
  };
}

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  ru: {
    appName: 'AI Business OS',
    appSubtitle: 'Корпоративная CRM и ИИ-сотрудники',
    aiEmployee: 'ИИ-сотрудник',
    aiEmployees: 'ИИ-сотрудники',
    token: 'токен',
    tokens: 'токенов',
    balance: 'Баланс',
    topup: 'Пополнить',
    logout: 'Выйти',
    settings: 'Настройки',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    create: 'Создать',
    status: 'Статус',
    active: 'Работает',
    draft: 'Черновик',
    paused: 'Приостановлен',
    loading: 'Загрузка...',
    noData: 'Нет данных',
    search: 'Поиск...',
    filter: 'Фильтр',
    nav: {
      overview: 'Обзор и Воронка',
      leads: 'Клиенты и Записи',
      conversations: 'Диалоги',
      agents: 'ИИ-сотрудники',
      billing: 'Тарифы и Баланс',
      settings: 'Настройки',
      admin: 'Панель платформы (Admin)',
      sandbox: 'Проверить сотрудника',
      calendar: 'Google Календарь',
    },
    kpi: {
      inquiries: 'Обращения',
      inquiriesSub: 'Диалоги за период',
      qualified: 'Квалифицировано',
      qualifiedSub: 'Целевые клиенты',
      bookings: 'Записи и Заказы',
      bookingsSub: 'Подтверждено в календарь',
      conversion: 'Конверсия воронки',
      conversionSub: 'Записи от общего трафика',
    },
    funnel: {
      new: 'Новое обращение',
      qualified: 'Квалифицирован',
      booked: 'Записан в календарь',
      orderNew: 'Новый заказ',
      orderConfirmed: 'Заказ подтвержден',
      orderPaid: 'Оплачен',
      orderDelivered: 'Доставлен',
    },
    niches: {
      education: 'Учебный центр / Курсы',
      clinic: 'Медицинский центр / Клиника',
      beauty: 'Салон красоты / Мастера',
      ecommerce: 'Интернет-магазин / Ритейл',
      other: 'Другая ниша / Услуги',
    },
  },

  uz: {
    appName: 'AI Business OS',
    appSubtitle: 'Korporativ CRM va AI-xodimlar',
    aiEmployee: 'AI-xodim',
    aiEmployees: 'AI-xodimlar',
    token: 'token',
    tokens: 'tokenlar',
    balance: 'Balans',
    topup: "To'ldirish",
    logout: 'Chiqish',
    settings: 'Sozlamalar',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    delete: "O'chirish",
    create: 'Yaratish',
    status: 'Holat',
    active: 'Faol',
    draft: 'Qoralama',
    paused: "To'xtatilgan",
    loading: 'Yuklanmoqda...',
    noData: "Ma'lumot yo'q",
    search: 'Qidirish...',
    filter: 'Filtr',
    nav: {
      overview: 'Umumiy va Voronka',
      leads: 'Mijozlar va Yozuvlar',
      conversations: 'Muloqotlar',
      agents: 'AI-xodimlar',
      billing: 'Tariflar va Balans',
      settings: 'Sozlamalar',
      admin: 'Platforma boshqaruvi',
      sandbox: 'Xodimni tekshirish',
      calendar: 'Google Taqvim',
    },
    kpi: {
      inquiries: 'Murojaatlar',
      inquiriesSub: 'Davrdagi suhbatlar',
      qualified: 'Saralangan',
      qualifiedSub: 'Maqsadli mijozlar',
      bookings: 'Yozuvlar va Buyurtmalar',
      bookingsSub: 'Taqvimga tasdiqlangan',
      conversion: 'Konversiya',
      conversionSub: "Umumiy trafikdan yozuvlar foizi",
    },
    funnel: {
      new: 'Yangi murojaat',
      qualified: 'Saralangan',
      booked: 'Taqvimga yozildi',
      orderNew: 'Yangi buyurtma',
      orderConfirmed: 'Buyurtma tasdiqlandi',
      orderPaid: "To'landi",
      orderDelivered: 'Yetkazildi',
    },
    niches: {
      education: "O'quv markazi / Kurslar",
      clinic: 'Tibbiyot markazi / Klinika',
      beauty: "Go'zallik saloni / Ustalar",
      ecommerce: "Internet do'kon / Chakana savdo",
      other: "Boshqa soha / Xizmatlar",
    },
  },

  en: {
    appName: 'AI Business OS',
    appSubtitle: 'Corporate CRM & AI Employees',
    aiEmployee: 'AI Employee',
    aiEmployees: 'AI Employees',
    token: 'token',
    tokens: 'tokens',
    balance: 'Balance',
    topup: 'Top Up',
    logout: 'Sign Out',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    create: 'Create',
    status: 'Status',
    active: 'Active',
    draft: 'Draft',
    paused: 'Paused',
    loading: 'Loading...',
    noData: 'No data',
    search: 'Search...',
    filter: 'Filter',
    nav: {
      overview: 'Overview & Funnel',
      leads: 'Clients & Bookings',
      conversations: 'Conversations',
      agents: 'AI Employees',
      billing: 'Plans & Balance',
      settings: 'Settings',
      admin: 'Platform Admin',
      sandbox: 'Test Employee',
      calendar: 'Google Calendar',
    },
    kpi: {
      inquiries: 'Inquiries',
      inquiriesSub: 'Dialogues in period',
      qualified: 'Qualified',
      qualifiedSub: 'Target prospects',
      bookings: 'Bookings & Orders',
      bookingsSub: 'Confirmed to calendar',
      conversion: 'Funnel Conversion',
      conversionSub: 'Bookings from total inquiries',
    },
    funnel: {
      new: 'New inquiry',
      qualified: 'Qualified',
      booked: 'Booked to calendar',
      orderNew: 'New order',
      orderConfirmed: 'Order confirmed',
      orderPaid: 'Paid',
      orderDelivered: 'Delivered',
    },
    niches: {
      education: 'Education Center / Courses',
      clinic: 'Medical Center / Clinic',
      beauty: 'Beauty Salon / Masters',
      ecommerce: 'Online Store / Retail',
      other: 'Other Niche / Services',
    },
  },
};
