/**
 * Base Provider Abstract Class
 *
 * This abstract class defines the contract that all AI provider implementations must follow.
 * It implements the Strategy pattern to allow easy provider switching.
 *
 * @example
 * ```typescript
 * class MyProvider extends BaseProvider {
 *   async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
 *     // Implementation
 *   }
 * }
 * ```
 */

/**
 * TODO: Import types from lib/ai/types.ts when Agent 1 completes
 * For now, using placeholder interfaces
 */

// Placeholder types - will be replaced by Agent 1's types
export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;
  cached: boolean;
  providerId: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: CompletionResponse['usage'];
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

export interface ProviderMetrics {
  totalRequests: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  lastError?: Date;
}

/**
 * Abstract base class for all AI providers
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected metrics: ProviderMetrics;
  public readonly providerId: string;
  public readonly supportedModels: string[];

  constructor(providerId: string, config: ProviderConfig, supportedModels: string[]) {
    this.providerId = providerId;
    this.config = config;
    this.supportedModels = supportedModels;
    this.metrics = {
      totalRequests: 0,
      totalCost: 0,
      averageLatency: 0,
      errorRate: 0,
    };
  }

  /**
   * Generate a completion (non-streaming)
   *
   * @param request - The completion request
   * @returns Promise resolving to completion response
   * @throws Error if the request fails
   */
  abstract generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate a streaming completion
   *
   * @param request - The completion request with stream=true
   * @returns AsyncGenerator yielding stream chunks
   * @throws Error if the request fails
   */
  abstract generateStreamingCompletion(
    request: CompletionRequest
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Estimate the cost of a request before making it
   *
   * @param request - The completion request
   * @returns Estimated cost in USD
   */
  abstract estimateCost(request: CompletionRequest): number;

  /**
   * Count tokens in a string using the provider's tokenizer
   *
   * @param text - The text to tokenize
   * @returns Number of tokens
   */
  abstract countTokens(text: string): number;

  /**
   * Validate that the API key is valid and the provider is reachable
   *
   * @returns Promise resolving to true if healthy, false otherwise
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Get the current metrics for this provider
   *
   * @returns Provider metrics
   */
  public getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Update metrics after a request
   *
   * @param latencyMs - Request latency in milliseconds
   * @param cost - Request cost in USD
   * @param success - Whether the request succeeded
   */
  protected updateMetrics(latencyMs: number, cost: number, success: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.totalCost += cost;

    // Update average latency (exponential moving average)
    const alpha = 0.2;
    this.metrics.averageLatency =
      alpha * latencyMs + (1 - alpha) * this.metrics.averageLatency;

    // Update error rate
    if (!success) {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) /
        this.metrics.totalRequests;
      this.metrics.lastError = new Date();
    } else {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalRequests - 1)) /
        this.metrics.totalRequests;
    }
  }

  /**
   * Check if a model is supported by this provider
   *
   * @param model - Model identifier
   * @returns True if supported
   */
  public supportsModel(model: string): boolean {
    return this.supportedModels.includes(model);
  }

  /**
   * Get the default model for this provider
   *
   * @returns Default model identifier
   */
  public getDefaultModel(): string {
    return this.config.defaultModel || this.supportedModels[0];
  }

  /**
   * Implement exponential backoff retry logic
   *
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @returns Promise resolving to function result
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Sanitize and validate a completion request
   *
   * @param request - The completion request
   * @returns Validated request
   * @throws Error if validation fails
   */
  protected validateRequest(request: CompletionRequest): CompletionRequest {
    // TODO: Implement validation logic
    // - Check required fields
    // - Validate temperature range
    // - Validate maxTokens
    // - Ensure prompt is not empty
    // - Check model is supported

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
      }
    }

    if (request.maxTokens !== undefined && request.maxTokens <= 0) {
      throw new Error('maxTokens must be positive');
    }

    const model = request.model || this.getDefaultModel();
    if (!this.supportsModel(model)) {
      throw new Error(`Model ${model} is not supported by ${this.providerId}`);
    }

    return {
      ...request,
      model,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 4096,
    };
  }
}
