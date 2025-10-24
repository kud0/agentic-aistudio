/**
 * AI Provider Architecture - Type Definitions
 *
 * This file defines the complete type system for the AI Provider Abstraction layer.
 * It implements the Strategy Pattern to enable seamless provider switching (Grok ↔ Claude ↔ OpenAI)
 * with automatic fallback chains, circuit breakers, cost tracking, and quality scoring.
 *
 * Architecture Decisions:
 * ====================
 *
 * 1. STRATEGY PATTERN FOR PROVIDERS
 *    - Why: Enables runtime provider switching without code changes
 *    - Benefit: Easy to add new providers (just implement LLMProvider interface)
 *    - Benefit: Testable with mock implementations
 *
 * 2. FALLBACK CHAIN LOGIC
 *    - Flow: Primary → Secondary → Tertiary providers
 *    - Why: Prevents single point of failure
 *    - Logic: Tries each provider in sequence until success or exhaustion
 *    - Circuit breakers automatically skip failing providers
 *
 * 3. CIRCUIT BREAKER STATE MACHINE
 *    - States: closed (normal) → open (failing) → half-open (recovery) → closed
 *    - Transitions:
 *      * closed → open: After N consecutive failures (default: 5)
 *      * open → half-open: After timeout period (default: 60s)
 *      * half-open → closed: After successful request
 *      * half-open → open: After failure during recovery
 *    - Why: Prevents cascading failures and allows automatic recovery
 *
 * 4. COST TRACKING APPROACH
 *    - Track at multiple levels: provider, model, task, project, user
 *    - Calculate costs based on: (input_tokens + output_tokens) * price_per_token
 *    - Enforce budgets at: project level, user level, daily level
 *    - Why: Prevents runaway costs and enables cost analytics
 *
 * 5. CACHING STRATEGY
 *    - Cache key: hash(prompt + systemPrompt + temperature + model)
 *    - TTL: Configurable per task type (default: 1 hour)
 *    - Eviction: LRU (Least Recently Used)
 *    - Cache hits tracked for analytics
 *    - Why: Reduces costs and latency for repeated queries
 *
 * @module lib/ai/types
 * @version 1.0.0
 * @author System Architect Agent
 * @date 2025-10-24
 */

// ============================================================================
// CORE PROVIDER INTERFACE
// ============================================================================

/**
 * Unified interface that all LLM providers must implement.
 *
 * This is the heart of the Strategy Pattern. Every provider (Grok, Claude, OpenAI)
 * implements this interface, allowing the ProviderManager to treat them uniformly.
 *
 * Key responsibilities:
 * - Generate text completions (streaming or non-streaming)
 * - Calculate token usage
 * - Calculate costs
 * - Normalize provider-specific responses into LLMResponse format
 *
 * @interface LLMProvider
 */
export interface LLMProvider {
  /**
   * Unique identifier for this provider
   * @example "grok", "claude", "openai"
   */
  readonly name: string;

  /**
   * List of available models for this provider
   * @example ["grok-2", "grok-2-mini"]
   */
  readonly models: string[];

  /**
   * Flag indicating if this provider is currently enabled
   * Read from environment variables (e.g., GROK_ENABLED=true)
   */
  readonly enabled: boolean;

  /**
   * Generate a completion (non-streaming)
   *
   * @param params - Normalized generation parameters
   * @returns Promise resolving to normalized LLMResponse
   * @throws {ProviderError} If generation fails
   */
  generate(params: GenerateParams): Promise<LLMResponse>;

  /**
   * Generate a streaming completion
   *
   * Yields chunks as they arrive from the provider.
   * The consumer can process each chunk in real-time (e.g., SSE to frontend).
   *
   * @param params - Normalized generation parameters
   * @returns AsyncGenerator yielding LLMChunk objects
   * @throws {ProviderError} If streaming fails
   */
  generateStream(params: GenerateParams): AsyncGenerator<LLMChunk, void, unknown>;

  /**
   * Count tokens in a text string
   *
   * Uses provider-specific tokenizer (e.g., tiktoken for OpenAI, Anthropic's tokenizer for Claude).
   * For providers without a tokenizer, use approximate count (text.length / 4).
   *
   * @param text - Text to tokenize
   * @returns Token count
   */
  countTokens(text: string): Promise<number>;

