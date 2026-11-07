import {
  getAllAgents,
  getWorkspaceById,
  recordTokenTransaction,
} from '@/src/db';
import { isWorkspaceEntitled } from '@/lib/server/security/entitlements';
import { buildNichePrompt } from './prompts/niche-scenarios';

export interface ChatCompletionOptions {
  message: string;
  agentId?: string;
  workspaceId?: string;
  clientName?: string;
  clientPhone?: string;
  channel?: 'Telegram' | 'Instagram' | 'WebWidget' | string;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  isSandbox?: boolean;
}

export class AgentReplyUnavailableError extends Error {
  code: string;
  constructor(message: string, code = 'model_unavailable') {
    super(message);
    this.name = 'AgentReplyUnavailableError';
    this.code = code;
  }
}

export interface ChatCompletionResult {
  reply: string;
  tokensCost: number;
  isBooking: boolean;
  appointmentTime?: string;
  leadId?: string;
  provider: 'openai' | 'gemini' | 'deepseek' | 'rules_engine';
  model: string;
}

export const CALENDAR_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'check_calendar_slots',
      description:
        'Проверить свободные слоты для записи клиентов на консультацию или урок на указанную дату (YYYY-MM-DD). Учитывает рабочие часы компании и уже занятые интервалы.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Дата в формате YYYY-MM-DD, например 2026-11-09' },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description:
        'Создать запись клиента на конкретное время в календаре. Вызывать ТОЛЬКО когда клиент прямо согласился на конкретную дату и время.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Имя клиента' },
          clientPhone: { type: 'string', description: 'Телефон клиента (+998...)' },
          startTime: {
            type: 'string',
            description: 'Дата и время начала в ISO 8601, например 2026-11-09T11:00:00+05:00',
          },
          serviceName: { type: 'string', description: 'Название услуги или тема встречи' },
        },
        required: ['clientName', 'clientPhone', 'startTime'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_lead_qualification',
      description: 'Зафиксировать данные квалификации клиента: потребности, бюджет, контактный телефон.',
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Имя клиента' },
          clientPhone: { type: 'string', description: 'Телефон клиента' },
          notes: { type: 'string', description: 'Краткие заметки по запросу клиента' },
        },
        required: ['clientPhone'],
      },
    },
  },
];

