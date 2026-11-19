import { LLMProvider, LLMRequestOptions, LLMResponse, ToolDefinition } from '../provider';

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  defaultModel: string;
  baseUrl: string;
  apiKey?: string;

  constructor() {
    this.baseUrl = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    this.defaultModel = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
    this.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && !this.apiKey.includes('placeholder') && this.apiKey.trim().length > 0);
  }

  async checkHealth(): Promise<{ ok: boolean; message: string; models?: string[] }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        message: 'ANTHROPIC_API_KEY не задан в .env.local. Укажите действительный API-ключ Anthropic.',
      };
    }

    try {
      // Lightweight models probe or test completion
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          'x-api-key': this.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
      });

      if (res.status === 401) {
        return { ok: false, message: 'Ошибка авторизации Anthropic: неверный API-ключ (401)' };
      }
      if (res.status === 429) {
        return { ok: false, message: 'Превышен лимит частоты запросов Anthropic (429)' };
      }

      if (!res.ok && res.status !== 404) {
        return { ok: false, message: `Ошибка Anthropic API: HTTP ${res.status}` };
      }

      let models: string[] = [this.defaultModel];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          models = data.data.map((m: { id: string }) => m.id);
        }
      }

      return {
        ok: true,
        message: `Подключение к Anthropic успешно. Доступна модель: ${this.defaultModel}`,
        models,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Сетевая ошибка при запросе к Anthropic: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`,
      };
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('ANTHROPIC_API_KEY отсутствует. Настройте переменную окружения ANTHROPIC_API_KEY.');
    }

    const startTime = Date.now();

    // 1. Extract system prompt
    const systemParts: string[] = [];
    for (const msg of options.messages) {
      if (msg.role === 'system' && msg.content) {
        systemParts.push(msg.content);
      }
    }
    const systemPrompt = systemParts.join('\n\n');

    // 2. Format Anthropic messages (alternating user / assistant with tool_use and tool_result blocks)
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      | { type: 'tool_result'; tool_use_id: string; content: string };

    interface AnthropicMessage {
      role: 'user' | 'assistant';
      content: string | ContentBlock[];
    }

    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        continue;
      }

      if (msg.role === 'assistant') {
        if (Array.isArray(msg.rawAssistantContent) && msg.rawAssistantContent.length > 0) {
          // Preserve original Anthropic content blocks verbatim (thinking, signature, redacted_thinking, tool_use, text)
          anthropicMessages.push({
            role: 'assistant',
            content: msg.rawAssistantContent as ContentBlock[],
          });
        } else {
          const blocks: ContentBlock[] = [];
          if (msg.content) {
            blocks.push({ type: 'text', text: msg.content });
          }
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const tc of msg.tool_calls) {
              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(tc.function.arguments || '{}');
              } catch {
                parsedArgs = { raw: tc.function.arguments };
              }
              blocks.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.function.name,
                input: parsedArgs,
              });
            }
          }
          anthropicMessages.push({
            role: 'assistant',
            content: blocks.length === 1 && blocks[0].type === 'text' ? blocks[0].text : (blocks.length > 0 ? blocks : ''),
          });
        }
      } else if (msg.role === 'tool') {
        // Tool results are sent as a user message with tool_result block in Anthropic
        const toolResultBlock: ContentBlock = {
          type: 'tool_result',
          tool_use_id: msg.tool_call_id || 'unknown_call',
          content: msg.content,
        };

        // If previous message was user with tool_result blocks, append to it to maintain alternation
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
          (lastMsg.content as ContentBlock[]).push(toolResultBlock);
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [toolResultBlock],
          });
        }
      } else {
        // Normal user message
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        });
      }
    }

    // 3. Convert tools to Anthropic schema
    let anthropicTools: AnthropicTool[] | undefined;
    if (options.tools && options.tools.length > 0) {
      anthropicTools = options.tools.map((t: ToolDefinition) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    // 4. Build payload with medium effort thinking and max_tokens: 2048
    const payload: Record<string, unknown> = {
      model: this.defaultModel,
      max_tokens: options.maxTokens ?? 2048,
      messages: anthropicMessages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    // Adaptive thinking with medium output effort for Haiku 5.5
    if (options.thinkingMode !== 'disabled') {
      payload.thinking = {
        type: 'adaptive',
      };
      payload.output_config = {
        effort: 'medium',
      };
    }

    if (anthropicTools && anthropicTools.length > 0) {
      payload.tools = anthropicTools;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (err) {
      throw new Error(`Сетевой сбой при обращении к Anthropic (${this.baseUrl}): ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('401 Unauthorized: API-ключ Anthropic недействителен.');
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`429 Rate Limit: превышен лимит частоты запросов Anthropic.${retryAfter ? ` Повторите через ${retryAfter}с.` : ''}`);
      }
      if (response.status >= 500) {
        throw new Error(`5xx Server Error: сбой на стороне Anthropic (${response.status}).`);
      }
      const errorText = await response.text();
      throw new Error(`Anthropic API ошибка (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // 5. Parse response blocks: text, thinking, tool_use
    let textContent = '';
    const toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }> = [];

    if (Array.isArray(data?.content)) {
      for (const block of data.content) {
        if (block.type === 'text' && typeof block.text === 'string') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input || {}),
            },
          });
        }
        // block.type === 'thinking' is deliberately ignored and never exposed to client
      }
    }

    const promptTokens = data?.usage?.input_tokens || 0;
    const completionTokens = data?.usage?.output_tokens || 0;
    const cachedPromptTokens = data?.usage?.cache_read_input_tokens || 0;

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'anthropic',
      model: data?.model || this.defaultModel,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cachedPromptTokens,
      },
      durationMs,
      rawResponse: data,
    };
  }
}
