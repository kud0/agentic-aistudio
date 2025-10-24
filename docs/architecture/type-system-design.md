# AI Provider Architecture - Type System Design

**Agent:** System Architect (Agent 1)
**Date:** October 24, 2025
**Status:** Complete
**Version:** 1.0.0

---

## Executive Summary

This document describes the complete type system design for the AI Provider Abstraction layer. The design implements the **Strategy Pattern** to enable seamless provider switching (Grok ↔ Claude ↔ OpenAI) with automatic fallback chains, circuit breakers, cost tracking, and quality scoring.

## Key Design Decisions

### 1. Strategy Pattern for Providers

**Decision:** Use Strategy Pattern with unified `LLMProvider` interface

**Rationale:**
- Enables runtime provider switching without code changes
- Easy to add new providers (just implement the interface)
- Testable with mock implementations
- Loose coupling between provider implementation and consumer code

**Implementation:**
```typescript
interface LLMProvider {
  readonly name: string;
  readonly models: string[];
  readonly enabled: boolean;
  generate(params: GenerateParams): Promise<LLMResponse>;
  generateStream(params: GenerateParams): AsyncGenerator<LLMChunk>;
  countTokens(text: string): Promise<number>;
  calculateCost(inputTokens, outputTokens, model): number;
  getHealth(): Promise<ProviderHealth>;
}
```

**Benefits:**
- Provider-agnostic API routes
- Easy A/B testing between providers
- Hot-swapping providers without downtime
- Simplified unit testing with mocks

---

### 2. Fallback Chain Logic

**Decision:** Sequential fallback with configurable provider chains

**Flow:**
```
Primary Provider (e.g., Grok)
  ↓ (on failure)
Secondary Provider (e.g., Claude)
  ↓ (on failure)
Tertiary Provider (e.g., OpenAI)
  ↓ (all failed)
Error propagation to client
```

**Rationale:**
- Prevents single point of failure
- Maximizes uptime and reliability
- Configurable per task type (cost vs reliability trade-off)

**Configuration Schema:**
```typescript
interface ProviderManagerConfig {
  defaultFallbackChain: string[];  // ["grok", "claude", "openai"]
  taskRouting: {
    [taskType: string]: {
      provider: string;
      model: string;
      fallbackChain?: string[];
      enableFallback: boolean;
    }
  }
}
```

**Edge Cases Handled:**
- Circuit breaker skips failing providers automatically
- Exponential backoff between retries
- Budget checks before each fallback attempt
- Fallback disabled for cost-sensitive tasks (e.g., quality scoring)

---

### 3. Circuit Breaker State Machine

**Decision:** Three-state circuit breaker per provider

**State Diagram:**
```
┌─────────┐
│ CLOSED  │ ← Normal operation (requests flow)
│         │
└────┬────┘
     │ 5 consecutive failures
     ↓
┌─────────┐
│  OPEN   │ ← Provider failing (requests blocked)
│         │
└────┬────┘
     │ 60s timeout
     ↓
┌──────────┐
│ HALF-OPEN│ ← Testing recovery (limited requests)
│          │
└────┬─────┘
     │
     ├─ Success → CLOSED
     └─ Failure → OPEN
```

**Transitions:**
| From | To | Trigger | Action |
|------|-----|---------|--------|
| CLOSED | OPEN | 5 consecutive failures | Block all requests |
| OPEN | HALF-OPEN | 60s timeout | Allow 1 test request |
| HALF-OPEN | CLOSED | Successful request | Resume normal operation |
| HALF-OPEN | OPEN | Failed request | Back to blocking |

**Configuration:**
```typescript
circuitBreaker: {
  failureThreshold: 5,        // Failures before opening
  recoveryTimeoutMs: 60000,   // Time before half-open
  windowSize: 100             // Requests for error rate calculation
}
```

**Rationale:**
- Prevents cascading failures (fail fast)
- Automatic recovery without manual intervention
- Reduces load on failing providers
- Provides graceful degradation

**Implementation Notes:**
- Error rate tracked per provider (rolling window of 100 requests)
- Health status derived from circuit state + error rate
- Next retry time stored for client-side awareness

---

### 4. Cost Tracking Approach

**Decision:** Multi-level cost tracking with proactive budget enforcement