  /**
   * Calculate cost for a given token usage
   *
   * Cost = (inputTokens * inputPricePerToken) + (outputTokens * outputPricePerToken)
   * Prices are provider and model-specific (stored in config).
   *
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param model - Model name (for model-specific pricing)
   * @returns Cost in USD (e.g., 0.00123)
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number;

  /**
   * Estimate cost for total tokens (assumes 30/70 input/output split)
   *
   * @param tokens - Total token count
   * @param model - Model name (for model-specific pricing)
   * @returns Estimated cost in USD
   */
  estimateCost(tokens: number, model: string): number;

  /**
   * Check if this provider supports a specific feature
   *
   * @param feature - Feature to check ('streaming', 'tools', 'vision')
   * @returns True if feature is supported
   */
  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean;

  /**
   * Check if this provider is healthy
   *
   * Returns current health status including error rates and circuit breaker state.
   * Used by ProviderManager to decide whether to use this provider.
   *
   * @returns Promise resolving to ProviderHealth object
   */
  getHealth(): Promise<ProviderHealth>;
}

// ============================================================================
// REQUEST & RESPONSE FORMATS
// ============================================================================

/**
 * Normalized parameters for LLM generation requests
 *
 * This interface abstracts away provider-specific APIs.
 * The ProviderManager uses this format, and each provider translates it
 * to their native API format (e.g., Claude's "messages" API, Grok's "chat/completions").
 *
 * @interface GenerateParams
 */
export interface GenerateParams {
  /**
   * The main prompt/user message
   * @example "Analyze the competitive landscape for a SaaS startup in the project management space."
   */
  prompt: string;

  /**
   * System prompt (optional)
   * Sets the behavior and context for the LLM.
   * @example "You are a senior brand strategist with 15 years of experience."
   */
  systemPrompt?: string;

  /**
   * Model to use
   * Must be one of the models available for the selected provider.
   * @example "grok-2", "claude-3-5-sonnet-20241022", "gpt-4"
   */
  model: string;

  /**
   * Temperature (0.0 - 2.0)
   * Controls randomness. 0 = deterministic, 2 = very creative.
   * @default 0.7
   */
  temperature?: number;

  /**
   * Maximum tokens to generate
   * Limits the length of the response.
   * @default 4000
   */
  maxTokens?: number;

  /**
   * Top-P sampling (0.0 - 1.0)
   * Alternative to temperature. 0.1 = only top 10% probable tokens.
   * @default 1.0
   */
  topP?: number;

  /**
   * Stop sequences
   * Generation stops when any of these strings is encountered.
   * @example ["###", "END"]
   */
  stopSequences?: string[];

  /**
   * Additional metadata for logging and tracking
   * Stored in the database with the usage log.
   */
  metadata?: {
    /**
     * Project ID (foreign key to projects table)
     */
    projectId?: string;

    /**
     * User ID (foreign key to users table)
     */
    userId?: string;

    /**
     * Task type (e.g., "research", "strategy", "critique")
     */
    taskType?: string;

    /**
     * Additional custom metadata
     */
    [key: string]: unknown;
  };
}

/**
 * Normalized LLM response format
 *
 * All providers return this format, regardless of their native API structure.
 * This makes it easy to consume responses without provider-specific logic.
 *
 * @interface LLMResponse
 */
export interface LLMResponse {
  /**
   * Generated text content
   */
  content: string;

  /**
   * Provider that generated this response
   * @example "grok", "claude", "openai"
   */
  provider: string;

  /**
   * Model that generated this response
   * @example "grok-2", "claude-3-5-sonnet-20241022"
   */
  model: string;

  /**
   * Token usage breakdown
   */
  usage: {
    /**
     * Number of tokens in the prompt (input)
     */
    inputTokens: number;

    /**
     * Number of tokens in the completion (output)
     */
    outputTokens: number;

    /**
     * Total tokens (input + output)
     */
    totalTokens: number;
  };

  /**
   * Cost in USD
   * Calculated using provider-specific pricing.
   * @example 0.00123
   */
  cost: number;

  /**
   * Latency in milliseconds
   * Time from request to completion.
   * @example 2345
   */
  latencyMs: number;

  /**
   * Whether this response came from cache
   * If true, cost and latency are reduced.
   */
  cached: boolean;