async function executeToolCall({
  name,
  args,
  workspace,
  agent,
  channel,
  clientName,
  clientPhone,
}: {
  name: string;
  args: any;
  workspace: any;
  agent: any;
  channel?: string;
  clientName?: string;
  clientPhone?: string;
}): Promise<{
  toolResult: any;
  isBooking: boolean;
  appointmentTime?: string;
  leadId?: string;
}> {
  const timeZone = (workspace?.settings as any)?.timezone || 'Asia/Tashkent';
  const workingHours = workspace?.googleCalendarWorkingHours || '10:00-18:00';
  const slotDuration = workspace?.googleCalendarSlotDuration || 30;

  if (name === 'check_calendar_slots') {
    const dateStr = args.date; // YYYY-MM-DD
    let busySlots: Array<{ start: string; end: string }> = [];

    if (workspace?.googleCalendarConnected && workspace?.googleRefreshToken) {
      try {
        const timeMin = `${dateStr}T00:00:00Z`;
        const timeMax = `${dateStr}T23:59:59Z`;
        const { getGoogleCalendarFreeBusy } = await import('@/lib/calendar/google');
        busySlots = await getGoogleCalendarFreeBusy(workspace.googleRefreshToken, timeMin, timeMax);
      } catch (err) {
        console.warn('Google Calendar free/busy check failed:', err);
      }
    }

    const { getAvailableDaySlots } = await import('@/lib/calendar/working-hours');
    const availableSlots = getAvailableDaySlots(dateStr, workingHours, slotDuration, busySlots, timeZone);

    return {
      toolResult: {
        date: dateStr,
        availableSlots,
        workingHours,
        slotDurationMinutes: slotDuration,
        googleCalendarSynced: Boolean(workspace?.googleCalendarConnected),
      },
      isBooking: false,
    };
  }

  if (name === 'book_appointment') {
    const startTimeStr = args.startTime;
    const client = args.clientName || clientName || 'Клиент';
    const phone = args.clientPhone || clientPhone || '';
    const service = args.serviceName || agent?.name || 'Консультация';

    const { isSlotWithinWorkingHours } = await import('@/lib/calendar/working-hours');
    const slotCheck = isSlotWithinWorkingHours(startTimeStr, slotDuration, workingHours, timeZone);

    if (!slotCheck.valid) {
      return {
        toolResult: {
          success: false,
          error: slotCheck.reason || 'Выбранное время выходит за рамки рабочих часов компании',
        },
        isBooking: false,
      };
    }

    const { upsertLead } = await import('@/src/db');

    // If Google Calendar is connected, create real event with duplicate safeguard
    if (workspace?.googleCalendarConnected && workspace?.googleRefreshToken) {
      try {
        const { createGoogleCalendarEvent, findExistingGoogleCalendarEvent } = await import('@/lib/calendar/google');
        const existingEvent = await findExistingGoogleCalendarEvent(
          workspace.googleRefreshToken,
          slotCheck.startIso!,
          slotCheck.endIso!,
          phone
        );

        let gEvent = existingEvent;
        if (!gEvent) {
          gEvent = await createGoogleCalendarEvent(workspace.googleRefreshToken, {
            summary: `${service}: ${client} (${phone})`,
            description: `Запись через gapcha AI (${channel || 'Чат'}). Сотрудник: ${agent?.name}`,
            startTime: slotCheck.startIso!,
            endTime: slotCheck.endIso!,
            attendeeName: client,
            attendeePhone: phone,
            channel: channel || 'Chat',
            timeZone,
          });
        }

        const lead = await upsertLead({
          workspaceId: workspace.id,
          agentId: agent.id,
          clientName: client,
          clientPhone: phone,
          channel: channel || 'WebWidget',
          status: 'booked',
          appointmentTime: new Date(slotCheck.startIso!),
          googleEventId: gEvent?.id || null,
          googleEventLink: gEvent?.htmlLink || null,
        });

        return {
          toolResult: {
            success: true,
            booked: true,
            eventId: gEvent?.id,
            eventLink: gEvent?.htmlLink,
            appointmentTime: slotCheck.startIso,
          },
          isBooking: true,
          appointmentTime: slotCheck.startIso,
          leadId: lead.id,
        };
      } catch (calErr) {
        console.warn('Google Calendar event creation failed:', calErr);
      }
    }

    // Google Calendar unavailable or not connected: save lead as awaiting confirmation
    const lead = await upsertLead({
      workspaceId: workspace.id,
      agentId: agent.id,
      clientName: client,
      clientPhone: phone,
      channel: channel || 'WebWidget',
      status: 'awaiting_confirmation',
      appointmentTime: new Date(slotCheck.startIso!),
    });

    return {
      toolResult: {
        success: true,
        booked: false,
        pending: true,
        appointmentTime: slotCheck.startIso,
        message:
          'Календарь компании не синхронизирован. Заявка зафиксирована со статусом «Ожидает подтверждения». Менеджер свяжется для подтверждения времени.',
      },
      isBooking: true,
      appointmentTime: slotCheck.startIso,
      leadId: lead.id,
    };
  }

  if (name === 'save_lead_qualification') {
    const client = args.clientName || clientName || 'Клиент';
    const phone = args.clientPhone || clientPhone || '';
    const { upsertLead } = await import('@/src/db');
    const lead = await upsertLead({
      workspaceId: workspace.id,
      agentId: agent.id,
      clientName: client,
      clientPhone: phone,
      channel: channel || 'WebWidget',
      status: 'qualified',
    });

    return {
      toolResult: { success: true, leadId: lead.id, status: 'qualified' },
      isBooking: false,
      leadId: lead.id,
    };
  }

  return { toolResult: { error: 'Unknown tool' }, isBooking: false };
}

/**
 * Call OpenAI API if configured
 */
async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) return null;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: userMessage },
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      console.warn('OpenAI API returned status:', res.status);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    console.warn('OpenAI request failed');
    return null;
  }
}