**Tracking Levels:**
1. **Provider** → Total spend per provider (Grok, Claude, OpenAI)
2. **Model** → Total spend per model (grok-2, claude-3-5-sonnet, etc.)
3. **Task** → Total spend per task type (research, strategy, critique)
4. **Project** → Total spend per project (user-facing limit)
5. **User** → Total spend per user (account-level limit)
6. **Daily** → Total spend system-wide per day (global limit)

**Cost Calculation:**
```typescript
cost = (inputTokens * inputPricePerToken) + (outputTokens * outputPricePerToken)
```

**Budget Enforcement:**
```typescript
interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpending: { project?, user?, daily? };
  limits: { project?, user?, daily? };
  remaining: { project?, user?, daily? };
}
```

**Enforcement Points:**
- **Before request**: Check if request would exceed budget
- **During fallback**: Re-check budget before trying next provider
- **After request**: Log actual cost and update totals

**Budget Configuration:**
```typescript
budgets: {
  perProject: 10.00,   // $10 max per project
  perUser: 50.00,      // $50 max per user
  perDay: 100.00       // $100 max system-wide per day
}
```

**Rationale:**
- Prevents runaway costs from bugs or abuse
- User-friendly budget visibility
- Configurable limits per deployment environment
- Detailed cost attribution for analytics

---

### 5. Caching Strategy

**Decision:** LRU cache with content-addressed keys and configurable TTLs

**Cache Key Generation:**
```typescript
key = hash(
  prompt +
  systemPrompt +
  model +
  temperature +
  maxTokens +
  topP
)
```

**TTL Configuration:**
```typescript
cache: {
  enabled: true,
  defaultTtlSeconds: 3600,  // 1 hour
  ttlByTaskType: {
    "research": 7200,   // 2 hours (research rarely changes)
    "strategy": 3600,   // 1 hour
    "critique": 1800    // 30 mins (more dynamic)
  },
  maxSize: 1000  // LRU eviction after 1000 entries
}
```

**Cache Entry:**
```typescript
interface CacheEntry {
  key: string;
  response: LLMResponse;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;        // For analytics
  lastAccessedAt: Date;    // For LRU eviction
}
```

**Eviction Policy:**
1. **TTL expiration**: Remove entries older than TTL
2. **LRU eviction**: When cache full, evict least recently used
3. **Manual invalidation**: Allow cache flush per task/project

**Cache Bypass:**
```typescript
options: {
  enableCache: boolean,    // Disable caching entirely
  bypassCache: boolean,    // Force fresh fetch (but still cache result)
  cacheTtlSeconds: number  // Override default TTL
}
```

**Rationale:**
- Reduces costs (cache hits are free)
- Reduces latency (cached responses are instant)
- Content-addressed keys prevent stale data
- LRU eviction balances memory usage
- Task-specific TTLs optimize hit rate vs freshness

**Analytics Tracking:**
```typescript
interface CacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;         // 0.0 - 1.0
  costSaved: number;       // USD
  latencySavedMs: number;
  evictions: number;
}
```

---

## Complete Type Hierarchy

### Core Interfaces

```
LLMProvider
├── generate(params) → LLMResponse
├── generateStream(params) → AsyncGenerator<LLMChunk>
├── countTokens(text) → number
├── calculateCost(input, output, model) → number
└── getHealth() → ProviderHealth

GenerateParams
├── prompt: string
├── systemPrompt?: string
├── model: string
├── temperature?: number
├── maxTokens?: number
├── topP?: number
├── stopSequences?: string[]
└── metadata?: object

LLMResponse
├── content: string
├── provider: string
├── model: string
├── usage: { inputTokens, outputTokens, totalTokens }
├── cost: number
├── latencyMs: number
├── cached: boolean
├── timestamp: Date
├── qualityScore?: QualityScore
└── metadata?: object

LLMChunk (for streaming)
├── content: string
├── done: boolean
├── usage?: object (final chunk only)
├── cost?: number (final chunk only)
└── latencyMs?: number (final chunk only)
```

### Quality Scoring

```
QualityScore
├── overall: number (0-100)
├── completeness: number (0-100)
├── coherence: number (0-100)
├── actionability: number (0-100)
├── accuracy?: number (0-100)
├── reasoning: string
├── flagged_for_review: boolean
└── created_at?: Date
```

### Circuit Breaker & Health

