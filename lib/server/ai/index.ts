import { DeepSeekProvider } from './providers/deepseek';
import { LLMProvider } from './provider';

export function getLLMProvider(requestedProvider?: string): LLMProvider {
  const providerType = requestedProvider || process.env.AI_SANDBOX_PROVIDER || 'deepseek';
  if (providerType === 'deepseek') {
    return new DeepSeekProvider();
  }
  return new DeepSeekProvider();
}

export { DeepSeekProvider };
export * from './provider';
export * from './tools';
