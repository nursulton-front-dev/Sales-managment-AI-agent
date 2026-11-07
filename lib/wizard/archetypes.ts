/**
 * AI Agent Setup Archetypes
 * Specialized industry configurations for gapcha AI
 */

import { WizardNiche, AgentDraft } from './types';

export interface ArchetypeDefinition {
  id: WizardNiche;
  titleRu: string;
  titleUz: string;
  descriptionRu: string;
  descriptionUz: string;
  defaultNameRu: string;
  defaultNameUz: string;
  defaultGoalRu: string;
  defaultGoalUz: string;
  interviewQuestionsRu: string[];
  interviewQuestionsUz: string[];
  samplePricingRu: string;
  samplePricingUz: string;
  defaultQuestionsRu: string[];
  defaultQuestionsUz: string[];
  defaultRestrictionsRu: string[];
  defaultRestrictionsUz: string[];
  defaultHandoverRu: string[];
  defaultHandoverUz: string[];
}

export const ARCHETYPES: Record<WizardNiche, ArchetypeDefinition> = {
  courses: {
    id: 'courses',
    titleRu: 'Учебный центр',
    titleUz: 'Oʻquv markazi',
    descriptionRu: 'Курсы, языковые школы, подготовка к экзаменам и запись на пробный урок.',
    descriptionUz: 'Kurslar, til maktablari, imtihonlarga tayyorgarlik va sinov darsiga yozish.',
    defaultNameRu: 'ИИ-Менеджер Приемной Комиссии',
    defaultNameUz: 'Qabul boʻlimi AI-menejeri',
    defaultGoalRu: 'Консультация по предметам, уровню подготовки и запись на бесплатный пробный урок.',
    defaultGoalUz: 'Fanlar, tayyorgarlik darajasi boʻyicha maslahat va bepul sinov darsiga yozish.',
    interviewQuestionsRu: [
      'Каким предметам или направлениям вы обучаете (например: английский язык, IELTS, IT, математика)?',
      'Для кого предназначены курсы (дети, школьники, взрослые) и какой формат (онлайн или оффлайн)?',
      'Какова стоимость обучения и есть ли бесплатный пробный урок или тестирование уровня?',
      'По какому графику проходят занятия и в какие дни удобно приглашать учеников?'
    ],
    interviewQuestionsUz: [
      'Qaysi fanlar yoki yoʻnalishlar boʻyicha oʻqitasiz (masalan: ingliz tili, IELTS, IT, matematika)?',
      'Kurslar kimlar uchun moʻljallangan (bolalar, oʻquvchilar, kattalar) va qaysi formatda (onlayn yoki oflayn)?',
      'Oʻqish narxi qancha va bepul sinov darsi yoki darajani aniqlash testi bormi?',
      'Darslar qaysi kun va vaqtlarda boʻladi va sinov darsiga qachon taklif qilish qulay?'
    ],
    samplePricingRu: `- Групповые занятия (3 раза в неделю): 650 000 сум / мес
- Интенсивный курс подготовки (IELTS / SAT): 950 000 сум / мес
- Индивидуальные уроки: 1 400 000 сум / мес
- Диагностический пробный урок: Бесплатно (30 мин)`,
    samplePricingUz: `- Guruh darslari (haftada 3 marta): 650 000 soʻm / oy
- Intensiv tayyorgarlik kursi (IELTS / SAT): 950 000 soʻm / oy
- Individual darslar: 1 400 000 soʻm / oy
- Diagnostik sinov darsi: Bepul (30 daqiqa)`,
    defaultQuestionsRu: [
      'Для кого планируете обучение (для себя или ребенка) и какой возраст?',
      'Какой у вас текущий уровень подготовки (с нуля или уже изучали)?',
      'В какой день и время вам удобно подойти на бесплатный пробный урок?'
    ],
    defaultQuestionsUz: [
      'Kim uchun taʼlim rejalashtiryapsiz (oʻzingiz yoki farzandingiz) va yoshingiz nechada?',
      'Hozirgi tayyorgarlik darajangiz qanday (noldan yoki avval oʻrgangansiz)?',
      'Qaysi kuni va soat nechada bepul sinov darsiga kela olasiz?'
    ],
    defaultRestrictionsRu: [
      'Не обещать 100% сдачу экзамена или гарантированный балл без посещения занятий.',
      'Не делать несогласованных скидок без решения руководства.',
      'Не выдавать себя за живого человека, если клиент прямо спрашивает.'
    ],
    defaultRestrictionsUz: [
      'Darslarga qatnashmasdan 100% natija yoki kafolatlangan ball vaʼda qilmaslik.',
      'Rahbariyat bilan kelishilmagan chegirmalar bermaslik.',
      'Mijoz toʻgʻridan-toʻgʻri soʻrasa, oʻzini tirik inson deb aldamaslik.'
    ],
    defaultHandoverRu: [
      'Клиент запрашивает индивидуальную рассрочку или возврат средств.',
      'Клиент выражает жалобу или недовольство уроком.',
      'Клиент требует связать с директором или преподавателем напрямую.'
    ],
    defaultHandoverUz: [
      'Mijoz toʻlovni boʻlib toʻlash yoki pulni qaytarishni soʻraganda.',
      'Mijoz dars sifatidan shikoyat qilganda.',
      'Mijoz toʻgʻridan-toʻgʻri rahbar yoki oʻqituvchi bilan gaplashishni talab qilganda.'
    ],
  },
  marketing: {
    id: 'marketing',
    titleRu: 'Маркетинговое агентство',
    titleUz: 'Marketing agentligi',
    descriptionRu: 'Лидогенерация, таргетинг, контекстная реклама, SMM и запись на стратегический аудит.',
    descriptionUz: 'Lidlar jalb qilish, target, kontekstli reklama, SMM va strategik auditga yozish.',
    defaultNameRu: 'ИИ-Маркетолог агентства',
    defaultNameUz: 'Agentlik AI-marketologi',
    defaultGoalRu: 'Квалификация клиента по нише и бюджету, презентация услуг и назначение созвона с экспертом.',
    defaultGoalUz: 'Mijoz sohasini va byudjetini saralash, xizmatlarni taqdim etish va ekspert bilan suhbatga yozish.',
    interviewQuestionsRu: [
      'Какие основные услуги оказывает ваше агентство (таргет, SMM, разработка сайтов, контекст)?',
      'С какими сферами бизнеса вы преимущественно работаете и какой минимальный рекламный бюджет?',
      'Сколько стоят ваши услуги (фиксированная оплата, % от бюджета или пакеты)?',
      'Каков порядок старта работы: бесплатный экспресс-аудит, бриф или созвон с маркетологом?'
    ],
    interviewQuestionsUz: [
      'Agentligingiz asosan qaysi xizmatlarni koʻrsatadi (target, SMM, sayt yaratish, kontekst)?',
      'Koʻproq qaysi biznes sohalari bilan ishlaysiz va minimal reklama byudjeti qancha?',
      'Xizmatlaringiz narxi qanday (oylik toʻlov, byudjet foizi yoki tarif paketlari)?',
      'Hamkorlikni boshlash tartibi qanday: bepul ekspress-audit, brif yoki marketolog bilan qoʻngʻiroq?'
    ],
    samplePricingRu: `- Комплексный таргетинг (Meta / Instagram): от 3 500 000 сум / мес
- Ведение и стратегия SMM (12 рилс + визуал): от 4 500 000 сум / мес
- Контекстная реклама Google / Яндекс: от 3 000 000 сум / мес
- Разработка конверсионного лендинга: от 5 000 000 сум
- Стартовый аудит текущей рекламы: Бесплатно (20 мин созвон)`,
    samplePricingUz: `- Kompleks target reklamasi (Meta / Instagram): 3 500 000 soʻmdan / oy
- SMM strategiyasi va yuritish (12 reels + dizayn): 4 500 000 soʻmdan / oy
- Google / Yandex kontekst reklamasi: 3 000 000 soʻmdan / oy
- Konversiyali lending yaratish: 5 000 000 soʻmdan
- Reklamani dastlabki auditi: Bepul (20 daqiqalik maslahat)`,
    defaultQuestionsRu: [
      'Какой продукт или услугу вы продвигаете и какая у вас сфера бизнеса?',
      'Запускали ли вы рекламу ранее и какой у вас ориентировочный бюджет в месяц?',
      'В какой день и время вам удобно созвониться с маркетологом на 15-минутный экспресс-разбор?'
    ],
    defaultQuestionsUz: [
      'Qaysi mahsulot yoki xizmatni reklama qilyapsiz va biznesingiz yoʻnalishi nima?',
      'Avval reklama yoqqanmisiz va oylik taxminiy reklama byudjetingiz qancha?',
      'Marketolog bilan 15 daqiqalik audit suhbatiga qaysi kuni va soat nechada qulay?'
    ],
    defaultRestrictionsRu: [
      'Не гарантировать точное число продаж или лидов до проведения аудита и тестов.',
      'Четко разделять стоимость услуг агентства и рекламный бюджет на площадках (Meta/Google).',
      'Не называть ориентировочные цены финальными без составления медиаплана.'
    ],
    defaultRestrictionsUz: [
      'Audit va testlar oʻtkazmasdan turib aniq sotuvlar yoki lidlar sonini kafolatlamaslik.',
      'Agentlik xizmat haqi va platformalardagi reklama byudjetini (Meta/Google) aniq ajratib koʻrsatish.',
      'Mediaplan tuzilmasdan taxminiy narxlarni qatʼiy deb aytmaslik.'
    ],
    defaultHandoverRu: [
      'Клиент готов заключить договор на индивидуальных условиях.',
      'Клиент запрашивает тендерную документацию или оплату по безналичному расчету.',
      'Возник сложный юридический вопрос.'
    ],
    defaultHandoverUz: [
      'Mijoz individual shartlar bilan shartnoma tuzishga tayyor boʻlganda.',
      'Mijoz tender hujjatlarini yoki yuridik toʻlov rekvizitlarini soʻraganda.',
      'Murakkab huquqiy savollar yuzaga kelganda.'
    ],
  },
  services: {
    id: 'services',
    titleRu: 'Сфера услуг',
    titleUz: 'Xizmatlar sohasi',
    descriptionRu: 'Клиники, салоны, консультации, автосервис, ремонт, бытовые и B2B услуги.',
    descriptionUz: 'Klinikalar, goʻzallik salonlari, konsalting, avtoservis, maishiy va B2B xizmatlar.',
    defaultNameRu: 'ИИ-Администратор Сервиса',
    defaultNameUz: 'Xizmatlar AI-administratori',
    defaultGoalRu: 'Консультация по услугам, расчет стоимости, подбор времени и запись на визит.',
    defaultGoalUz: 'Xizmatlar boʻyicha maslahat, narxni hisoblash, vaqt tanlash va qabulga yozish.',
    interviewQuestionsRu: [
      'Какие основные виды услуг вы оказываете и какова их длительность?',
      'Какой у вас прайс-лист или минимальная стоимость услуг?',
      'Где оказываются услуги (в вашем филиале, на выезде, онлайн) и каков график работы?',
      'За сколько времени клиенту нужно записываться и какие правила отмены визита?'
    ],
    interviewQuestionsUz: [
      'Asosan qanday xizmat turlarini koʻrsatasiz va ularning davomiyligi qancha?',
      'Xizmatlaringiz narxlari yoki boshlangʻich narxi qancha?',
      'Xizmatlar qayerda koʻrsatiladi (filialingizda, borgan holda, onlayn) va ish vaqtingiz qanday?',
      'Mijoz uchrashuvga qancha vaqt oldin yozilishi kerak va bekor qilish qoidalari qanday?'
    ],
    samplePricingRu: `- Первичная консультация специалиста: 150 000 сум (30 мин)
- Базовый комплекс процедур / услуг: от 350 000 сум
- Расширенный комплекс: от 650 000 сум
- Срочный выезд мастера / специалиста: +100 000 сум`,
    samplePricingUz: `- Mutaxassisning dastlabki konsultatsiyasi: 150 000 soʻm (30 daqiqa)
- Asosiy xizmatlar toʻplami: 350 000 soʻmdan
- Kengaytirilgan xizmatlar toʻplami: 650 000 soʻmdan
- Shoshilinch xizmat koʻrsatish: +100 000 soʻm`,
    defaultQuestionsRu: [
      'Какая именно услуга или вопрос вас интересует?',
      'Обращались ли вы к нам ранее?',
      'На какой день и примерное время вам удобнее записаться?'
    ],
    defaultQuestionsUz: [
      'Sizni aynan qaysi xizmat yoki masala qiziqtirmoqda?',
      'Avval bizning xizmatimizdan foydalanganmisiz?',
      'Qaysi kun va taxminan qaysi vaqtga yozilish sizga qulay?'
    ],
    defaultRestrictionsRu: [
      'Не подтверждать запись на время, не согласованное в графике.',
      'Не обещать точную фиксированную стоимость без осмотра или диагностики, если требуется оценка.',
      'Не менять правила отмены визитов.'
    ],
    defaultRestrictionsUz: [
      'Ish jadvalida boʻsh boʻlmagan vaqtga qabulni tasdiqlamaslik.',
      'Koʻrik yoki diagnostika talab etiladigan holatlarda oldindan aniq qatʼiy narx aytmaslik.',
      'Qabulni bekor qilish qoidalarini asossiz oʻzgartirmaslik.'
    ],
    defaultHandoverRu: [
      'Клиент запрашивает нестандартную комплексную услугу.',
      'Клиент выражает претензию по качеству оказанной услуги.',
      'Клиент просит соединить со старшим администратором.'
    ],
    defaultHandoverUz: [
      'Mijoz nostandart xizmat talab qilganda.',
      'Koʻrsatilgan xizmat sifati boʻyicha eʼtiroz bildirilganda.',
      'Katta maʼmur bilan bogʻlanishni soʻraganda.'
    ],
  },
  other: {
    id: 'other',
    titleRu: 'Универсальный бизнес',
    titleUz: 'Umumiy biznes',
    descriptionRu: 'Торговля, производство, B2B поставки, аренда или любой другой вид деятельности.',
    descriptionUz: 'Savdo, ishlab chiqarish, B2B taʼminot, ijara yoki boshqa faoliyat turlari.',
    defaultNameRu: 'ИИ-Менеджер gapcha AI',
    defaultNameUz: 'gapcha AI boshqaruvchisi',
    defaultGoalRu: 'Презентация предложений компании, сбор контактов и передача заинтересованных клиентов в отдел продаж.',
    defaultGoalUz: 'Kompaniya takliflarini taqdim etish, kontaktlarni yigʻish va mijozlarni savdo boʻlimiga yoʻnaltirish.',
    interviewQuestionsRu: [
      'Чем занимается ваша компания и какие ключевые товары или услуги вы предлагаете?',
      'Кто ваши основные покупатели (физические лица или компании) и по каким критериям они выбирают вас?',
      'Каков примерный диапазон цен и основные условия доставки или оплаты?',
      'Какова главная цель сотрудника: сразу принять заказ, записать на консультацию или собрать контакты?'
    ],
    interviewQuestionsUz: [
      'Kompaniyangiz nima bilan shugʻullanadi va asosiy tovar yoki xizmatlaringiz nimalardan iborat?',
      'Asosiy xaridorlaringiz kimlar (jismoniy shaxslar yoki kompaniyalar)?',
      'Taxminiy narxlar diapazoni, yetkazib berish va toʻlov shartlari qanday?',
      'Xodimning asosiy maqsadi nima: buyurtma olish, uchrashuv belgilash yoki kontaktlarni toʻplash?'
    ],
    samplePricingRu: `- Базовое предложение: от 300 000 сум
- Стандартный пакет: от 700 000 сум
- Индивидуальный расчет: по запросу в зависимости от объема`,
    samplePricingUz: `- Boshlangʻich taklif: 300 000 soʻmdan
- Standart toʻplam: 700 000 soʻmdan
- Shaxsiy hisob-kitob: hajmga qarab soʻrov boʻyicha`,
    defaultQuestionsRu: [
      'Какой конкретно товар или услуга вас интересует?',
      'Какой у вас ориентировочный объем заказа или сроки реализации?',
      'Оставьте ваш контактный номер телефона для подтверждения и расчета стоимости.'
    ],
    defaultQuestionsUz: [
      'Sizni aynan qaysi mahsulot yoki xizmat qiziqtirmoqda?',
      'Buyurtma hajmi yoki muddatlaringiz qanday?',
      'Hisob-kitob va tasdiqlash uchun telefon raqamingizni qoldiring.'
    ],
    defaultRestrictionsRu: [
      'Не обещать доставку или выполнение в нереалистичные сроки.',
      'Не соглашаться на скидки сверх установленного прайса.',
      'Не разглашать внутреннюю себестоимость или коммерческую тайну.'
    ],
    defaultRestrictionsUz: [
      'Imkonsiz muddatlarda yetkazib berishni vaʼda qilmaslik.',
      'Belgilangan narxdan tashqari oʻzboshimchalik bilan chegirma bermaslik.',
      'Ichki tannarx yoki tijorat sirlarini oshkor qilmaslik.'
    ],
    defaultHandoverRu: [
      'Крупный оптовый заказ или нестандартное техническое задание.',
      'Вопрос о возврате товара или претензия.',
      'Прямой запрос связи с отделом снабжения или руководством.'
    ],
    defaultHandoverUz: [
      'Katta ulgurji buyurtma yoki nostandart texnik talab.',
      'Mahsulotni qaytarish masalasi yoki daʼvo.',
      'Taʼminot boʻlimi yoki rahbariyat bilan toʻgʻridan-toʻgʻri bogʻlanish soʻrovi.'
    ],
  },
};

export function createInitialDraft(niche: WizardNiche = 'courses', lang: 'ru' | 'uz' = 'ru'): AgentDraft {
  const arch = ARCHETYPES[niche];
  return {
    name: lang === 'uz' ? arch.defaultNameUz : arch.defaultNameRu,
    nicheTemplate: niche,
    targetGoal: lang === 'uz' ? arch.defaultGoalUz : arch.defaultGoalRu,
    languages: ['ru', 'uz'],
    tone: 'consultative',
    servicesAndPricing: lang === 'uz' ? arch.samplePricingUz : arch.samplePricingRu,
    qualificationQuestions: lang === 'uz' ? [...arch.defaultQuestionsUz] : [...arch.defaultQuestionsRu],
    restrictions: lang === 'uz' ? [...arch.defaultRestrictionsUz] : [...arch.defaultRestrictionsRu],
    handoverConditions: lang === 'uz' ? [...arch.defaultHandoverUz] : [...arch.defaultHandoverRu],
    googleCalendarConnected: false,
    channels: ['telegram'],
    unresolvedQuestions: [],
    currentStep: 1,
    updatedAt: new Date().toISOString(),
  };
}