```
CircuitState = 'closed' | 'open' | 'half-open'

ProviderHealth
├── provider: ProviderName
├── status: 'healthy' | 'degraded' | 'down'
├── circuit_breaker_state?: CircuitState
├── error_rate: number (0-1)
├── avg_latency_ms: number
├── consecutiveFailures?: number
├── last_success_at?: Date
├── last_error?: string
├── last_checked: Date
└── nextRetryAt?: Date
```

### Configuration

```
ProviderManagerConfig
├── defaultFallbackChain: string[]
├── taskRouting: { [taskType]: TaskRoutingConfig }
├── budgets: { perProject?, perUser?, perDay? }
├── circuitBreaker: { failureThreshold, recoveryTimeoutMs, windowSize }
├── cache: { enabled, defaultTtlSeconds, ttlByTaskType, maxSize }
└── retry: { maxRetries, initialBackoffMs, maxBackoffMs }

TaskRoutingConfig
├── provider: string
├── model: string
├── fallbackChain?: string[]
├── enableFallback: boolean
├── temperature?: number
├── maxTokens?: number
└── cacheTtlSeconds?: number

GenerateOptions (request-level overrides)
├── provider?: string
├── model?: string
├── fallbackChain?: string[]
├── enableFallback?: boolean
├── enableCache?: boolean
├── bypassCache?: boolean
├── cacheTtlSeconds?: number
├── taskType?: string
├── projectId?: string
├── userId?: string
├── enableQualityScoring?: boolean
└── timeoutMs?: number
```

### Cost Tracking

```
LLMUsageLog (persisted to Supabase)
├── id?: string
├── provider: ProviderName
├── model: string
├── agent_type: AgentType
├── project_id?: string
├── user_id?: string
├── prompt_tokens: number
├── completion_tokens: number
├── total_tokens: number
├── cost_usd: number
├── latency_ms?: number
├── cached: boolean
├── finish_reason?: string
├── fallbackUsed?: boolean
├── success?: boolean
├── error_message?: string
├── created_at?: Date
└── metadata?: object

BudgetCheckResult
├── allowed: boolean
├── reason?: string
├── currentSpending: { project?, user?, daily? }
├── limits: { project?, user?, daily? }
└── remaining: { project?, user?, daily? }
```

### Caching

```
CacheEntry
├── key: string
├── response: LLMResponse
├── createdAt: Date
├── expiresAt: Date
├── hitCount: number
└── lastAccessedAt: Date

CacheStats
├── totalRequests: number
├── hits: number
├── misses: number
├── hitRate: number
├── costSaved: number
├── latencySavedMs: number
├── currentSize: number
├── maxSize: number
└── evictions: number
```

### Error Handling

```
ProviderError extends Error
├── provider: string
├── code: string
├── retryable: boolean
├── timestamp: Date
└── metadata?: object

BudgetExceededError extends Error
└── budgetCheck: BudgetCheckResult

CircuitBreakerOpenError extends ProviderError
└── health: ProviderHealth
```

### Provider Metadata

```
ProviderMetadata
├── name: string
├── displayName: string
├── description: string
├── endpoint: string
├── models: ModelMetadata[]
├── capabilities: { streaming, systemPrompts, toolCalling, vision, jsonMode }
└── rateLimits?: { requestsPerMinute?, tokensPerMinute? }

ModelMetadata
├── name: string
├── displayName: string
├── description: string
├── contextWindow: number
├── maxOutputTokens: number
├── pricing: { inputPricePerToken, outputPricePerToken }
├── deprecated: boolean
└── releaseDate: Date
```

### Analytics

```
CostAnalytics
├── period: { start, end }
├── totalCost: number
├── totalRequests: number
├── totalTokens: number
├── byProvider: Record<string, { cost, requests, tokens, averageLatencyMs }>
├── byModel: Record<string, { cost, requests, tokens }>
├── byTaskType: Record<string, { cost, requests, tokens }>
├── byProject: Record<string, { cost, requests, tokens }>
├── cacheStats: CacheStats
├── averageCostPerRequest: number
└── topExpensivePrompts: Array<{ prompt, cost, provider, model, timestamp }>

ProviderMetrics
├── provider: string
├── period: { start, end }
├── totalRequests: number
├── successfulRequests: number
├── failedRequests: number
├── successRate: number
├── averageLatencyMs: number
├── p50LatencyMs: number
├── p95LatencyMs: number
├── p99LatencyMs: number
├── circuitBreakerTrips: number
├── totalCost: number
└── averageCostPerRequest: number
```

