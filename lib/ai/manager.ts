/**
 * LLM Provider Manager - The Brain of the AI System
 * Handles fallback chains, retries, caching, cost tracking, and circuit breakers
 */

import { LLMProvider, GenerateParams, LLMResponse, LLMChunk } from './types';
import { CircuitBreaker } from './circuit-breaker';
import { ResponseCache } from './cache';
import { CostTracker } from './cost-tracker';

export interface ProviderManagerConfig {
  providers: Map<string, LLMProvider>;
  fallbackChain: string[];
  circuitBreakers: Map<string, CircuitBreaker>;
  costTracker: CostTracker;
  cache: ResponseCache;
}

export interface GenerateOptions {
  /** Preferred provider (falls back if it fails) */
  preferredProvider?: string;

  /** Enable automatic fallback to next provider */
  enableFallback?: boolean;

  /** Max retry attempts per provider */
  maxRetries?: number;

  /** Cache key for response caching */
  cacheKey?: string;

  /** Budget limit in USD (reject if exceeds) */
  budgetLimit?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Project ID for cost tracking */
  projectId?: string;

  /** User ID for cost tracking */
  userId?: string;

  /** Agent type for analytics */
  agentType?: string;
}

export class LLMProviderManager {
  private providers: Map<string, LLMProvider>;
  private fallbackChain: string[];
  private circuitBreakers: Map<string, CircuitBreaker>;
  private costTracker: CostTracker;
  private cache: ResponseCache;

  constructor(config: ProviderManagerConfig) {
    this.providers = config.providers;
    this.fallbackChain = config.fallbackChain;
    this.circuitBreakers = config.circuitBreakers;
    this.costTracker = config.costTracker;
    this.cache = config.cache;
  }

  /**
   * Generate a response with automatic fallback and retry logic
   */
  async generate(
    params: GenerateParams,
    options: GenerateOptions = {}
  ): Promise<LLMResponse> {
    // 1. Check cache first
    if (options.cacheKey) {
      const cached = await this.cache.get(options.cacheKey);
      if (cached) {
        console.log(`[Cache Hit] ${options.cacheKey}`);
        return { ...cached, metadata: { ...cached.metadata, cached: true } };
      }
    }

    // 2. Determine provider order
    const providerOrder = this.getProviderOrder(options.preferredProvider);

    // 3. Try each provider in order
    let lastError: Error | null = null;

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        console.warn(`[Provider Not Found] ${providerName}`);
        continue;
      }

      // Check circuit breaker
      const breaker = this.circuitBreakers.get(providerName);
      if (breaker?.isOpen()) {
        console.log(`[Circuit Open] Skipping ${providerName}`);
        continue;
      }

      // Check budget
      if (options.budgetLimit) {
        const estimatedCost = provider.estimateCost(
          params.maxTokens || 1000,
          params.model || 'default'
        );
        if (estimatedCost > options.budgetLimit) {
          throw new Error(
            `Estimated cost $${estimatedCost.toFixed(4)} exceeds budget $${options.budgetLimit}`
          );
        }
      }

      // Execute with retry
      try {
        console.log(`[Provider Attempt] ${providerName}`);
        const response = await this.executeWithRetry(
          provider,
          params,
          options.maxRetries || 3,
          options.timeout
        );

        // Track cost
        await this.costTracker.log({
          provider: providerName,
          model: response.model,
          tokens: response.usage.totalTokens,
          cost: response.cost || 0,
          timestamp: new Date(),
          projectId: options.projectId,
          userId: options.userId,
          agentType: options.agentType
        });

        // Cache if requested
        if (options.cacheKey) {
          await this.cache.set(options.cacheKey, response, 3600); // 1hr TTL
        }

        // Mark success in circuit breaker
        breaker?.recordSuccess();

        console.log(`[Provider Success] ${providerName}`);
        return response;

      } catch (error) {
        lastError = error as Error;
        console.error(`[Provider Failed] ${providerName}:`, error);

        // Record failure in circuit breaker
        breaker?.recordFailure();

        // If fallback disabled, throw immediately
        if (options.enableFallback === false) {
          throw error;
        }

        // Try next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed. Last error: ${lastError?.message}`
    );
  }

  /**
   * Stream a response with fallback support
   */
  async *stream(
    params: GenerateParams,
    options: GenerateOptions = {}
  ): AsyncIterator<LLMChunk> {
    const providerOrder = this.getProviderOrder(options.preferredProvider);

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      if (!provider.supportsFeature('streaming')) {
        console.log(`[No Streaming] ${providerName} doesn't support streaming`);
        continue;
      }

      const breaker = this.circuitBreakers.get(providerName);
      if (breaker?.isOpen()) {
        console.log(`[Circuit Open] Skipping ${providerName}`);
        continue;
      }

      try {
        console.log(`[Stream Attempt] ${providerName}`);

        for await (const chunk of provider.stream(params)) {
          yield chunk;
        }

        // Mark success
        breaker?.recordSuccess();
        return;

      } catch (error) {
        console.error(`[Stream Failed] ${providerName}:`, error);
        breaker?.recordFailure();

        if (options.enableFallback === false) {
          throw error;
        }

        continue;
      }
    }

    throw new Error('All streaming providers failed');
  }

  /**
   * Execute with exponential backoff retry
   */
  private async executeWithRetry(
    provider: LLMProvider,
    params: GenerateParams,
    maxRetries: number,
    timeout?: number
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Apply timeout if specified
        if (timeout) {
          return await this.withTimeout(
            provider.generate(params),
            timeout
          );
        }
        return await provider.generate(params);

      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('budget') ||
      message.includes('unauthorized') ||
      message.includes('invalid api key') ||
      message.includes('quota')
    );
  }

  /**
   * Determine provider order based on preference
   */
  private getProviderOrder(preferredProvider?: string): string[] {
    if (!preferredProvider) {
      return [...this.fallbackChain];
    }

    // Put preferred provider first
    return [
      preferredProvider,
      ...this.fallbackChain.filter(p => p !== preferredProvider)
    ];
  }

  /**
   * Get provider health status
   */
  getProviderHealth() {
    const health: Record<string, any> = {};

    for (const [name, breaker] of this.circuitBreakers.entries()) {
      health[name] = breaker.getMetrics();
    }

    return health;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get cost statistics
   */
  async getCostStats() {
    return {
      total: this.costTracker.getTotalCost(),
      byProvider: await this.costTracker.getProviderStats(),
      byModel: await this.costTracker.getModelStats()
    };
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.reset();
      console.log(`[Circuit Reset] ${providerName}`);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Clean up expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    return await this.cache.cleanExpired();
  }
}
