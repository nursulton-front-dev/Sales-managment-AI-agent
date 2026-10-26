import {
  getAllAgents,
  getWorkspaceById,
  updateWorkspace,
  recordTokenTransaction,
  createLead,
  createAppointment,
  createMessage,
  createConversation,
  getAllConversations,
} from '@/src/db';
import { createGoogleCalendarEvent, generateDirectGoogleCalendarLink } from '@/lib/calendar/google';

export interface ChatCompletionOptions {
  message: string;
  agentId?: string;
  workspaceId?: string;
  clientName?: string;
  clientPhone?: string;
  channel?: 'Telegram' | 'Instagram' | 'WebWidget';
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  isSandbox?: boolean;
}

export interface ChatCompletionResult {
  reply: string;
  tokensCost: number;
  isBooking: boolean;
  appointmentTime?: string;
  leadCreated?: Awaited<ReturnType<typeof createLead>> | null;
  provider: 'openai' | 'gemini' | 'deepseek' | 'rules_engine';
  model: string;
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
    });

    if (!res.ok) {
      console.warn('OpenAI API returned status:', res.status);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('OpenAI fetch error:', err);
    return null;
  }
}

/**
 * Call Gemini API as backup fallback if configured
 */
async function callGemini(systemPrompt: string, userMessage: string, history: ChatCompletionOptions['history'] = []): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nИстория диалога:\n${history.slice(-6).map((item) => `${item.role}: ${item.content}`).join('\n')}\n\nПользователь: ${userMessage}` }] },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.warn('Gemini fetch error:', err);
    return null;
  }
}

export async function processAgentMessage({
  message,
  agentId,
  workspaceId,
  clientName,
  clientPhone,
  channel = 'Telegram',
  history = [],
  isSandbox = false,
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const query = message.trim();
  const lower = query.toLowerCase();

  // Find agent
  const agents = await getAllAgents(workspaceId);
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];
  if (!agent) throw new Error('Сотрудник не найден');

  const targetWsId = workspaceId || agent?.workspaceId;
  const ws = targetWsId ? await getWorkspaceById(targetWsId) : null;

  // Check booking intent
  const isBooking =
    lower.includes('запис') ||
    lower.includes('забронир') ||
    lower.includes('завтра') ||
    lower.includes('время') ||
    lower.includes('слот') ||
    lower.includes('давайте в') ||
    lower.includes('урок') ||
    lower.includes('14:00') ||
    lower.includes('15:00') ||
    lower.includes('16:00') ||
    lower.includes('10:00') ||
    lower.includes('11:00') ||
    lower.includes('понедельник');

  // Token cost calculation:
  // In sandbox, real model response costs 1 token. Booking is a simulation (0 extra tokens charged).
  // In production, normal message costs 1 token, actual calendar booking costs 5 tokens.
  const tokensCost = isSandbox ? 1 : isBooking ? 5 : 1;

  // Check balance before proceeding
  if (ws && ws.tokenBalance < tokensCost) {
    throw new Error(
      `Недостаточно токенов на балансе компании (баланс: ${ws.tokenBalance}, требуется: ${tokensCost}). Пополните баланс в разделе "Тарифы и Баланс".`
    );
  }

  let reply = '';
  let provider: 'openai' | 'gemini' | 'deepseek' | 'rules_engine' = 'rules_engine';
  let modelName = 'local-rules-v1';

  // Construct system prompt
  const basePrompt = agent?.systemPrompt || `Вы — профессиональный ИИ-сотрудник компании. Ваша задача — квалифицировать клиента и записать на пробный урок/прием.`;
  const fullSystemPrompt = `${basePrompt}\n\nБаза знаний и прайс:\n${agent?.knowledgeBase || 'Стандартные условия'}\n\nВопросы квалификации:\n${((agent?.qualificationQuestions as string[]) || []).join('\n')}`;

  // Sandbox provider override: if AI_SANDBOX_PROVIDER=deepseek (or in sandbox mode with deepseek key)
  const useDeepSeek = (isSandbox && (process.env.AI_SANDBOX_PROVIDER === 'deepseek' || process.env.DEEPSEEK_API_KEY)) || process.env.AI_DEFAULT_PROVIDER === 'deepseek';

  if (useDeepSeek && process.env.DEEPSEEK_API_KEY) {
    try {
      const { DeepSeekProvider } = await import('@/lib/server/ai/providers/deepseek');
      const { BUSINESS_AGENT_TOOLS } = await import('@/lib/server/ai/tools');
      const ds = new DeepSeekProvider();
      const dsRes = await ds.complete({
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: query },
        ],
        tools: BUSINESS_AGENT_TOOLS,
      });
      if (dsRes.content) {
        reply = dsRes.content;
        provider = 'deepseek';
        modelName = ds.defaultModel;
      }
    } catch (dsErr) {
      console.warn('DeepSeek provider error, falling back:', dsErr);
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

  if (!reply) throw new Error('Сервис ответов временно недоступен. Попробуйте позже. Токены не списаны.');

  let appointmentTime: string | undefined = undefined;
  let leadCreated = null;

  // Handle actual booking side effects (ONLY in production mode, NEVER in sandbox)
  if (isBooking && !isSandbox && ws) {
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(14, 30, 0, 0);
    const tomorrowEnd = new Date(tomorrow.getTime() + (ws.googleCalendarSlotDuration || 45) * 60000);
    appointmentTime = tomorrow.toISOString();

    let googleEventId: string | undefined = undefined;
    let googleEventLink: string | undefined = undefined;

    if (ws.googleRefreshToken) {
      try {
        const gEvent = await createGoogleCalendarEvent(ws.googleRefreshToken, {
          summary: `Запись: ${clientName || 'Клиент'} (${ws.companyName})`,
          description: `Клиент: ${clientName || 'Клиент'}\nТелефон: ${clientPhone || '+998 90 000 00 00'}\nКанал: ${channel}\nЗаписано ИИ-сотрудником "${agent?.name || 'ИИ-сотрудник'}"`,
          startTime: tomorrow.toISOString(),
          endTime: tomorrowEnd.toISOString(),
          attendeeName: clientName,
          attendeePhone: clientPhone,
        });
        googleEventId = gEvent.id;
        googleEventLink = gEvent.htmlLink;
      } catch (err) {
        console.warn('Google Calendar live API insert error:', err);
      }
    }

    if (!googleEventLink) {
      googleEventLink = generateDirectGoogleCalendarLink({
        title: `Запись — ${clientName || 'Клиент'}`,
        details: `Запись через ИИ-сотрудника AI Business OS`,
        startTime: tomorrow,
        endTime: tomorrowEnd,
      });
    }

    // Save lead in Neon Postgres
    leadCreated = await createLead({
      workspaceId: ws.id,
      agentId: agent?.id || null,
      clientName: clientName || 'Клиент из чата',
      clientPhone: clientPhone || '+998 90 000 00 00',
      channel,
      status: 'booked',
      appointmentTime: tomorrow,
      googleEventId,
      googleEventLink,
      tokensSpent: tokensCost,
    });

    // Save appointment
    await createAppointment({
      workspaceId: ws.id,
      leadId: leadCreated.id,
      agentId: agent?.id || null,
      clientName: clientName || 'Клиент из чата',
      clientPhone: clientPhone || '+998 90 000 00 00',
      serviceName: 'Пробный урок / Первичная консультация',
      specialistName: 'Дежурный специалист',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      status: 'confirmed',
      googleEventId,
      googleEventLink,
    });
  }

  // Deduct tokens atomically
  if (ws) {
    const desc = isSandbox
      ? 'Тестовый ответ в песочнице (-1 токен)'
      : isBooking
      ? 'Запись в календарь через ИИ (-5 токенов)'
      : 'Ответ ИИ-сотрудника в диалоге (-1 токен)';

    const transaction = await recordTokenTransaction({
      workspaceId: ws.id,
      actionType: isBooking && !isSandbox ? 'calendar_booking' : 'chat_reply',
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
    leadCreated,
    provider,
    model: modelName,
  };
}