  /**
   * Timestamp when this response was generated
   */
  timestamp: Date;

  /**
   * Quality score (if available)
   * Populated by the quality scoring system (optional).
   */
  qualityScore?: QualityScore;

  /**
   * Provider-specific metadata
   * For debugging or advanced use cases.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Streaming chunk format
 *
 * Emitted by generateStream() as text is generated.
 * Consumers can process chunks in real-time (e.g., Server-Sent Events).
 *
 * @interface LLMChunk
 */
export interface LLMChunk {
  /**
   * Text content in this chunk
   * @example "The competitive landscape is characterized by"
   */
  content: string;

  /**
   * Whether this is the final chunk
   * When true, the stream is complete.
   */
  done: boolean;

  /**
   * Token usage (only present in final chunk)
   */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /**
   * Cost (only present in final chunk)
   */
  cost?: number;

  /**
   * Latency (only present in final chunk)
   */
  latencyMs?: number;
}

// ============================================================================
// QUALITY SCORING
// ============================================================================

/**
 * Quality score for LLM outputs
 *
 * Automatically generated by the quality scoring system.
 * Uses a cheap model (e.g., Grok mini) to rate expensive outputs.
 *
 * Scoring criteria:
 * - Completeness: Does it address all aspects of the prompt?
 * - Coherence: Is it logically structured and easy to follow?
 * - Actionability: Does it provide concrete, actionable recommendations?
 * - Accuracy: Is the information factually correct? (if verifiable)
 *
 * @interface QualityScore
 */
export interface QualityScore {
  /**
   * Database ID (optional, for persistence)
   */
  id?: string;

  /**
   * Reference to the output being scored
   */
  output_id?: string;

  /**
   * Overall quality score (0-100)
   * <60: Flagged for review
   * 60-80: Acceptable
   * >80: High quality
   */
  overall: number;

  /**
   * Completeness score (0-100)
   * Does it cover all required aspects?
   */
  completeness: number;

  /**
   * Coherence score (0-100)
   * Is it well-structured and logical?
   */
  coherence: number;

  /**
   * Actionability score (0-100)
   * Does it provide actionable recommendations?
   */
  actionability: number;

  /**
   * Accuracy score (0-100, optional)
   * Is it factually correct?
   */
  accuracy?: number;

  /**
   * Reasoning for the scores
   * Generated by the quality scoring model.
   * @example "The output is comprehensive but lacks specific metrics."
   */
  reasoning: string;

  /**
   * Whether this output should be flagged for human review
   * Auto-flagged if overall score < 60.
   */
  flagged_for_review: boolean;

  /**
   * Timestamp when this score was calculated
   */
  created_at?: Date;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker states
 *
 * State Machine:
 * - closed: Normal operation (requests flow through)
 * - open: Provider is failing (requests are blocked)
 * - half-open: Testing if provider has recovered (limited requests)
 *
 * @type CircuitState
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Provider names (type-safe)
 */
export type ProviderName = 'grok' | 'claude' | 'openai';

/**
 * Provider status
 */
export type ProviderStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

/**
 * Agent/Task types
 */
export type AgentType = 'research' | 'strategy' | 'critique' | 'qualityScore' | 'other';

/**
 * Provider health status
 *
 * Tracks error rates, latency, and circuit breaker state.
 * Used by ProviderManager to decide fallback strategy.
 *
 * @interface ProviderHealth
 */
export interface ProviderHealth {
  /**
   * Database ID (optional, for persistence)
   */
  id?: string;

  /**
   * Provider name
   * @example "grok", "claude"
   */
  provider: ProviderName;

  /**
   * Overall health status
   * - healthy: Error rate < 5%, latency normal, circuit closed
   * - degraded: Error rate 5-20%, latency high, circuit half-open
   * - down: Error rate > 20%, circuit open
   */
  status: ProviderStatus;

  /**
   * Circuit breaker state
   */
  circuit_breaker_state?: CircuitState;

  /**
   * Error rate (0.0 - 1.0)
   * Calculated over last N requests (default: 100).
   * @example 0.05 = 5% error rate
   */
  error_rate: number;

  /**
   * Average latency in milliseconds
   * Calculated over last N requests.
   * @example 1234
   */
  avg_latency_ms: number;

