import { LLMProvider, LLMRequestOptions, LLMResponse } from '../provider';

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek';
  defaultModel: string;
  baseUrl: string;
  apiKey?: string;
  thinkingMode: 'disabled' | 'enabled';

  constructor() {
    this.baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.defaultModel = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.thinkingMode = (process.env.DEEPSEEK_THINKING === 'enabled' ? 'enabled' : 'disabled') as any;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && !this.apiKey.includes('placeholder') && this.apiKey.trim().length > 0);
  }

  async checkHealth(): Promise<{ ok: boolean; message: string; models?: string[] }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        message: 'DEEPSEEK_API_KEY не задан в .env.local. Укажите действительный API-ключ DeepSeek.',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (res.status === 401) {
        return { ok: false, message: 'Ошибка авторизации DeepSeek: неверный API-ключ (401)' };
      }
      if (res.status === 402) {
        return { ok: false, message: 'Ошибка DeepSeek: недостаточно средств на балансе провайдера (402)' };
      }
      if (!res.ok) {
        return { ok: false, message: `Ошибка DeepSeek API: HTTP ${res.status}` };
      }

      const data = await res.json();
      const models = data?.data?.map((m: any) => m.id) || [];
      return {
        ok: true,
        message: `Подключение успешно. Доступно моделей: ${models.length}`,
        models,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: `Сетевая ошибка при запросе к DeepSeek: ${err.message}`,
      };
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('DEEPSEEK_API_KEY отсутствует. Настройте переменную окружения DEEPSEEK_API_KEY.');
    }

    const startTime = Date.now();
    const payload: Record<string, any> = {
      model: this.defaultModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
    };

    // DeepSeek official thinking mode parameter
    if ((options.thinkingMode || this.thinkingMode) === 'disabled') {
      payload.thinking = { type: 'disabled' };
    }

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
      });
    } catch (err: any) {
      throw new Error(`Сетевой сбой при обращении к DeepSeek (${this.baseUrl}): ${err.message}`);
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401 Unauthorized: API-ключ DeepSeek недействителен.');
      }
      if (response.status === 402) {
        throw new Error('402 Payment Required: На балансе аккаунта DeepSeek недостаточно средств.');
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`429 Rate Limit: превышен лимит частоты запросов DeepSeek.${retryAfter ? ` Повторите через ${retryAfter}с.` : ''}`);
      }
      const errorText = await response.text();
      throw new Error(`DeepSeek API ошибка (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const message = choice?.message;

    return {
      content: message?.content || '',
      toolCalls: message?.tool_calls || undefined,
      provider: 'deepseek',
      model: this.defaultModel,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
      durationMs,
    };
  }
}