---

## Integration Points

### For Agent 2 (Template Generator)

**Use these types:**
- `LLMProvider` - Base class for provider implementations
- `GenerateParams` - Input to generate/generateStream methods
- `LLMResponse` - Output from generate method
- `LLMChunk` - Output from generateStream method
- `ProviderHealth` - Return type for getHealth method

**Template structure:**
```typescript
export class GrokProvider implements LLMProvider {
  readonly name = 'grok';
  readonly models = ['grok-2', 'grok-2-mini'];
  readonly enabled = process.env.GROK_ENABLED === 'true';

  async generate(params: GenerateParams): Promise<LLMResponse> {
    // TODO: Implementation
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<LLMChunk> {
    // TODO: Implementation
  }

  async countTokens(text: string): Promise<number> {
    // TODO: Implementation
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    // TODO: Implementation
  }

  async getHealth(): Promise<ProviderHealth> {
    // TODO: Implementation
  }
}
```

### For Agent 3 (Implementation Specialist)

**Implement these:**
- `GrokProvider implements LLMProvider`
- `ClaudeProvider implements LLMProvider`
- `OpenAIProvider implements LLMProvider` (optional)
- `ProviderManager` - Orchestrates fallback, budgets, caching
- `CircuitBreaker` - Manages provider health and state
- `ResponseCache` - LRU cache implementation
- `CostTracker` - Logs usage to Supabase

**Use these types:**
- `ProviderManagerConfig` - Configuration schema
- `GenerateOptions` - Request-level overrides
- `BudgetCheckResult` - Budget enforcement
- `CacheEntry` - Cache storage
- `ProviderError`, `BudgetExceededError`, `CircuitBreakerOpenError` - Error handling

### For Agent 4 (API Developer)

**Use these types:**
- `GenerateParams` - Parse from request body
- `LLMResponse` - Return to client
- `LLMChunk` - Stream via SSE
- `GenerateOptions` - Build from query params and request context
- `LLMUsageLog` - Log to database
- `BudgetCheckResult` - Return budget errors

**API Route Structure:**
```typescript
export async function POST(request: NextRequest) {
  const { prompt, systemPrompt, model, ...rest } = await request.json();

  const params: GenerateParams = {
    prompt,
    systemPrompt,
    model,
    metadata: {
      projectId: request.headers.get('x-project-id'),
      userId: request.headers.get('x-user-id'),
      taskType: 'research'
    }
  };

  const options: GenerateOptions = {
    enableFallback: true,
    enableCache: true,
    taskType: 'research'
  };

  const response = await providerManager.generate(params, options);

  return NextResponse.json(response);
}
```

---

## Configuration Schema Examples

### Environment Variables

```bash
# Provider Enablement
GROK_ENABLED=true
CLAUDE_ENABLED=true
OPENAI_ENABLED=false

# API Keys
GROK_API_KEY=xai-...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Fallback Chain
DEFAULT_FALLBACK_CHAIN=grok,claude,openai

# Budgets (USD)
BUDGET_PER_PROJECT=10.00
BUDGET_PER_USER=50.00
BUDGET_PER_DAY=100.00

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT_MS=60000
CIRCUIT_BREAKER_WINDOW_SIZE=100

# Cache
CACHE_ENABLED=true
CACHE_DEFAULT_TTL_SECONDS=3600
CACHE_MAX_SIZE=1000

# Retry
RETRY_MAX_RETRIES=3
RETRY_INITIAL_BACKOFF_MS=1000
RETRY_MAX_BACKOFF_MS=10000
```

### Task Routing Configuration