  /**
   * Number of consecutive failures
   * Used to trigger circuit breaker.
   * Resets to 0 on successful request.
   */
  consecutiveFailures?: number;

  /**
   * Timestamp of last successful request
   */
  last_success_at?: Date;

  /**
   * Last error message (if any)
   */
  last_error?: string;

  /**
   * Timestamp of last health check
   */
  last_checked: Date;

  /**
   * Timestamp when circuit will attempt recovery (if open)
   */
  nextRetryAt?: Date;
}

// ============================================================================
// PROVIDER MANAGER CONFIGURATION
// ============================================================================

/**
 * Configuration for the ProviderManager
 *
 * Defines fallback chains, task routing, budgets, and cache settings.
 * Loaded from environment variables and config files.
 *
 * @interface ProviderManagerConfig
 */
export interface ProviderManagerConfig {
  /**
   * Default fallback chain
   * Providers are tried in this order until one succeeds.
   * @example ["grok", "claude", "openai"]
   */
  defaultFallbackChain: string[];

  /**
   * Task-specific routing configuration
   * Maps task types to preferred providers and models.
   */
  taskRouting: {
    [taskType: string]: TaskRoutingConfig;
  };

  /**
   * Budget limits
   */
  budgets: {
    /**
     * Maximum cost per project (USD)
     * Enforced before each request.
     * @example 10.00
     */
    perProject?: number;

    /**
     * Maximum cost per user (USD)
     * Enforced before each request.
     * @example 50.00
     */
    perUser?: number;

    /**
     * Maximum cost per day (USD)
     * Global limit across all projects.
     * @example 100.00
     */
    perDay?: number;
  };

  /**
   * Circuit breaker configuration
   */
  circuitBreaker: {
    /**
     * Number of consecutive failures before opening circuit
     * @default 5
     */
    failureThreshold: number;

    /**
     * Timeout before attempting recovery (milliseconds)
     * @default 60000 (60 seconds)
     */
    recoveryTimeoutMs: number;

    /**
     * Window size for error rate calculation (number of requests)
     * @default 100
     */
    windowSize: number;
  };

  /**
   * Cache configuration
   */
  cache: {
    /**
     * Whether caching is enabled
     * @default true
     */
    enabled: boolean;

    /**
     * Default TTL (Time To Live) in seconds
     * @default 3600 (1 hour)
     */
    defaultTtlSeconds: number;

    /**
     * Task-specific TTLs
     * @example { "research": 7200, "strategy": 3600 }
     */
    ttlByTaskType?: Record<string, number>;

    /**
     * Maximum cache size (number of entries)
     * When exceeded, LRU eviction is used.
     * @default 1000
     */
    maxSize: number;
  };

  /**
   * Retry configuration
   */
  retry: {
    /**
     * Maximum number of retries per provider
     * @default 3
     */
    maxRetries: number;

    /**
     * Initial backoff delay (milliseconds)
     * Doubles with each retry (exponential backoff).
     * @default 1000
     */
    initialBackoffMs: number;

    /**
     * Maximum backoff delay (milliseconds)
     * @default 10000
     */
    maxBackoffMs: number;
  };
}

/**
 * Task-specific routing configuration
 *
 * Defines which provider and model to use for a specific task type.
 * Enables cost optimization (e.g., use cheap model for quality scoring).
 *
 * @interface TaskRoutingConfig
 */
export interface TaskRoutingConfig {
  /**
   * Preferred provider for this task
   * @example "grok"
   */
  provider: string;

  /**
   * Preferred model for this task
   * @example "grok-2"
   */
  model: string;

  /**
   * Fallback chain (overrides default)
   * @example ["grok", "claude"]
   */
  fallbackChain?: string[];

  /**
   * Whether fallback is enabled for this task
   * Set to false for tasks where cost is more important than reliability.
   * @default true
   */
  enableFallback: boolean;

  /**
   * Temperature override
   */
  temperature?: number;

  /**
   * Max tokens override
   */
  maxTokens?: number;

  /**
   * Cache TTL override (seconds)
   */
  cacheTtlSeconds?: number;
}

/**
 * Options for generate/generateStream methods
 *
 * Allows request-level overrides of configuration.
 *
 * @interface GenerateOptions
 */
export interface GenerateOptions {
  /**
   * Override default provider
   */
  provider?: string;

  /**
   * Override default model
   */
  model?: string;

