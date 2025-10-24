/**
 * AI Provider Exports
 *
 * Central export point for all AI provider implementations.
 * This file makes it easy to import providers and their types.
 *
 * @example
 * ```typescript
 * import { createGrokProvider, createClaudeProvider } from '@/lib/ai/providers';
 *
 * const grok = createGrokProvider();
 * const claude = createClaudeProvider();
 * ```
 */

// Base provider
export {
  BaseProvider,
  type CompletionRequest,
  type CompletionResponse,
  type StreamChunk,
  type ProviderConfig,
  type ProviderMetrics,
} from './base';

// Grok provider
export {
  GrokProvider,
  createGrokProvider,
  type GrokConfig,
} from './grok';

// Claude provider
export {
  ClaudeProvider,
  createClaudeProvider,
  type ClaudeConfig,
} from './claude';

// TODO: Add OpenAI provider when implemented
// export {
//   OpenAIProvider,
//   createOpenAIProvider,
//   type OpenAIConfig,
// } from './openai';

/**
 * Provider registry for dynamic provider creation
 */
export const PROVIDER_REGISTRY = {
  grok: createGrokProvider,
  claude: createClaudeProvider,
  // openai: createOpenAIProvider,
} as const;

/**
 * Available provider IDs
 */
export type ProviderId = keyof typeof PROVIDER_REGISTRY;

/**
 * Get all available provider IDs
 */
export function getAvailableProviders(): ProviderId[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderId[];
}

/**
 * Create a provider instance by ID
 *
 * @param providerId - The provider to create
 * @param config - Provider-specific configuration
 * @returns Provider instance
 *
 * @example
 * ```typescript
 * const provider = createProvider('grok', {
 *   apiKey: process.env.XAI_API_KEY!,
 * });
 * ```
 */
export function createProvider(
  providerId: ProviderId,
  config?: Record<string, unknown>
): BaseProvider {
  const factory = PROVIDER_REGISTRY[providerId];
  if (!factory) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return factory(config as any);
}