```typescript
const taskRouting = {
  research: {
    provider: 'grok',
    model: 'grok-2',
    fallbackChain: ['grok', 'claude'],
    enableFallback: true,
    temperature: 0.7,
    maxTokens: 8000,
    cacheTtlSeconds: 7200  // 2 hours
  },
  strategy: {
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    fallbackChain: ['claude', 'grok'],
    enableFallback: true,
    temperature: 0.8,
    maxTokens: 8000,
    cacheTtlSeconds: 3600  // 1 hour
  },
  critique: {
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    fallbackChain: ['claude', 'grok'],
    enableFallback: true,
    temperature: 0.6,
    maxTokens: 4000,
    cacheTtlSeconds: 1800  // 30 minutes
  },
  qualityScore: {
    provider: 'grok',
    model: 'grok-2-mini',  // Use cheaper model
    fallbackChain: [],
    enableFallback: false,  // Don't waste money on fallback
    temperature: 0.3,
    maxTokens: 500,
    cacheTtlSeconds: 0  // Don't cache quality scores
  }
};
```

---

## Testing Strategy

### Unit Tests (using Mock Providers)

```typescript
// Mock provider for testing
class MockProvider implements LLMProvider {
  readonly name = 'mock';
  readonly models = ['mock-model'];
  readonly enabled = true;

  async generate(params: GenerateParams): Promise<LLMResponse> {
    return {
      content: 'Mock response',
      provider: 'mock',
      model: 'mock-model',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      cost: 0.001,
      latencyMs: 100,
      cached: false,
      timestamp: new Date()
    };
  }

  // ... other methods
}
```

### Test Scenarios

1. **Fallback works correctly**
   - Primary fails → Secondary succeeds
   - All providers fail → Error

2. **Circuit breaker trips**
   - 5 failures → Circuit opens
   - 60s timeout → Half-open
   - Success → Closed

3. **Budget enforcement**
   - Over project budget → Denied
   - Over user budget → Denied
   - Over daily budget → Denied

4. **Caching**
   - Cache miss → Fetch + store
   - Cache hit → Return cached
   - TTL expired → Refetch
   - LRU eviction → Remove oldest

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API response time | <10s | For non-streaming requests |
| Streaming latency | <500ms | Time to first chunk |
| Cache hit rate | >50% | After warm-up period |
| Cost per project | <$2 | Average for full workflow |
| Uptime | >99% | With fallback enabled |
| Budget check time | <50ms | Should not add noticeable latency |

---

## Security Considerations

1. **API Key Storage**
   - Store in environment variables (not code)
   - Use Vercel secrets in production
   - Rotate keys regularly

2. **Budget Enforcement**
   - Server-side validation only (never trust client)
   - Row-level security (RLS) in Supabase
   - Rate limiting per user

3. **Input Validation**
   - Sanitize prompts (XSS prevention)
   - Token limit enforcement (DoS prevention)
   - Parameter validation (type safety)

4. **Error Messages**
   - Don't leak API keys in logs
   - Generic error messages to clients
   - Detailed errors to internal logs

---

## Migration Path

### Phase 1: Core Types (Complete)
- ✅ All TypeScript interfaces defined
- ✅ Error classes implemented
- ✅ Architecture documentation

### Phase 2: Provider Implementations (Agent 3)
- Grok provider
- Claude provider
- OpenAI provider (optional)

### Phase 3: Manager & Supporting Components (Agent 3)
- Provider manager with fallback
- Circuit breaker
- Response cache
- Cost tracker

### Phase 4: API Integration (Agent 4)
- Research endpoint
- Strategy endpoint
- Critique endpoint
- Streaming endpoint
- Analytics endpoint

### Phase 5: Testing & Optimization (Agent 6 & 8)
- Unit tests
- Integration tests
- Load tests
- Performance optimization

---

## Success Criteria

- ✅ All interfaces complete with JSDoc
- ✅ No `any` types
- ✅ Support for fallback chains
- ✅ Support for streaming
- ✅ Support for caching
- ✅ Support for budget enforcement
- ✅ Support for quality scoring
- ✅ Type safety for all operations
- ✅ Clear error handling strategy
- ✅ Extensible for future providers

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-24 | System Architect (Agent 1) | Initial architecture design |

---

## Next Steps

**For Agent 2 (Template Generator):**
- Use these types to generate boilerplate provider classes
- Create template files with TODO markers
- Include JSDoc comments and type annotations

**For Agent 3 (Implementation Specialist):**
- Implement provider classes using these types
- Follow the interface contracts exactly
- Add comprehensive error handling

**For Agent 4 (API Developer):**
- Use these types for request/response handling
- Implement budget checks before LLM calls
- Log usage with LLMUsageLog interface

---

**Status:** READY FOR NEXT AGENTS ✅