  /**
   * Override fallback chain
   */
  fallbackChain?: string[];

  /**
   * Enable/disable fallback for this request
   * @default true
   */
  enableFallback?: boolean;

  /**
   * Enable/disable caching for this request
   * @default true
   */
  enableCache?: boolean;

  /**
   * Force cache bypass (always fetch fresh)
   * @default false
   */
  bypassCache?: boolean;

  /**
   * Custom cache TTL for this request (seconds)
   */
  cacheTtlSeconds?: number;

  /**
   * Task type (for routing and logging)
   * @example "research", "strategy", "critique"
   */
  taskType?: string;

  /**
   * Project ID (for budget enforcement and logging)
   */
  projectId?: string;

  /**
   * User ID (for budget enforcement and logging)
   */
  userId?: string;

  /**
   * Enable/disable quality scoring
   * @default false
   */
  enableQualityScoring?: boolean;

  /**
   * Timeout for this request (milliseconds)
   * @default 30000 (30 seconds)
   */
  timeoutMs?: number;
}

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Log entry for LLM usage
 *
 * Persisted to Supabase `llm_usage_logs` table.
 * Used for cost analytics and budget enforcement.
 *
 * @interface LLMUsageLog
 */
export interface LLMUsageLog {
  /**
   * Unique log ID (UUID)
   */
  id?: string;

  /**
   * Provider name
   */
  provider: ProviderName;

  /**
   * Model name
   */
  model: string;

  /**
   * Task type
   * @example "research", "strategy", "critique", "qualityScore"
   */
  agent_type: AgentType;

  /**
   * Project ID (nullable)
   */
  project_id?: string;

  /**
   * User ID (nullable)
   */
  user_id?: string;

  /**
   * Token usage
   */
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;

  /**
   * Cost in USD
   */
  cost_usd: number;

  /**
   * Latency in milliseconds
   */
  latency_ms?: number;

  /**
   * Whether this was a cache hit
   */
  cached: boolean;

  /**
   * Finish reason (e.g., "stop", "length", "error")
   */
  finish_reason?: string;

  /**
   * Whether fallback was used
   * If true, the primary provider failed.
   */
  fallbackUsed?: boolean;

  /**
   * Success status
   */
  success?: boolean;

  /**
   * Error message (if success=false)
   */
  error_message?: string;

  /**
   * Timestamp
   */
  created_at?: Date;

  /**
   * Additional metadata (JSONB in Supabase)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Budget check result
 *
 * Returned by budget enforcement logic before making a request.
 *
 * @interface BudgetCheckResult
 */
export interface BudgetCheckResult {
  /**
   * Whether the request is allowed under current budgets
   */
  allowed: boolean;

  /**
   * Reason for denial (if allowed=false)
   */
  reason?: string;

  /**
   * Current spending by category
   */
  currentSpending: {
    /**
     * Total spent by this project today (USD)
     */
    project?: number;

    /**
     * Total spent by this user today (USD)
     */
    user?: number;

    /**
     * Total spent system-wide today (USD)
     */
    daily?: number;
  };

  /**
   * Configured limits
   */
  limits: {
    project?: number;
    user?: number;
    daily?: number;
  };

  /**
   * Remaining budget by category
   */
  remaining: {
    project?: number;
    user?: number;
    daily?: number;
  };
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Cache entry structure
 *
 * Stored in memory cache (in-memory for MVP, Redis for production).
 *
 * @interface CacheEntry
 */
export interface CacheEntry {
  /**
   * Cache key (hash of prompt + config)
   */
  key: string;

  /**
   * Cached response
   */
  response: LLMResponse;

  /**
   * Timestamp when this entry was created
   */
  createdAt: Date;

  /**
   * Timestamp when this entry expires
   */
  expiresAt: Date;

  /**
   * Number of times this entry was accessed
   * For analytics and LRU eviction.
   */
  hitCount: number;

  /**
   * Last access timestamp
   * For LRU eviction.
   */
  lastAccessedAt: Date;
}

/**
 * Cache statistics
 *
 * Tracked for analytics dashboard.
 *
 * @interface CacheStats
 */
export interface CacheStats {
  /**
   * Total number of cache requests
   */
  totalRequests: number;

  /**
   * Number of cache hits
   */
  hits: number;

