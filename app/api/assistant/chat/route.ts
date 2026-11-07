import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getWorkspaceDiagnostics, prepareSupportTicketAction, executeSupportTicketCreation } from '@/lib/assistant/tools';
import { searchPlatformKnowledge } from '@/lib/assistant/knowledge';
import { AssistantLanguage, AssistantPendingAction } from '@/lib/assistant/types';
import { getLLMProvider } from '@/lib/server/ai';

// In-memory rate limiting map for platform assistant (max 30 req/min per workspace)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 30) {
    return true;
  }
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId || !session.userEmail) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация в системе' },
        { status: 401 }
      );
    }

    const workspaceId = session.workspaceId;
    if (isRateLimited(`assistant:${workspaceId}`)) {
      return NextResponse.json(
        { success: false, error: 'Слишком много запросов к помощнику. Подождите минуту.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action, pendingAction, message, history = [], lang = 'ru' } = body;
    const currentLang: AssistantLanguage = lang === 'uz' ? 'uz' : 'ru';

    // 1. Handle user confirming a pending action (e.g. ticket creation)
    if (action === 'execute_action' && pendingAction?.type === 'create_support_ticket') {
      const actionResult = await executeSupportTicketCreation(
        workspaceId,
        session.userEmail,
        session.userName || 'Пользователь платформы',
        pendingAction.payload
      );

      const reply = currentLang === 'uz'
        ? (actionResult.success
            ? `Qo'llab-quvvatlash xizmatiga #${actionResult.ticketNumber} raqamli murojaat yaratildi. Mutaxassislarimiz «Qo'llab-quvvatlash» bo'limida javob berishadi.`
            : `Murojaat yaratishda xatolik yuz berdi: ${actionResult.message}`)
        : (actionResult.success
            ? `Обращение #${actionResult.ticketNumber} успешно создано. Команда технической поддержки gapcha AI ответит вам в разделе «Поддержка».`
            : `Не удалось создать обращение: ${actionResult.message}`);

      return NextResponse.json({
        success: true,
        reply,
        actionResult,
      });
    }

    // 2. Validate input message
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Укажите текст вопроса' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Длина вопроса не должна превышать 2000 символов' },
        { status: 400 }
      );
    }

    // 3. Fetch real diagnostic state for workspace
    const diagnostics = await getWorkspaceDiagnostics(workspaceId);

    // 4. Search relevant knowledge snippets
    const knowledgeSnippets = searchPlatformKnowledge(message, currentLang);
    const knowledgeContext = knowledgeSnippets
      .slice(0, 3)
      .map(k => `[${currentLang === 'uz' ? k.titleUz : k.titleRu}]\n${currentLang === 'uz' ? k.contentUz : k.contentRu}`)
      .join('\n\n');

    // 5. Check if user explicitly asked for a support ticket
    const lowerMsg = message.toLowerCase();
    const wantsTicket = lowerMsg.includes('поддержк') || lowerMsg.includes('тикет') || lowerMsg.includes('обращени') ||
      lowerMsg.includes('yordam') || lowerMsg.includes('ticket') || lowerMsg.includes('operator');

    let pendingTicketAction: AssistantPendingAction | undefined;
    if (wantsTicket || diagnostics.recentErrors?.length) {
      if (wantsTicket || lowerMsg.includes('ошибк') || lowerMsg.includes('xato') || lowerMsg.includes('не работает')) {
        pendingTicketAction = prepareSupportTicketAction(diagnostics, {
          type: 'bug',
          subject: lowerMsg.includes('telegram')
            ? 'Вопрос по интеграции Telegram'
            : lowerMsg.includes('instagram')
            ? 'Вопрос по интеграции Instagram'
            : 'Вопрос по работе платформы',
          description: message,
        });
      }
    }

    // 6. Build system prompt for Platform Assistant
    const systemPrompt = currentLang === 'uz'
      ? `Siz gapcha AI platformasining ichki yordamchisisiz.
Vazifangiz: kompaniya rahbariga gapcha AI dan to'g'ri foydalanishga yordam berish, integratsiyalar holatini tekshirish, tariflar va xatolarni tushuntirish.

QAT'IY QOIDALAR:
1. Siz kompaniyaning mijozlar bilan muloqot qiluvchi sotuvchisi EMASsiz. Faqat platforma sozlamalari va diagnostikasi bo'yicha yordam berasiz.
2. Bu muloqot uchun mijozlar balansidan hech qanday token YECHILMAYDI.
3. Hech qachon mavjud bo'lmagan funksiyalarni va'da qilmang.
4. Javoblaringiz qisqa, aniq va amaliy bo'lsin.
5. Kerakli sahifalar havolalarini ko'rsating (/dashboard/integrations, /dashboard/agents, /dashboard/billing, /dashboard/support).

KOMPANIYA REAL DIAGNOSTIKASI:
- Tarif: ${diagnostics.quota?.plan.toUpperCase()}, Balans: ${diagnostics.quota?.tokenBalance} ta javob
- Xodimlar: ${diagnostics.agent?.activeAgents}/${diagnostics.quota?.maxAgents} ta faol
- Telegram Business: ${diagnostics.channels?.telegramBusiness?.status || 'ulanmagan'} (javob berish huquqi: ${diagnostics.channels?.telegramBusiness?.canReply ? 'bor' : 'yoq'})
- Instagram Direct: ${diagnostics.channels?.instagram?.status || 'ulanmagan'}
- Sayt vidjeti: ${diagnostics.channels?.websiteWidget?.configured ? 'sozlangan' : 'sozlanmagan'}
- Google Taqvim: ${diagnostics.calendar?.connected ? 'ulangan' : 'ulanmagan'} (${diagnostics.calendar?.workingHours || '10:00-18:00'})
- Oxirgi xatolar: ${diagnostics.recentErrors && diagnostics.recentErrors.length > 0 ? diagnostics.recentErrors.map(e => e.description).join('; ') : 'Xatolar yo\'q'}

BILIMLAR BAZASI:
${knowledgeContext}`
      : `Вы — Помощник платформы gapcha AI (Platform Assistant).
Ваша задача — помогать владельцу компании использовать возможности gapcha AI, диагностировать интеграции, объяснять ошибки, настраивать сотрудников и при необходимости создавать обращения в поддержку.

СТРОГИЕ ПРАВИЛА:
1. Вы НЕ продавец компании и НЕ общаетесь с клиентами бизнеса. Вы помогаете владельцу с платформой gapcha AI.
2. За эти ответы баланс компании НЕ расходуется (0 токенов).
3. Не обещайте несуществующих функций. Не выдумывайте статус интеграций — используйте только фактические данные ниже.
4. Если проверка недоступна, отвечайте «Не удалось проверить», а не «Всё работает».
5. Отвечайте кратко, по делу, без пустых фраз («Отличный вопрос!») и без навязчивости.
6. Приводите ссылки на разделы кабинета (/dashboard/integrations, /dashboard/agents, /dashboard/billing, /dashboard/support).

РЕАЛЬНАЯ ДИАГНОСТИКА ТЕКУЩЕЙ КОМПАНИИ:
- Тариф: ${diagnostics.quota?.plan.toUpperCase()}, Баланс ответов: ${diagnostics.quota?.tokenBalance}
- Сотрудники: ${diagnostics.agent?.activeAgents} активных из ${diagnostics.quota?.maxAgents} доступных
- Telegram Business: ${diagnostics.channels?.telegramBusiness?.status || 'не подключен'} (право ответов: ${diagnostics.channels?.telegramBusiness?.canReply ? 'включено' : 'отключено'})
- Instagram Direct: ${diagnostics.channels?.instagram?.status || 'не подключен'}
- Виджет сайта: ${diagnostics.channels?.websiteWidget?.configured ? 'настроен' : 'не настроен'}
- Google Календарь: ${diagnostics.calendar?.connected ? 'подключен' : 'не подключен'} (${diagnostics.calendar?.workingHours || '10:00-18:00'})
- Последние ошибки в очереди: ${diagnostics.recentErrors && diagnostics.recentErrors.length > 0 ? diagnostics.recentErrors.map(e => `${e.channel}: ${e.description}`).join('; ') : 'Ошибок не зафиксировано'}

БАЗА ЗНАНИЙ ПЛАТФОРМЫ:
${knowledgeContext}`;

    // 7. Invoke LLM with fallback
    let replyText = '';
    try {
      const provider = getLLMProvider();
      const trimmedHistory = Array.isArray(history)
        ? history.slice(-6).map((h: any) => ({
            role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: String(h.content || '').slice(0, 1000),
          }))
        : [];

      const llmResponse = await provider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.2,
        maxTokens: 800,
      });

      replyText = llmResponse.content;
    } catch {
      // Deterministic rule-based fallback if LLM provider fails
      if (lowerMsg.includes('telegram')) {
        const tb = diagnostics.channels?.telegramBusiness;
        replyText = currentLang === 'uz'
          ? `Telegram Business holati: ${tb?.status === 'connected' ? 'Ulangan' : 'Ulanmagan'}. ${!tb?.canReply ? 'Botga Telegram ilovasida javob berish huquqi berilmagan.' : 'Integratsiyalar bo\'limida tekshirishingiz mumkin: /dashboard/integrations'}`
          : `Статус Telegram Business: ${tb?.status === 'connected' ? 'Подключен' : 'Не подключен'}. ${!tb?.canReply ? 'В приложении Telegram отключено право бота отвечать на сообщения.' : 'Проверьте статус в разделе /dashboard/integrations'}`;
      } else if (lowerMsg.includes('instagram')) {
        const ig = diagnostics.channels?.instagram;
        replyText = currentLang === 'uz'
          ? `Instagram Direct holati: ${ig?.status === 'connected' ? 'Ulangan' : 'Ulanmagan'}. Sozlamalar: /dashboard/integrations`
          : `Статус Instagram Direct: ${ig?.status === 'connected' ? 'Подключен' : 'Не подключен'}. Настройки в разделе /dashboard/integrations`;
      } else if (lowerMsg.includes('баланс') || lowerMsg.includes('тариф') || lowerMsg.includes('balans')) {
        replyText = currentLang === 'uz'
          ? `Sizning tarifingiz: ${diagnostics.quota?.plan.toUpperCase()}, mavjud javoblar soni: ${diagnostics.quota?.tokenBalance}. Tarifni oshirish yoki to'ldirish: /dashboard/billing`
          : `Ваш текущий тариф: ${diagnostics.quota?.plan.toUpperCase()}, доступный баланс: ${diagnostics.quota?.tokenBalance} ответов. Управление тарифом: /dashboard/billing`;
      } else {
        replyText = currentLang === 'uz'
          ? `Savolingiz qabul qilindi. gapcha AI bo'yicha yo'riqnomalar va sozlamalarni kabinet bo'limlarida ko'rishingiz mumkin. Qo'shimcha yordam kerak bo'lsa, qo'llab-quvvatlash xizmatiga murojaat yaratishingiz mumkin.`
          : `По вашему вопросу: основные настройки интеграций доступны в разделе /dashboard/integrations, управление сотрудниками — в /dashboard/agents. Если у вас возникла ошибка, я могу подготовить обращение в техническую поддержку.`;
      }
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      diagnostics,
      pendingAction: pendingTicketAction,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка помощника платформы',
      },
      { status: 500 }
    );
  }
}
