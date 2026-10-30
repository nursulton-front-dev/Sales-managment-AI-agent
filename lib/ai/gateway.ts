import {
  getAllAgents,
  getWorkspaceById,
  recordTokenTransaction,
} from '@/src/db';

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

export class AgentReplyUnavailableError extends Error {}

export interface ChatCompletionResult {
  reply: string;
  tokensCost: number;
  isBooking: boolean;
  appointmentTime?: string;
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

  // Messaging produces an answer only; bookings require a separate confirmed workflow.
  const tokensCost = 1;

  // Check balance before proceeding
  if (ws && ws.tokenBalance < tokensCost) {
    throw new AgentReplyUnavailableError(
      `Недостаточно токенов на балансе компании (баланс: ${ws.tokenBalance}, требуется: ${tokensCost}). Пополните баланс в разделе "Тарифы и Баланс".`
    );
  }

  let reply = '';
  let provider: 'openai' | 'gemini' | 'deepseek' | 'rules_engine' = 'rules_engine';
  let modelName = 'local-rules-v1';

  // Construct system prompt
  const basePrompt = agent?.systemPrompt || `Вы — профессиональный ИИ-сотрудник компании. Ваша задача — квалифицировать клиента и записать на пробный урок/прием.`;
  const fullSystemPrompt = `${basePrompt}\n\nБаза знаний и прайс:\n${agent?.knowledgeBase || 'Стандартные условия'}\n\nВопросы квалификации:\n${((agent?.qualificationQuestions as string[]) || []).join('\n')}\n\nЗапись на конкретное время требует подтверждения сотрудником. Не утверждай, что запись, оплата или заказ уже оформлены. При запросе записи собери пожелания и предложи обратиться к сотруднику.`;

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
    } catch {
      console.warn('DeepSeek request failed; trying configured fallback');
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

  if (!reply) throw new AgentReplyUnavailableError('Сервис ответов временно недоступен. Попробуйте позже. Токены не списаны.');

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
    isBooking: false,
    provider,
    model: modelName,
  };
}