  /**
   * Number of cache misses
   */
  misses: number;

  /**
   * Cache hit rate (0.0 - 1.0)
   * @example 0.75 = 75% hit rate
   */
  hitRate: number;

  /**
   * Total cost saved by caching (USD)
   */
  costSaved: number;

  /**
   * Total latency saved by caching (milliseconds)
   */
  latencySavedMs: number;

  /**
   * Current cache size (number of entries)
   */
  currentSize: number;

  /**
   * Maximum cache size
   */
  maxSize: number;

  /**
   * Number of cache evictions (LRU)
   */
  evictions: number;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Base error class for provider errors
 *
 * All provider-specific errors should extend this class.
 *
 * @class ProviderError
 */
export class ProviderError extends Error {
  /**
   * Provider name
   */
  public readonly provider: string;

  /**
   * Error code
   * Provider-specific (e.g., "rate_limit_exceeded", "invalid_api_key")
   */
  public readonly code: string;

  /**
   * Whether this error is retryable
   * If true, the ProviderManager will retry or fallback.
   */
  public readonly retryable: boolean;

  /**
   * Timestamp when this error occurred
   */
  public readonly timestamp: Date;

  /**
   * Additional error metadata
   */
  public readonly metadata?: Record<string, unknown>;

  constructor(
    provider: string,
    message: string,
    code: string = 'unknown',
    retryable: boolean = false,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
    this.timestamp = new Date();
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }
}

/**
 * Budget exceeded error
 *
 * Thrown when a request would exceed budget limits.
 *
 * @class BudgetExceededError
 */
export class BudgetExceededError extends Error {
  /**
   * Budget check result with details
   */
  public readonly budgetCheck: BudgetCheckResult;

  constructor(budgetCheck: BudgetCheckResult) {
    super(budgetCheck.reason || 'Budget exceeded');
    this.name = 'BudgetExceededError';
    this.budgetCheck = budgetCheck;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BudgetExceededError);
    }
  }
}

/**
 * Circuit breaker open error
 *
 * Thrown when a provider's circuit breaker is open (provider is down).
 *
 * @class CircuitBreakerOpenError
 */
export class CircuitBreakerOpenError extends ProviderError {
  /**
   * Provider health status
   */
  public readonly health: ProviderHealth;

  constructor(provider: string, health: ProviderHealth) {
    super(
      provider,
      `Circuit breaker open for provider "${provider}". Next retry at ${health.nextRetryAt?.toISOString()}`,
      'circuit_breaker_open',
      true,
      { health }
    );
    this.name = 'CircuitBreakerOpenError';
    this.health = health;
  }
}

// ============================================================================
// PROVIDER METADATA
// ============================================================================

/**
 * Static metadata for a provider
 *
 * Describes available models, pricing, and capabilities.
 *
 * @interface ProviderMetadata
 */
export interface ProviderMetadata {
  /**
   * Provider name
   * @example "grok", "claude", "openai"
   */
  name: string;

  /**
   * Display name
   * @example "Grok by X.AI"
   */
  displayName: string;

  /**
   * Provider description
   */
  description: string;

  /**
   * API endpoint base URL
   * @example "https://api.x.ai/v1"
   */
  endpoint: string;

  /**
   * Available models
   */
  models: ModelMetadata[];

  /**
   * Capabilities
   */
  capabilities: {
    /**
     * Supports streaming responses
     */
    streaming: boolean;

    /**
     * Supports system prompts
     */
    systemPrompts: boolean;

    /**
     * Supports tool/function calling
     */
    toolCalling: boolean;

    /**
     * Supports vision/image inputs
     */
    vision: boolean;

    /**
     * Supports JSON mode
     */
    jsonMode: boolean;
  };

  /**
   * Rate limits
   */
  rateLimits?: {
    /**
     * Requests per minute
     */
    requestsPerMinute?: number;

    /**
     * Tokens per minute
     */
    tokensPerMinute?: number;
  };
}

/**
 * Model metadata
 *
 * Describes a specific model's capabilities and pricing.
 *
 * @interface ModelMetadata
 */
export interface ModelMetadata {
  /**
   * Model name/ID
   * @example "grok-2", "claude-3-5-sonnet-20241022"
   */
  name: string;

  /**
   * Display name
   * @example "Grok 2"
   */
  displayName: string;

