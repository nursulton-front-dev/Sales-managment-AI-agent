/**
 * Platform Knowledge Base for gapcha AI
 * Fully bilingual (Russian & Uzbek Latin) with factual feature documentation.
 */

import { KnowledgeSnippet, AssistantLanguage } from './types';

export const PLATFORM_KNOWLEDGE: KnowledgeSnippet[] = [
  {
    id: 'kb_registration_login',
    category: 'auth',
    titleRu: 'Регистрация и вход в систему',
    titleUz: 'Tizimga roʻyxatdan oʻtish va kirish',
    contentRu: `Регистрация в gapcha AI проходит в два шага:
1. Ввод email и пароля, выбор имени и телефона (+998).
2. Подтверждение email 6-значным кодом, отправленным на почту.
Также поддерживается быстрый вход через Google (Google SSO).
Если забыли пароль: на странице входа перейдите по ссылке «Забыли пароль?», введите ваш email и подтвердите сброс кодом.
При входе в компанию создаётся изолированный воркспейс с тестовым балансом 100 ответов.`,
    contentUz: `gapcha AI da roʻyxatdan oʻtish 2 bosqichda amalga oshiriladi:
1. Email va parol kiritish, ism va telefon raqamini koʻrsatish (+998).
2. Elektron pochtaga yuborilgan 6 xonali tasdiqlash kodi orqali emailni tasdiqlash.
Shuningdek Google orqali tezkor kirish (Google SSO) imkoniyati mavjud.
Parolni unutgan boʻlsangiz: kirish sahifasida «Parolni unutdingizmi?» havolasiga oʻting, emailni kiriting va kod orqali yangilang.
Kompaniya yaratilganda 100 ta javobdan iborat sinov balansi bilan alohida ish maydoni (workspace) ochiladi.`,
    quickLink: '/dashboard/profile',
    tags: ['вход', 'регистрация', 'пароль', 'код', 'google', 'kirish', 'profil', 'parol'],
  },
  {
    id: 'kb_agents_overview',
    category: 'agents',
    titleRu: 'Создание и настройка ИИ-сотрудника',
    titleUz: 'AI-xodimni yaratish va sozlash',
    contentRu: `ИИ-сотрудник — это ваш цифровой менеджер по продажам и консультациям.
В разделе «ИИ-сотрудники» можно:
- Создать сотрудника через интерактивный диалог («Настроить с ИИ») или вручную («Заполнить самостоятельно»).
- Задать отраслевой сценарий: Учебный центр (courses), Маркетинг (marketing), Услуги (services) или Универсальный бизнес (other).
- Заполнить базу знаний (прайс, услуги, правила, график) и квалификационные вопросы.
- Включить или выключить сотрудника переключателем активности.
Лимиты сотрудников по тарифам:
- TRIAL / START: 1 сотрудник
- BUSINESS: 3 сотрудника
- PRO: 10 сотрудников.`,
    contentUz: `AI-xodim — bu savdo va mijozlarga xizmat koʻrsatish boʻyicha raqamli menejeringiz.
«AI-xodimlar» boʻlimida quyidagilarni amalga oshirish mumkin:
- Xodimni suhbat orqali («AI bilan sozlash») yoki qoʻlda («Oʻzim toʻldiraman») yaratish.
- Soha ssenariysini tanlash: Oʻquv markazi (courses), Marketing (marketing), Xizmatlar (services) yoki Umumiy biznes (other).
- Bilimlar bazasini (narxlar, xizmatlar, qoidalar, ish vaqti) va saralash savollarini kiritish.
- Xodimni faollashtirish yoki vaqtincha toʻxtatish.
Tariflar boʻyicha xodimlar limiti:
- TRIAL / START: 1 ta xodim
- BUSINESS: 3 ta xodim
- PRO: 10 ta xodim.`,
    quickLink: '/dashboard/agents',
    tags: ['сотрудник', 'агент', 'создать', 'лимит', 'настройка', 'xodim', 'agent', 'yaratish'],
  },
  {
    id: 'kb_channels_telegram',
    category: 'channels',
    titleRu: 'Подключение Telegram: бот и Telegram Business',
    titleUz: 'Telegramni ulash: Bot va Telegram Business',
    contentRu: `В gapcha AI поддерживается два режима работы с Telegram:
1. Telegram Business (секретарь на личный или корпоративный аккаунт Telegram Premium):
   - Подключается в разделе «Интеграции» → «Telegram Business».
   - Нажмите «Подключить аккаунт», бот платформы @gapcha_assistant_bot пришлёт подтверждение.
   - В Telegram перейдите в Настройки → Telegram для бизнеса → Чат-боты, выберите @gapcha_assistant_bot и предоставьте права на ответы.
   - Важно: если владелец сам отвечает клиенту в чате, ИИ автоматически берёт паузу (Human Takeover) без расхода токенов.
2. Отдельный Telegram-бот компании:
   - Создаётся через @BotFather, полученный токен вставляется в настройках сотрудника.`,
    contentUz: `gapcha AI tizimida Telegram bilan ishlashning 2 xil usuli mavjud:
1. Telegram Business (shaxsiy yoki biznes Telegram Premium hisobingiz uchun kotib):
   - «Integratsiyalar» → «Telegram Business» boʻlimida ulanadi.
   - «Hisobni ulash» tugmasini bosing, platformaning @gapcha_assistant_bot boti orqali tasdiqlash amalga oshiriladi.
   - Telegramda Sozlamalar → Biznes uchun Telegram → Chat-botlar boʻlimiga oʻtib, botga javob berish huquqini bering.
   - Muhim: agar hisob egasi mijozga oʻzi javob bersa, AI avtomatik tarzda toʻxtaydi (Human Takeover) va balansdan token yechilmaydi.
2. Alohida Telegram-bot:
   - @BotFather orqali yaratiladi va olingan bot-token xodim sozlamalariga kiritiladi.`,
    quickLink: '/dashboard/integrations',
    tags: ['telegram', 'business', 'бот', 'секретарь', 'ulash', 'botfather'],
  },
  {
    id: 'kb_channels_instagram',
    category: 'instagram',
    titleRu: 'Подключение Instagram Direct',
    titleUz: 'Instagram Direct integratsiyasi',
    contentRu: `Для подключения Instagram Direct:
1. Перейдите в раздел «Интеграции» → карточка «Instagram Direct» → «Подключить».
2. Войдите через Facebook/Meta и выберите вашу Бизнес-страницу Facebook, к которой привязан профессиональный аккаунт Instagram (Professional/Business/Creator).
3. Разрешите доступ к сообщениям Direct (instagram_manage_messages, pages_manage_metadata).
4. Настройте переключатель «Автоответы ИИ».
Ограничение Meta: ИИ может отвечать клиентам только в рамках 24-часового окна с момента последнего сообщения клиента.`,
    contentUz: `Instagram Direct ni ulash uchun:
1. «Integratsiyalar» → «Instagram Direct» kartasiga oʻting → «Ulash» tugmasini bosing.
2. Meta/Facebook orqali kiring va Instagram professional hisobingiz (Business/Creator) ulangan Facebook sahifasini tanlang.
3. Direct xabarlariga ruxsat bering (instagram_manage_messages, pages_manage_metadata).
4. «AI avto-javoblari» tugmachasini yoqing.
Meta qoidasi: AI faqat mijoz yozgan vaqtdan boshlab 24 soatlik xabar oynasi ichida javob bera oladi.`,
    quickLink: '/dashboard/integrations',
    tags: ['instagram', 'директ', 'meta', 'facebook', 'direct', 'xabarlar'],
  },
  {
    id: 'kb_widget_website',
    category: 'widget',
    titleRu: 'Виджет чата для сайта',
    titleUz: 'Veb-sayt uchun chat vidjeti',
    contentRu: `Виджет сайта позволяет вашим посетителям общаться с ИИ прямо на страницах сайта:
1. Откройте «Интеграции» → «Виджет для сайта».
2. Настройте приветственное сообщение, цвет виджета и привязанного сотрудника.
3. Скопируйте готовый HTML-код со скриптом и вставьте его перед закрывающим тегом </body> на вашем сайте.
Виджет автоматически передает диалоги и лиды в ваш кабинет gapcha AI.`,
    contentUz: `Sayt vidjeti orqali tashrif buyuruvchilar saytingizda toʻgʻridan-toʻgʻri AI bilan muloqot qilishi mumkin:
1. «Integratsiyalar» → «Sayt vidjeti» boʻlimini oching.
2. Qutlov xabari, rang va biriktirilgan xodimni sozlang.
3. Tayyor HTML skript kodini nusxalab, saytingizning </body> tegi oldiga joylashtiring.
Vidjet barcha yozishmalar va yangi mijozlarni toʻgʻridan-toʻgʻri gapcha AI kabinetingizga uzatadi.`,
    quickLink: '/dashboard/integrations',
    tags: ['виджет', 'сайт', 'скрипт', 'онлайн чат', 'vidjet', 'sayt'],
  },
  {
    id: 'kb_calendar_booking',
    category: 'calendar',
    titleRu: 'Google Календарь и онлайн-запись',
    titleUz: 'Google Taqvim va onlayn yozilish',
    contentRu: `Google Календарь используется для проверки свободных слотов и автоматической записи клиентов:
1. Подключение: кнопка календаря в шапке или в разделе «Интеграции». Авторизуйтесь в Google.
2. Рабочие часы: настраиваются в профиле компании (например, 10:00-18:00).
3. Длительность слота: 15, 30, 45, 60 или 90 минут.
4. Логика ИИ: сотрудник проверяет слоты через безопасный инструмент check_calendar_slots и создаёт запись (book_appointment) ТОЛЬКО после явного согласия клиента на конкретный день и время.
Записи в нерабочее время, на выходные или на уже занятые интервалы отклоняются.`,
    contentUz: `Google Taqvim boʻsh vaqtlarni tekshirish va mijozlarni avtomatik roʻyxatga yozish uchun xizmat qiladi:
1. Ulash: yuqori qismdagi taqvim tugmasi yoki «Integratsiyalar» orqali Google bilan kiring.
2. Ish vaqti: kompaniya profilida oʻrnatiladi (masalan, 10:00-18:00).
3. Uchrashuv davomiyligi: 15, 30, 45, 60 yoki 90 daqiqa.
4. AI mantigʻi: xodim faqat mijoz sana va vaqtni aniq tasdiqlaganidan soʻnggina yozuv yaratadi.
Ishdan tashqari vaqt, dam olish kunlari va band oraliqlarga yozilish avtomatik rad etiladi.`,
    quickLink: '/dashboard/settings',
    tags: ['календарь', 'запись', 'слоты', 'google calendar', 'taqvim', 'vaqt'],
  },
  {
    id: 'kb_conversations_takeover',
    category: 'conversations',
    titleRu: 'Диалоги и ручной перехват (Human Takeover)',
    titleUz: 'Muloqotlar va operator nazorati (Human Takeover)',
    contentRu: `Раздел «Диалоги» собирает все входящие обращения из Telegram, Instagram и виджета сайта:
- Список диалогов слева фильтруется по каналам и статусу («Все», «Авто-ИИ», «Ручной»).
- Ручной перехват: в правом верхнем углу диалога нажмите «Перехватить диалог» или просто отправьте сообщение клиенту. ИИ мгновенно остановит автоответы.
- Возврат ИИ: нажмите «Вернуть ИИ», чтобы цифровой сотрудник продолжил ведение диалога.
- Сообщения, отправленные оператором/владельцем вручную, НЕ расходуют баланс токенов.`,
    contentUz: `«Muloqotlar» boʻlimida Telegram, Instagram va sayt vidjetidan barcha xabarlar jamlanadi:
- Chapdagi roʻyxat kanallar va holatlar boʻyicha saralanadi («Barchasi», «AI-avto», «Qoʻlda»).
- Operator nazorati: oʻng yuqori burchakda «Boshqaruvni olish» tugmasini bosing yoki mijozga shunchaki xabar yuboring. AI avtomatik javoblarni shu zahoti toʻxtatadi.
- AIni qaytarish: «AIni qaytarish» tugmasi orqali xodim yana faollashadi.
- Operator tomonidan yuborilgan qoʻlda javoblar uchun balansdan token yechilmaydi.`,
    quickLink: '/dashboard/conversations',
    tags: ['диалоги', 'перехват', 'пауза', 'оператор', 'muloqot', 'takeover'],
  },
  {
    id: 'kb_leads_crm',
    category: 'leads',
    titleRu: 'Лиды и управление заявками',
    titleUz: 'Lidlar va arizalarni boshqarish',
    contentRu: `Раздел «Лиды и записи» — это мини-CRM для ваших потенциальных клиентов:
- Статусы: «Новый» (new), «Квалифицирован» (qualified), «Записан» (booked).
- Когда клиент оставляет номер телефона, ИИ автоматически фиксирует лид.
- Повторные обращения от одного клиента не создают дублей — они обновляют существующую карточку (дедупликация).
- Если клиент записан через Google Календарь, в карточке отображается время встречи и ссылка на событие.`,
    contentUz: `«Lidlar va yozuvlar» boʻlimi — bu potentsial mijozlar uchun mini-CRM tizimi:
- Bosqichlar: «Yangi» (new), «Saralangan» (qualified), «Yozilgan» (booked).
- Mijoz telefon raqamini qoldirishi bilan AI avtomatik yangi lid yaratadi.
- Bir mijozning qayta murojaati dublikat yaratmaydi — mavjud karta yangilanadi (deduplikatsiya).
- Agar mijoz Google Taqvim orqali yozilgan boʻlsa, kartada uchrashuv vaqti va havola saqlanadi.`,
    quickLink: '/dashboard/leads',
    tags: ['лиды', 'заявки', 'клиенты', 'crm', 'lidlar', 'mijozlar'],
  },
  {
    id: 'kb_billing_tokens',
    category: 'billing',
    titleRu: 'Тарифы, баланс и расход токенов',
    titleUz: 'Tariflar, balans va tokenlar sarfi',
    contentRu: `В gapcha AI расход учитывается в ответах клиентам:
- При регистрации начисляется 100 бесплатных ответов (Trial).
- Тарифы:
  • START ($19 / мес): 1 000 ответов, 1 сотрудник, 1 канал.
  • BUSINESS ($49 / мес): 3 000 ответов, 3 сотрудника, все каналы, Google Calendar.
  • PRO ($99 / мес): 10 000 ответов, 10 сотрудников, приоритетная поддержка.
- Пакеты пополнения: 500 ответов ($10), 1 500 ответов ($25), 5 000 ответов ($70).
- Оплата: Payme, Click, Uzum, банковские карты.
ВАЖНО: Использование Помощника платформы и ИИ-мастера настройки сотрудника НЕ списывает баланс ответов!`,
    contentUz: `gapcha AI da xarajat mijozlarga yuborilgan javoblar boʻyicha hisoblanadi:
- Roʻyxatdan oʻtganingizda 100 ta bepul javob (Trial) beriladi.
- Tarif rejalari:
  • START ($19 / oy): 1 000 ta javob, 1 ta xodim, 1 ta kanal.
  • BUSINESS ($49 / oy): 3 000 ta javob, 3 ta xodim, barcha kanallar, Google Taqvim.
  • PRO ($99 / oy): 10 000 ta javob, 10 ta xodim, tezkor qoʻllab-quvvatlash.
- Qoʻshimcha javob paketlari: 500 ta ($10), 1 500 ta ($25), 5 000 ta ($70).
- Toʻlov usullari: Payme, Click, Uzum, bank kartalari.
MUHIM: Platforma yordamchisi va AI-sozlash ustasidan foydalanish mijozlar balansidan token yechmaydi!`,
    quickLink: '/dashboard/billing',
    tags: ['тарифы', 'оплата', 'токены', 'баланс', 'цены', 'tariflar', 'toʻlov', 'balans'],
  },
  {
    id: 'kb_support_tickets',
    category: 'support',
    titleRu: 'Техническая поддержка и обращения',
    titleUz: 'Texnik yordam va murojaatlar',
    contentRu: `Если возникла техническая проблема или есть пожелания:
- Перейдите в раздел «Поддержка» или попросите Помощника платформы создать обращение.
- Помощник может автоматически прикрепить безопасную сводку диагностики (статус каналов, без паролей и личных данных).
- Каждому обращению присваивается номер вида #T-XXXXXX.
- Вы можете отслеживать статус и ответы команды поддержки прямо в кабинете.`,
    contentUz: `Agar texnik muammo yuzaga kelsa yoki savollaringiz boʻlsa:
- «Qoʻllab-quvvatlash» boʻlimiga oʻting yoki Platforma yordamchisidan murojaat ochishni soʻrang.
- Yordamchi xavfsiz diagnostika hisobotini (kanallar holati, shaxsiy maʼlumotlarsiz) ilova qilishi mumkin.
- Har bir murojaatga #T-XXXXXX koʻrinishidagi rasmiy raqam beriladi.
- Murojaat holati va javoblarni toʻgʻridan-toʻgʻri kabinetda koʻrib borishingiz mumkin.`,
    quickLink: '/dashboard/support',
    tags: ['поддержка', 'тикет', 'обращение', 'ошибка', 'yordam', 'murojaat'],
  },
];

export function searchPlatformKnowledge(query: string, lang: AssistantLanguage = 'ru'): KnowledgeSnippet[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return PLATFORM_KNOWLEDGE.slice(0, 4);

  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return PLATFORM_KNOWLEDGE.slice(0, 4);

  const scored = PLATFORM_KNOWLEDGE.map(item => {
    let score = 0;
    const title = (lang === 'uz' ? item.titleUz : item.titleRu).toLowerCase();
    const content = (lang === 'uz' ? item.contentUz : item.contentRu).toLowerCase();

    for (const word of words) {
      if (title.includes(word)) score += 5;
      if (item.tags.some(t => t.includes(word))) score += 4;
      if (content.includes(word)) score += 1;
    }
    return { item, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
}
