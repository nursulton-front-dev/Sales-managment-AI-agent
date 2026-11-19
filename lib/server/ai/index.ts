import { DeepSeekProvider } from './providers/deepseek';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { LLMProvider } from './provider';

export type SupportedAIProvider = 'deepseek' | 'openai' | 'anthropic';

export function resolveAIProviderName(requested?: string): SupportedAIProvider {
  const raw = (
    requested ||
    process.env.AI_PROVIDER ||
    process.env.AI_DEFAULT_PROVIDER ||
    process.env.AI_SANDBOX_PROVIDER ||
    'deepseek'
  )
    .toLowerCase()
    .trim();

  if (raw === 'openai') return 'openai';
  if (raw === 'anthropic' || raw === 'claude') return 'anthropic';
  if (raw === 'deepseek') return 'deepseek';
  return 'deepseek';
}

export function getLLMProvider(requestedProvider?: string): LLMProvider {
  const providerType = resolveAIProviderName(requestedProvider);
  switch (providerType) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'deepseek':
    default:
      return new DeepSeekProvider();
  }
}

export { DeepSeekProvider, OpenAIProvider, AnthropicProvider };
export * from './provider';
export * from './tools';