  /**
   * Model description
   */
  description: string;

  /**
   * Context window size (tokens)
   * @example 131072
   */
  contextWindow: number;

  /**
   * Maximum output tokens
   * @example 8192
   */
  maxOutputTokens: number;

  /**
   * Pricing
   */
  pricing: {
    /**
     * Input token price (USD per token)
     * @example 0.00001
     */
    inputPricePerToken: number;

    /**
     * Output token price (USD per token)
     * @example 0.00003
     */
    outputPricePerToken: number;
  };

  /**
   * Whether this model is deprecated
   */
  deprecated: boolean;

  /**
   * Release date
   */
  releaseDate: Date;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  total_cost: number;
  total_requests: number;
  avg_latency: number;
  cache_hit_rate: number;
  error_rate: number;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  by_provider: Record<ProviderName, number>;
  by_model: Record<string, number>;
  by_agent: Record<AgentType, number>;
  by_day: Record<string, number>;
}

/**
 * Analytics data
 */
export interface AnalyticsData {
  summary: AnalyticsSummary;
  breakdown: CostBreakdown;
  expensive_prompts: ExpensivePrompt[];
  quality_distribution: QualityDistribution;
}

/**
 * Expensive prompt
 */
export interface ExpensivePrompt {
  id: string;
  agent_type: AgentType;
  provider: ProviderName;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
}

/**
 * Quality distribution
 */
export interface QualityDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  flagged_count: number;
}

/**
 * Cost analytics aggregation
 *
 * Used for analytics dashboard queries.
 *
 * @interface CostAnalytics
 */
export interface CostAnalytics {
  /**
   * Time period for this aggregation
   */
  period: {
    start: Date;
    end: Date;
  };

  /**
   * Total cost (USD)
   */
  totalCost: number;

  /**
   * Total requests
   */
  totalRequests: number;

  /**
   * Total tokens
   */
  totalTokens: number;

  /**
   * Breakdown by provider
   */
  byProvider: Record<string, {
    cost: number;
    requests: number;
    tokens: number;
    averageLatencyMs: number;
  }>;

  /**
   * Breakdown by model
   */
  byModel: Record<string, {
    cost: number;
    requests: number;
    tokens: number;
  }>;

  /**
   * Breakdown by task type
   */
  byTaskType: Record<string, {
    cost: number;
    requests: number;
    tokens: number;
  }>;

  /**
   * Breakdown by project
   */
  byProject: Record<string, {
    cost: number;
    requests: number;
    tokens: number;
  }>;

  /**
   * Cache statistics
   */
  cacheStats: CacheStats;

  /**
   * Average cost per request (USD)
   */
  averageCostPerRequest: number;

  /**
   * Most expensive prompts
   */
  topExpensivePrompts: Array<{
    prompt: string;
    cost: number;
    provider: string;
    model: string;
    timestamp: Date;
  }>;
}

/**
 * Provider performance metrics
 *
 * Tracks performance over time for each provider.
 *
 * @interface ProviderMetrics
 */
export interface ProviderMetrics {
  /**
   * Provider name
   */
  provider: string;

  /**
   * Time period
   */
  period: {
    start: Date;
    end: Date;
  };

  /**
   * Total requests
   */
  totalRequests: number;

  /**
   * Successful requests
   */
  successfulRequests: number;

  /**
   * Failed requests
   */
  failedRequests: number;

  /**
   * Success rate (0.0 - 1.0)
   */
  successRate: number;

  /**
   * Average latency (milliseconds)
   */
  averageLatencyMs: number;

  /**
   * 50th percentile latency (milliseconds)
   */
  p50LatencyMs: number;

  /**
   * 95th percentile latency (milliseconds)
   */
  p95LatencyMs: number;

  /**
   * 99th percentile latency (milliseconds)
   */
  p99LatencyMs: number;

  /**
   * Circuit breaker trips
   * Number of times the circuit breaker opened.
   */
  circuitBreakerTrips: number;

  /**
   * Total cost (USD)
   */
  totalCost: number;

  /**
   * Average cost per request (USD)
   */
  averageCostPerRequest: number;
}

/**
 * Scoring result
 */
export interface ScoringResult {
  success: boolean;
  score?: QualityScore;
  error?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  success: boolean;
  health?: ProviderHealth;
  error?: string;
}