/**
 * Call Gemini API as backup fallback if configured
 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: ChatCompletionOptions['history'] = []
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\nИстория диалога:\n${history
                  .slice(-6)
                  .map((item) => `${item.role}: ${item.content}`)
                  .join('\n')}\n\nПользователь: ${userMessage}`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    console.warn('Gemini request failed');
    return null;
  }
}

export async function processAgentMessage({
  message,
  agentId,
  workspaceId,
  clientName,
  clientPhone,
  channel,
  history = [],
  isSandbox = false,
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const query = message.trim();

  // Find agent
  const agents = await getAllAgents(workspaceId);
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];
  if (!agent) throw new Error('Сотрудник не найден');

  const targetWsId = workspaceId || agent?.workspaceId;
  const ws = targetWsId ? await getWorkspaceById(targetWsId) : null;

  const tokensCost = 1;

  // Check balance and subscription entitlement before proceeding
  if (ws) {
    const entitlement = isWorkspaceEntitled(ws);
    if (!entitlement.entitled) {
      if (entitlement.reason === 'subscription_expired') {
        throw new AgentReplyUnavailableError(
          'Срок действия тарифа или пробного периода компании истёк. Продлите тариф в разделе «Тарифы и баланс».',
          'subscription_expired'
        );
      }
      if (entitlement.reason === 'insufficient_balance' || ws.tokenBalance < tokensCost) {
        throw new AgentReplyUnavailableError(
          `Недостаточно токенов на балансе компании (баланс: ${ws.tokenBalance}, требуется: ${tokensCost}). Пополните баланс в разделе "Тарифы и Баланс".`,
          'insufficient_balance'
        );
      }
      throw new AgentReplyUnavailableError('Компания деактивирована.', 'inactive');
    }
  }

  // Construct precise server time & date context
  const now = new Date();
  const timeZone = (ws?.settings as any)?.timezone || 'Asia/Tashkent';
  const dateFormatted = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const currentDay = now.getDay();
  const daysUntilMonday = currentDay === 1 ? 7 : (8 - currentDay) % 7 || 7;
  const nextMonday = new Date(now.getTime() + daysUntilMonday * 86400000);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];
  const todayIso = now.toISOString().split('T')[0];

  const serverTimeContext = `\nКОНТЕКСТ ДАТЫ И ВРЕМЕНИ:\n- Текущая дата и время сервера: ${dateFormatted} (${timeZone}).\n- Сегодняшняя дата: ${todayIso}.\n- Ближайший понедельник: ${nextMondayStr}.\n- Рабочие часы компании: ${ws?.googleCalendarWorkingHours || '10:00-18:00'}.\n- Все даты и слоты предлагай строго относительно сегодняшней даты. Никогда не предлагай прошедшие даты.\n`;

  // Construct full system prompt with niche scenario
  const basePrompt =
    agent?.systemPrompt ||
    `Вы — профессиональный ИИ-сотрудник компании. Ваша задача — квалифицировать клиента и помочь с выбором услуги.`;
  const nichePrompt = buildNichePrompt(agent.nicheTemplate);

  const fullSystemPrompt = `${basePrompt}\n\nБаза знаний и прайс:\n${
    agent?.knowledgeBase || 'Стандартные условия'
  }\n\nВопросы квалификации:\n${((agent?.qualificationQuestions as string[]) || []).join('\n')}\n${serverTimeContext}\n${nichePrompt}`;

  let reply = '';
  let provider: 'openai' | 'gemini' | 'deepseek' | 'rules_engine' = 'rules_engine';
  let modelName = 'local-rules-v1';
  let isBooking = false;
  let appointmentTime: string | undefined;
  let leadId: string | undefined;

  // Attempt DeepSeek if key is present
  const useDeepSeek =
    (isSandbox && (process.env.AI_SANDBOX_PROVIDER === 'deepseek' || process.env.DEEPSEEK_API_KEY)) ||
    process.env.AI_DEFAULT_PROVIDER === 'deepseek' ||
    Boolean(process.env.DEEPSEEK_API_KEY);

  if (useDeepSeek && process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes('placeholder')) {
    try {
      const { DeepSeekProvider } = await import('@/lib/server/ai/providers/deepseek');
      const ds = new DeepSeekProvider();
      const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string }> = [
        { role: 'system', content: fullSystemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: query },
      ];

      const dsRes = await ds.complete({
        messages: messages as any,
        tools: CALENDAR_TOOLS,
      });

      if (dsRes.toolCalls && dsRes.toolCalls.length > 0) {
        // Execute tool calls
        for (const tc of dsRes.toolCalls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments);
          } catch {}

          const executed = await executeToolCall({
            name: fnName,
            args: fnArgs,
            workspace: ws,
            agent,
            channel,
            clientName,
            clientPhone,
          });

          if (executed.isBooking) {
            isBooking = true;
            appointmentTime = executed.appointmentTime;
            leadId = executed.leadId;
          }

          // Format natural reply based on tool outcome
          if (fnName === 'check_calendar_slots') {
            const slots = executed.toolResult.availableSlots || [];
            if (slots.length > 0) {
              reply = `На ${executed.toolResult.date} доступны свободные слоты: ${slots.slice(0, 5).join(', ')}. Какое время вам больше подходит?`;
            } else {
              reply = `На ${executed.toolResult.date} все слоты заняты либо день нерабочий. Подскажите, пожалуйста, другой удобный день?`;
            }
          } else if (fnName === 'book_appointment') {
            if (executed.toolResult.booked) {
              const dt = new Date(executed.toolResult.appointmentTime);
              const formattedTime = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              reply = `Отлично! Вы успешно записаны на ${executed.toolResult.appointmentTime.split('T')[0]} в ${formattedTime}. Будем рады видеть вас!`;
            } else if (executed.toolResult.pending) {
              reply = `Благодарю! Ваша заявка на запись принята со статусом «Ожидает подтверждения». Наш менеджер свяжется с вами для окончательного согласования времени.`;
            } else {
              reply = executed.toolResult.error || 'К сожалению, выбранное время не подходит под рабочие часы. Давайте выберем другое время?';
            }
          } else if (fnName === 'save_lead_qualification') {
            reply = 'Спасибо за ответы! Я зафиксировал ваши пожелания и передал специалисту.';
          }
        }
        provider = 'deepseek';
        modelName = ds.defaultModel;
      } else if (dsRes.content) {
        reply = dsRes.content;
        provider = 'deepseek';
        modelName = ds.defaultModel;
      }
    } catch (err: unknown) {
      console.warn('DeepSeek request failed; trying configured fallback', err instanceof Error ? err.message : '');
    }
  }

  // 1. Attempt OpenAI if not already answered
  if (!reply) {
    const openAiReply = await callOpenAI(fullSystemPrompt, query, history);
    if (openAiReply) {
      reply = openAiReply;
      provider = 'openai';
      modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }
  }

  // 2. Attempt Gemini backup if not already answered
  if (!reply) {
    const geminiReply = await callGemini(fullSystemPrompt, query, history);
    if (geminiReply) {
      reply = geminiReply;
      provider = 'gemini';
      modelName = 'gemini-2.5-flash';
    }
  }

  // 3. Fallback to intelligent deterministic response ONLY in sandbox mode when no external keys exist
  if (!reply) {
    if (isSandbox && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      const lower = query.toLowerCase();
      const isUzbek = /[ўқғҳ]/.test(lower) || lower.includes('salom') || lower.includes('narx') || lower.includes('yordam');

      if (lower.includes('робот') || lower.includes('ии') || lower.includes('человек') || lower.includes('bot')) {
        reply = isUzbek
          ? "Ha, men kompaniyaning rasmiy sun'iy intellekt assistentiman. Xizmatlar, narxlar va ro'yxatdan o'tish bo'yicha yordam bera olaman."
          : 'Да, я официальный ИИ-ассистент компании. Помогаю сориентировать по услугам, ценам и записи на удобное время.';
      } else if (lower.includes('запис') || lower.includes('бронь') || lower.includes('yozil') || lower.includes('qabul')) {
        reply = isUzbek
          ? "Yozilish uchun qaysi kun va vaqt sizga ma'qul? Men bo'sh vaqtlarni tekshirib beraman."
          : 'С удовольствием помогу записаться. На какой день и в какое время вам удобнее подойти?';
      } else if (lower.includes('цена') || lower.includes('стоим') || lower.includes('narx') || lower.includes('qancha')) {
        reply = isUzbek
          ? `Xizmatlarimiz shartlari va narxlari bo'yicha ma'lumot berishga tayyorman. Qaysi xizmat sizni qiziqtiryapti?`
          : `Условия и цены зависят от выбранного формата. Подскажите, какая именно услуга вас интересует?`;
      } else {
        reply = isUzbek
          ? "Assalomu alaykum! Savolingiz bo'yicha yordam berishga tayyorman. Sizni qaysi xizmatimiz qiziqtiryapti?"
          : 'Здравствуйте! Буду рад помочь с вашим вопросом. Подскажите, какая услуга или задача вас интересует?';
      }
      provider = 'rules_engine';
      modelName = 'local-rules-v1';
    } else {
      throw new AgentReplyUnavailableError('Сервис ответов временно недоступен. Попробуйте позже. Токены не списаны.');
    }
  }

  // Deduct tokens atomically
  if (ws) {
    const desc = isSandbox
      ? 'Тестовый ответ в песочнице (-1 токен)'
      : 'Ответ ИИ-сотрудника в диалоге (-1 токен)';

    const transaction = await recordTokenTransaction({
      workspaceId: ws.id,
      actionType: 'chat_reply',
      tokensDelta: -tokensCost,
      description: desc,
    });
    if (!transaction.success) throw new Error(transaction.error || 'Не удалось списать токены');
  }

  return {
    reply,
    tokensCost,
    isBooking,
    appointmentTime,
    leadId,
    provider,
    model: modelName,
  };
}
