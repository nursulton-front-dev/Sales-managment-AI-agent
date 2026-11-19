import { LLMProvider, LLMRequestOptions, LLMResponse } from '../provider';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  defaultModel: string;
  baseUrl: string;
  apiKey?: string;

  constructor() {
    this.baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-6-luna';
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && !this.apiKey.includes('placeholder') && this.apiKey.trim().length > 0);
  }

  async checkHealth(): Promise<{ ok: boolean; message: string; models?: string[] }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        message: 'OPENAI_API_KEY не задан в .env.local. Укажите действительный API-ключ OpenAI.',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (res.status === 401) {
        return { ok: false, message: 'Ошибка авторизации OpenAI: неверный API-ключ (401)' };
      }
      if (res.status === 429) {
        return { ok: false, message: 'Превышен лимит частоты запросов OpenAI (429)' };
      }
      if (!res.ok) {
        return { ok: false, message: `Ошибка OpenAI API: HTTP ${res.status}` };
      }

      const data = await res.json();
      const models = data?.data?.map((m: { id: string }) => m.id) || [];
      return {
        ok: true,
        message: `Подключение к OpenAI успешно. Доступно моделей: ${models.length}`,
        models,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Сетевая ошибка при запросе к OpenAI: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`,
      };
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY отсутствует. Настройте переменную окружения OPENAI_API_KEY.');
    }

    const startTime = Date.now();
    const formattedMessages = options.messages.map((m) => {
      const item: Record<string, unknown> = {
        role: m.role,
        content: m.content ?? '',
      };
      if (m.name) item.name = m.name;
      if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
      if (m.tool_calls && m.tool_calls.length > 0) {
        item.tool_calls = m.tool_calls;
        if (!m.content) item.content = null;
      }
      return item;
    });

    const payload: Record<string, unknown> = {
      model: this.defaultModel,
      messages: formattedMessages,
      reasoning_effort: 'none',
      max_completion_tokens: options.maxTokens ?? 1024,
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (err) {
      throw new Error(`Сетевой сбой при обращении к OpenAI (${this.baseUrl}): ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401 Unauthorized: API-ключ OpenAI недействителен.');
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`429 Rate Limit: превышен лимит частоты запросов OpenAI.${retryAfter ? ` Повторите через ${retryAfter}с.` : ''}`);
      }
      if (response.status >= 500) {
        throw new Error(`5xx Server Error: сбой на стороне OpenAI (${response.status}).`);
      }
      const errorText = await response.text();
      throw new Error(`OpenAI API ошибка (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const message = choice?.message;

    return {
      content: message?.content || '',
      toolCalls: message?.tool_calls || undefined,
      provider: 'openai',
      model: data?.model || this.defaultModel,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
            cachedPromptTokens: data.usage.prompt_tokens_details?.cached_tokens || 0,
          }
        : undefined,
      durationMs,
      rawResponse: data,
    };
  }
}
