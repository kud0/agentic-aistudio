/**
 * AI Provider Configuration
 *
 * Central configuration for LLM providers, routing, budgets, and timeouts.
 */

export const AI_CONFIG = {
  // Provider configurations
  providers: {
    grok: {
      name: 'grok',
      models: {
        default: 'grok-4-fast-reasoning',
        'grok-4': 'grok-4-fast-reasoning',
        'grok-2': 'grok-2-latest',
        'grok-2-vision': 'grok-2-vision-latest',
      },
      pricing: {
        'grok-4-fast-reasoning': { input: 2.0, output: 10.0 }, // per 1M tokens (placeholder)
        'grok-2-latest': { input: 2.0, output: 10.0 }, // per 1M tokens
      },
    },
  },

  // Task-based routing configuration
  routing: {
    research: {
      provider: 'grok',
      model: 'default',
      temperature: 0.7,
      maxTokens: 4000,
      enableFallback: false, // No fallback - Grok only
    },
    strategy: {
      provider: 'grok',
      model: 'default',
      temperature: 0.8,
      maxTokens: 6000,
      enableFallback: false, // No fallback - Grok only
    },
    critique: {
      provider: 'grok',
      model: 'default',
      temperature: 0.6,
      maxTokens: 4000,
      enableFallback: false, // No fallback - Grok only
    },
  },

  // Fallback chain (only Grok)
  fallbackChain: ['grok'],

  // Budget limits (in USD)
  budgets: {
    perProject: 10.0, // Max $10 per project
    perUser: 50.0, // Max $50 per user per month
    perRequest: 2.0, // Max $2 per single request
  },

  // Timeout configurations (in milliseconds)
  timeouts: {
    research: 60000, // 60 seconds
    strategy: 90000, // 90 seconds
    critique: 60000, // 60 seconds
    streaming: 120000, // 2 minutes for streaming
    default: 30000, // 30 seconds
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  },

  // Circuit breaker thresholds
  circuitBreaker: {
    errorThreshold: 0.5, // Open circuit if error rate > 50%
    successThreshold: 0.8, // Close circuit if success rate > 80%
    timeout: 30000, // 30 seconds
    resetTimeout: 60000, // Try again after 60 seconds
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
  },
} as const;

/**
 * Get provider configuration by name
 */
export function getProviderConfig(provider: keyof typeof AI_CONFIG.providers) {
  return AI_CONFIG.providers[provider];
}

/**
 * Get routing configuration by task
 */
export function getRoutingConfig(task: keyof typeof AI_CONFIG.routing) {
  return AI_CONFIG.routing[task];
}

/**
 * Estimate cost for a request
 */
export function estimateCost(
  provider: keyof typeof AI_CONFIG.providers,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const providerConfig = AI_CONFIG.providers[provider];
  const pricing = providerConfig.pricing[model as keyof typeof providerConfig.pricing];

  if (!pricing) {
    console.warn(`No pricing info for ${provider}/${model}`);
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Validate environment variables
 */
export function validateEnvironment() {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Check Grok API key (X.AI)
  if (!process.env.XAI_API_KEY && !process.env.GROK_API_KEY) {
    errors.push('XAI_API_KEY or GROK_API_KEY is required for Grok provider');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return true;
}
