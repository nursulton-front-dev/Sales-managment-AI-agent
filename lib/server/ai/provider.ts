/**
 * AI Provider Abstraction Interface
 * AI Business OS · Enterprise Architecture
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMRequestOptions {
  messages: LLMMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  thinkingMode?: 'disabled' | 'enabled';
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  provider: string;
  model: string;
  usage?: LLMUsage;
  durationMs: number;
}

export interface LLMProvider {
  name: string;
  defaultModel: string;
  checkHealth(): Promise<{ ok: boolean; message: string; models?: string[] }>;
  complete(options: LLMRequestOptions): Promise<LLMResponse>;
}
