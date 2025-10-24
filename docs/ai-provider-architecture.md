# AI Provider Architecture - Comprehensive Technical Design Document

**Project:** Strategist Agent Platform MVP
**Version:** 1.0
**Date:** October 24, 2025
**Author:** AI Architecture Team

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Gaps in Current PRD](#critical-gaps-in-current-prd)
3. [AI Provider Architecture Design](#ai-provider-architecture-design)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Database Schema Updates](#database-schema-updates)
6. [API Design & Endpoints](#api-design--endpoints)
7. [n8n Integration Strategy](#n8n-integration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Analytics & Monitoring](#analytics--monitoring)
10. [Deployment Guide](#deployment-guide)
11. [Future Enhancements](#future-enhancements)

---

## 1. Executive Summary

### Problem Statement
The current PRD lacks a robust AI provider abstraction layer, creating risks:
- **Vendor Lock-in:** Hard dependency on specific LLM providers
- **No Fallback Strategy:** Single point of failure if provider is down
- **Cost Inefficiency:** No optimization for task-based model routing
- **Limited Observability:** No cost tracking or quality metrics

### Solution
Build a comprehensive provider abstraction system that enables:
1. ✅ **Easy Provider Switching** - Swap Grok ↔ Claude ↔ OpenAI via config
2. ✅ **Cost Optimization** - Route tasks to optimal models, cache responses
3. ✅ **Quality & Reliability** - Auto-fallbacks, quality scoring, health monitoring
4. ✅ **Streaming Support** - Real-time output generation
5. ✅ **Full Observability** - Cost tracking, analytics dashboard

### Architecture Decisions
- **Next.js API Routes** for provider abstraction (not separate microservice)
- **n8n calls Next.js API** for all LLM operations (decoupled from providers)
- **Strategy Pattern** for provider implementations
- **Supabase** for usage logging and analytics

### Key Metrics
- 🎯 **Cost per project:** <$2 average (vs $5-10 without optimization)
- 🎯 **Uptime:** >99% with automatic fallbacks
- 🎯 **Quality score:** >70 average with auto-flagging
- 🎯 **Streaming latency:** <500ms to first token

---

## 2. Critical Gaps in Current PRD

### 2.1 AI Provider Abstraction (PRIMARY CONCERN)

**What's Missing:**

| Gap | Impact | Solution |
|-----|--------|----------|
| No provider abstraction layer | Hard to swap providers | Strategy pattern with unified interface |
| No fallback strategy | Single point of failure | Automatic fallback chain |
| No cost optimization | 2-5x higher costs | Task-based routing to optimal models |
| No rate limiting | API quota exhaustion | Per-provider rate limiters |
| No response normalization | Brittle code for each provider | Unified response format |
| No token counting | Budget overruns | Accurate token estimation |
| No error handling | Poor user experience | Exponential backoff + retries |
| No health monitoring | No visibility into failures | Circuit breakers + health checks |

### 2.2 Technical Execution Gaps

**Streaming:**
- ❌ No mention of streaming LLM responses
- ✅ Critical for UX - users see progress in real-time
- ✅ Reduces perceived latency from minutes to seconds

**Caching:**
- ❌ No LLM response caching
- ✅ Can save 50%+ on costs for similar briefs
- ✅ Semantic caching for fuzzy matches

**Prompts:**
- ❌ No version control for prompts
- ✅ Hard to A/B test improvements
- ✅ No rollback on bad prompts

**Context Windows:**
- ❌ No handling for briefs >128k tokens
- ✅ Could fail on large client documents
- ✅ Need chunking + summarization strategy

**File Processing:**
- ❌ How are PDFs parsed for LLMs?
- ✅ Need OCR or text extraction pipeline
- ✅ Vision models for brand logos/visuals?

### 2.3 Workflow Orchestration Risks

**n8n Challenges:**

| Challenge | Risk | Mitigation |
|-----------|------|------------|
| Default 5min timeout | Research could take 15+ min | Increase timeout + async processing |
| Partial failures | Lose progress if one step fails | Checkpoint after each agent step |
| No resume/retry | Users must restart entire workflow | Stateful workflow with resume capability |
| Workflow versioning | Breaking in-progress projects | Version workflows, support old versions |
| State persistence | Crash = lost progress | Persist state to DB after each step |

### 2.4 Data Privacy & Security

**Critical for Brand Agencies:**
- 🔒 **Encryption at Rest:** Brand briefs are highly confidential
- 🔒 **LLM Provider Privacy:** Need Data Processing Agreements (DPAs)
- 🔒 **Audit Trail:** Who accessed/edited outputs?
- 🔒 **GDPR Compliance:** Right to delete, data retention policies
- 🔒 **Access Control:** Role-based permissions (strategist vs admin)

### 2.5 UX/Product Gaps

| Current PRD | Gap | Enhancement |
|-------------|-----|-------------|
| Poll every 10s | Coarse progress | Granular progress (e.g., "Research: 2/3 sources analyzed") |
| Wait for full workflow | Poor UX for 15min+ workflows | Show interim results as they complete |
| Fire-and-forget | No user control | Let users steer agents mid-workflow |
| Single user | No collaboration | Multi-user editing of outputs |
| No history | Can't undo changes | Version history for outputs |

### 2.6 Scalability Concerns

**Current Setup:**
- n8n self-hosted (2GB RAM) → ~10 concurrent workflows max
- Supabase free tier (500MB) → Fills fast with JSONB outputs
- No queue management → Requests dropped on overload

**Needed:**
- ✅ Redis queue for request buffering
- ✅ Background workers for async processing
- ✅ Rate limiting per user
- ✅ Cost caps per project ($5-10 max)
- ✅ Auto-scaling for n8n (Kubernetes or serverless migration)

### 2.7 Testing & Quality Assurance

**How do we know outputs are good?**
- ❌ No LLM output validation
- ❌ No regression testing for workflow changes
- ❌ No A/B testing for prompt variations
- ❌ No human-in-the-loop review process

**Solutions:**
- ✅ Auto-score outputs (coherence, completeness, actionability)
- ✅ Compare workflow changes against baseline outputs
- ✅ A/B test prompts with real users
- ✅ Flag low-quality outputs for strategist review

---

## 3. AI Provider Architecture Design

### 3.1 Design Principles

1. **Strategy Pattern:** Swap providers without code changes
2. **Fallback Chain:** Auto-switch on failures (Grok → Claude → OpenAI)
3. **Cost Optimization:** Route by task complexity (cheap vs premium models)
4. **Observable:** Log all LLM calls for debugging/analytics
5. **Testable:** Mock providers for unit tests

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│                                                              │
│  - Project Dashboard                                         │
│  - Brief Input Form                                          │
│  - Streaming Output Display                                  │
│  - Analytics Dashboard                                       │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP / Server-Sent Events (SSE)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Vercel Edge)                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  /api/ai/research                                   │    │
│  │  /api/ai/strategy                                   │    │
│  │  /api/ai/critique                                   │    │
│  │  /api/ai/stream       ◄─────────────────────────────┼────┼─ n8n HTTP Nodes
│  │  /api/analytics/usage                               │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           AI Provider Manager (lib/ai/manager.ts)            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Capabilities:                                        │  │
│  │  • Provider Selection & Fallback Chain               │  │
│  │  • Circuit Breakers (auto-skip failing providers)    │  │
│  │  • Cost Tracking & Budget Enforcement                │  │
│  │  • Response Caching (50% cost savings)               │  │
│  │  • Quality Scoring (auto-flag bad outputs)           │  │
│  │  • Rate Limiting (per-provider quotas)               │  │
│  │  • Retry Logic (exponential backoff)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬──────────────┬────────────────┬─────────────────────────┘
     │              │                │
     ▼              ▼                ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Grok   │  │  Claude  │  │  OpenAI  │  (LLM Providers)
│ Provider │  │ Provider │  │ Provider │
│          │  │          │  │          │
│ • API    │  │ • API    │  │ • API    │
│ • Models │  │ • Models │  │ • Models │
│ • Costs  │  │ • Costs  │  │ • Costs  │
└──────────┘  └──────────┘  └──────────┘
     │              │                │
     └──────────────┴────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database (PostgreSQL)                  │
│                                                              │
│  Tables:                                                     │
│  • projects                  (project metadata)              │
│  • outputs                   (generated content)             │
│  • llm_usage_logs           (every API call logged)         │
│  • quality_scores           (auto-rated outputs)            │
│  • provider_health          (uptime monitoring)             │
│  • response_cache (optional) (cached responses)             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Core Abstraction Layer

#### Unified Provider Interface

```typescript
// lib/ai/types.ts

/**
 * Unified interface that all LLM providers must implement.
 * This allows seamless swapping of providers without code changes.
 */
export interface LLMProvider {
  /** Provider name (e.g., 'grok', 'claude', 'openai') */
  name: string;

  /** Generate a response from the LLM */
  generate(params: GenerateParams): Promise<LLMResponse>;

  /** Stream a response from the LLM (for real-time UX) */
  stream(params: GenerateParams): AsyncIterator<LLMChunk>;

  /** Count tokens in text (for cost estimation) */
  countTokens(text: string): number;

  /** Check if provider supports a feature */
  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean;

  /** Get list of available models */
  getModelList(): string[];

  /** Estimate cost in USD for a request */
  estimateCost(tokens: number, model: string): number;
}

/**
 * Normalized request parameters (works across all providers)
 */
export interface GenerateParams {
  /** Main prompt/user message */
  prompt: string;

  /** System prompt (role definition) */
  systemPrompt?: string;

  /** Temperature (0-1, controls randomness) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Model to use (e.g., 'grok-2-latest', 'claude-3-5-sonnet') */
  model?: string;

  /** Tools/functions for function calling */
  tools?: ToolDefinition[];

  /** Images for vision models (base64 or URLs) */
  images?: string[];

  /** Provider-specific extras */
  metadata?: Record<string, any>;
}

/**
 * Normalized response (consistent format regardless of provider)
 */
export interface LLMResponse {
  /** Generated text content */
  content: string;

  /** Token usage breakdown */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };

  /** Model that generated the response */
  model: string;

  /** Provider name */
  provider: string;

  /** Why generation stopped */
  finishReason: 'stop' | 'length' | 'tool_call' | 'error';

  /** Tool/function calls (if any) */
  toolCalls?: ToolCall[];

  /** Estimated cost in USD */
  cost?: number;

  /** Latency in milliseconds */
  latency?: number;

  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Streaming chunk (for real-time output)
 */
export interface LLMChunk {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

/**
 * Quality score for output validation
 */
export interface QualityScore {
  completeness: number;    // 0-100
  coherence: number;       // 0-100
  actionability: number;   // 0-100
  overall: number;         // Average
  flagForReview: boolean;  // True if overall < 60
  reasoning: string;       // Why this score?
}

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  errorRate: number;       // 0-1
  avgLatencyMs: number;
  lastError?: string;
  lastChecked: Date;
}
```

#### Provider Manager (The Brain)

```typescript
// lib/ai/manager.ts

import { LLMProvider, GenerateParams, LLMResponse } from './types';
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
      if (!provider) continue;

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
            `Estimated cost $${estimatedCost} exceeds budget $${options.budgetLimit}`
          );
        }
      }

      // Execute with retry
      try {
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
          tokens: response.tokensUsed.total,
          cost: response.cost || 0,
          timestamp: new Date()
        });

        // Cache if requested
        if (options.cacheKey) {
          await this.cache.set(options.cacheKey, response, 3600); // 1hr TTL
        }

        // Mark success in circuit breaker
        breaker?.recordSuccess();

        return response;

      } catch (error) {
        lastError = error as Error;
        console.error(`[Provider Failed] ${providerName}:`, error);

        // Record failure in circuit breaker
        breaker?.recordFailure();

        // If fallback disabled, throw immediately
        if (!options.enableFallback) {
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
      if (breaker?.isOpen()) continue;

      try {
        for await (const chunk of provider.stream(params)) {
          yield chunk;
        }
        breaker?.recordSuccess();
        return; // Success, don't try other providers

      } catch (error) {
        console.error(`[Stream Failed] ${providerName}:`, error);
        breaker?.recordFailure();

        if (!options.enableFallback) throw error;
        continue; // Try next provider
      }
    }

    throw new Error('All providers failed for streaming');
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
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Execute with timeout
        const response = timeout
          ? await Promise.race([
              provider.generate(params),
              this.timeoutPromise(timeout)
            ])
          : await provider.generate(params);

        // Add latency
        return {
          ...response,
          latency: Date.now() - startTime
        };

      } catch (error) {
        if (attempt === maxRetries - 1) throw error;

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Retry] Waiting ${delay}ms before retry ${attempt + 1}`);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private getProviderOrder(preferredProvider?: string): string[] {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      // Put preferred provider first, then rest of fallback chain
      return [
        preferredProvider,
        ...this.fallbackChain.filter(p => p !== preferredProvider)
      ];
    }
    return this.fallbackChain;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }
}
```

### 3.4 Provider Implementations

#### Grok Provider

```typescript
// lib/ai/providers/grok.ts

import { LLMProvider, GenerateParams, LLMResponse, LLMChunk } from '../types';

export class GrokProvider implements LLMProvider {
  name = 'grok';
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Grok API key is required');
    this.apiKey = apiKey;
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    const model = params.model || 'grok-2-latest';

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.prompt }
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2000,
        ...(params.tools ? { tools: params.tools } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      },
      model: data.model,
      provider: 'grok',
      finishReason: this.mapFinishReason(data.choices[0].finish_reason),
      cost: this.estimateCost(data.usage.total_tokens, model),
      toolCalls: data.choices[0].message.tool_calls,
      metadata: { rawResponse: data }
    };
  }

  async *stream(params: GenerateParams): AsyncIterator<LLMChunk> {
    const model = params.model || 'grok-2-latest';

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.prompt }
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2000,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Grok streaming error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield { content: '', isComplete: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              yield { content, isComplete: false };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  countTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: string): boolean {
    return ['streaming', 'tools'].includes(feature);
  }

  getModelList(): string[] {
    return ['grok-2-latest', 'grok-2-mini'];
  }

  estimateCost(tokens: number, model: string): number {
    // Grok pricing (example - verify actual pricing)
    const pricing: Record<string, { input: number; output: number }> = {
      'grok-2-latest': { input: 2, output: 10 },    // per 1M tokens
      'grok-2-mini': { input: 0.5, output: 2 }
    };

    const modelPricing = pricing[model] || pricing['grok-2-latest'];

    // Assume 30% input, 70% output split
    const inputTokens = tokens * 0.3;
    const outputTokens = tokens * 0.7;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  private mapFinishReason(reason: string): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_call';
      default: return 'error';
    }
  }
}
```

#### Claude Provider

```typescript
// lib/ai/providers/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, GenerateParams, LLMResponse, LLMChunk } from '../types';

export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Anthropic API key is required');
    this.client = new Anthropic({ apiKey });
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    const model = params.model || 'claude-3-5-sonnet-20241022';

    const response = await this.client.messages.create({
      model,
      max_tokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: [
        { role: 'user', content: params.prompt }
      ]
    });

    const content = response.content[0]?.type === 'text'
      ? response.content[0].text
      : '';

    return {
      content,
      tokensUsed: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      },
      model: response.model,
      provider: 'claude',
      finishReason: this.mapStopReason(response.stop_reason),
      cost: this.estimateCost(
        response.usage.input_tokens + response.usage.output_tokens,
        model
      ),
      metadata: { rawResponse: response }
    };
  }

  async *stream(params: GenerateParams): AsyncIterator<LLMChunk> {
    const model = params.model || 'claude-3-5-sonnet-20241022';

    const stream = await this.client.messages.stream({
      model,
      max_tokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: [
        { role: 'user', content: params.prompt }
      ]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          content: event.delta.text,
          isComplete: false
        };
      } else if (event.type === 'message_stop') {
        yield {
          content: '',
          isComplete: true
        };
      }
    }
  }

  countTokens(text: string): number {
    // Claude's tokenizer is similar to GPT (rough estimation)
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: string): boolean {
    return ['streaming', 'tools', 'vision'].includes(feature);
  }

  getModelList(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229'
    ];
  }

  estimateCost(tokens: number, model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-opus-20240229': { input: 15, output: 75 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-5-sonnet-20241022'];

    // Assume 30% input, 70% output
    const inputTokens = tokens * 0.3;
    const outputTokens = tokens * 0.7;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  private mapStopReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_call';
      default: return 'stop';
    }
  }
}
```

### 3.5 Configuration System

```typescript
// lib/ai/config.ts

export const AI_CONFIG = {
  providers: {
    grok: {
      enabled: process.env.ENABLE_GROK !== 'false', // Default enabled
      apiKey: process.env.GROK_API_KEY!,
      baseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
      models: {
        default: 'grok-2-latest',
        cheap: 'grok-2-mini',
        premium: 'grok-2-latest'
      },
      pricing: {
        'grok-2-latest': { input: 2, output: 10 },
        'grok-2-mini': { input: 0.5, output: 2 }
      },
      rateLimit: {
        requestsPerMinute: parseInt(process.env.GROK_RPM || '60'),
        tokensPerMinute: parseInt(process.env.GROK_TPM || '100000')
      }
    },
    claude: {
      enabled: process.env.ENABLE_CLAUDE !== 'false',
      apiKey: process.env.ANTHROPIC_API_KEY!,
      models: {
        default: 'claude-3-5-sonnet-20241022',
        cheap: 'claude-3-haiku-20240307',
        premium: 'claude-3-opus-20240229'
      },
      pricing: {
        'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-opus-20240229': { input: 15, output: 75 }
      },
      rateLimit: {
        requestsPerMinute: parseInt(process.env.CLAUDE_RPM || '50'),
        tokensPerMinute: parseInt(process.env.CLAUDE_TPM || '80000')
      }
    },
    openai: {
      enabled: process.env.ENABLE_OPENAI === 'true', // Default disabled for MVP
      apiKey: process.env.OPENAI_API_KEY,
      models: {
        default: 'gpt-4-turbo-preview',
        cheap: 'gpt-3.5-turbo',
        premium: 'gpt-4-turbo-preview'
      },
      pricing: {
        'gpt-4-turbo-preview': { input: 10, output: 30 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 }
      }
    }
  },

  // Fallback chain (try in this order)
  fallbackChain: (process.env.FALLBACK_CHAIN || 'grok,claude,openai').split(','),

  // Task-specific routing (optimize cost/quality per agent type)
  routing: {
    research: {
      provider: process.env.RESEARCH_PROVIDER || 'grok',
      model: 'cheap',          // Use cheap model for research
      temperature: 0.3,
      maxTokens: 1500,
      enableFallback: true
    },
    strategy: {
      provider: process.env.STRATEGY_PROVIDER || 'claude',
      model: 'default',        // Use premium model for strategy
      temperature: 0.7,
      maxTokens: 3000,
      enableFallback: true
    },
    critique: {
      provider: process.env.CRITIQUE_PROVIDER || 'grok',
      model: 'default',
      temperature: 0.5,
      maxTokens: 2000,
      enableFallback: true
    },
    qualityScore: {
      provider: 'grok',
      model: 'cheap',          // Cheap model to rate expensive outputs
      temperature: 0,
      maxTokens: 500,
      enableFallback: false    // Don't waste money on fallback for scoring
    }
  },

  // Budget limits (prevent runaway costs)
  budgets: {
    perProject: parseFloat(process.env.MAX_PROJECT_BUDGET || '10'),    // $10 max per project
    perUser: parseFloat(process.env.MAX_USER_BUDGET || '100'),         // $100 per user per month
    dailyTotal: parseFloat(process.env.MAX_DAILY_BUDGET || '500'),     // $500 per day across all users
    warningThreshold: 0.8  // Warn at 80% of budget
  },

  // Caching configuration
  cache: {
    enabled: process.env.ENABLE_CACHE !== 'false',
    provider: process.env.CACHE_PROVIDER || 'memory', // 'redis' for production
    ttl: parseInt(process.env.CACHE_TTL || '3600'),   // 1 hour default
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000') // Max items
  },

  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: 5,      // Open circuit after 5 failures
    successThreshold: 2,      // Close circuit after 2 successes in half-open
    timeout: 60000,          // 60s before trying again
    halfOpenRequests: 3      // Max requests in half-open state
  },

  // Quality scoring thresholds
  quality: {
    minScore: 60,            // Flag for review if below 60
    autoReject: 30,          // Auto-reject if below 30
    requireReview: 70        // Require human review if below 70
  },

  // Timeouts
  timeouts: {
    default: 30000,          // 30s default timeout
    research: 60000,         // 60s for research (can be slow)
    strategy: 90000,         // 90s for strategy generation
    streaming: 120000        // 2min for streaming
  }
};

/**
 * Environment variable validation
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Check at least one provider is enabled
  const enabledProviders = Object.entries(AI_CONFIG.providers)
    .filter(([_, config]) => config.enabled);

  if (enabledProviders.length === 0) {
    errors.push('At least one LLM provider must be enabled');
  }

  // Check API keys for enabled providers
  enabledProviders.forEach(([name, config]) => {
    if (!config.apiKey) {
      errors.push(`${name.toUpperCase()}_API_KEY is required`);
    }
  });

  // Check fallback chain includes enabled providers
  AI_CONFIG.fallbackChain.forEach(provider => {
    if (!AI_CONFIG.providers[provider]?.enabled) {
      errors.push(`Fallback provider '${provider}' is not enabled`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`AI Config validation failed:\n${errors.join('\n')}`);
  }
}
```

### 3.6 Supporting Components

#### Circuit Breaker

```typescript
// lib/ai/circuit-breaker.ts

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  constructor(
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private timeout: number = 60000
  ) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if timeout has passed
      const now = new Date();
      if (this.lastFailureTime &&
          now.getTime() - this.lastFailureTime.getTime() > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}
```

#### Response Cache

```typescript
// lib/ai/cache.ts

import { LLMResponse } from './types';
import { createClient } from '@/lib/supabase/server';

export interface CacheEntry {
  response: LLMResponse;
  timestamp: Date;
  hits: number;
}

export class ResponseCache {
  private memoryCache = new Map<string, CacheEntry>();

  constructor(
    private provider: 'memory' | 'redis' | 'supabase',
    private maxSize: number = 1000
  ) {}

  async get(key: string): Promise<LLMResponse | null> {
    if (this.provider === 'memory') {
      const entry = this.memoryCache.get(key);
      if (!entry) return null;

      // Update hits
      entry.hits++;
      return entry.response;
    }

    if (this.provider === 'supabase') {
      const supabase = createClient();
      const { data } = await supabase
        .from('response_cache')
        .select('response, hits')
        .eq('cache_key', key)
        .single();

      if (data) {
        // Increment hits
        await supabase
          .from('response_cache')
          .update({ hits: data.hits + 1 })
          .eq('cache_key', key);

        return data.response as LLMResponse;
      }
    }

    return null;
  }

  async set(key: string, response: LLMResponse, ttl: number): Promise<void> {
    if (this.provider === 'memory') {
      // Evict oldest if at capacity
      if (this.memoryCache.size >= this.maxSize) {
        const oldestKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(oldestKey);
      }

      this.memoryCache.set(key, {
        response,
        timestamp: new Date(),
        hits: 0
      });

      // Set TTL cleanup
      setTimeout(() => this.memoryCache.delete(key), ttl * 1000);
    }

    if (this.provider === 'supabase') {
      const supabase = createClient();
      await supabase.from('response_cache').upsert({
        cache_key: key,
        response,
        ttl,
        created_at: new Date(),
        hits: 0
      });
    }
  }

  async clear(): Promise<void> {
    if (this.provider === 'memory') {
      this.memoryCache.clear();
    }

    if (this.provider === 'supabase') {
      const supabase = createClient();
      await supabase.from('response_cache').delete().neq('cache_key', '');
    }
  }
}
```

#### Cost Tracker

```typescript
// lib/ai/cost-tracker.ts

import { createClient } from '@/lib/supabase/server';

export interface CostLog {
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  projectId?: string;
  agentType?: string;
}

export class CostTracker {
  async log(entry: CostLog): Promise<void> {
    const supabase = createClient();

    await supabase.from('llm_usage_logs').insert({
      provider: entry.provider,
      model: entry.model,
      prompt_tokens: Math.floor(entry.tokens * 0.3), // Estimate
      completion_tokens: Math.floor(entry.tokens * 0.7),
      total_tokens: entry.tokens,
      cost_usd: entry.cost,
      project_id: entry.projectId,
      agent_type: entry.agentType,
      created_at: entry.timestamp
    });
  }

  async getProjectCost(projectId: string): Promise<number> {
    const supabase = createClient();

    const { data } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .eq('project_id', projectId);

    return data?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;
  }

  async getUserCost(userId: string, days: number = 30): Promise<number> {
    const supabase = createClient();

    const { data } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd, projects!inner(user_id)')
      .eq('projects.user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000));

    return data?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;
  }

  async getDailyCost(): Promise<number> {
    const supabase = createClient();

    const { data } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

    return data?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;
  }
}
```

---

## 4. Implementation Roadmap

### Week 1: Core Provider Abstraction

#### Day 1-2: Foundation
- [ ] Create `lib/ai/types.ts` with all TypeScript interfaces
- [ ] Build `lib/ai/providers/base.ts` with LLMProvider interface
- [ ] Implement `lib/ai/providers/grok.ts` (Grok provider)
- [ ] Implement `lib/ai/providers/claude.ts` (Claude provider)
- [ ] Create `lib/ai/config.ts` with configuration system
- [ ] Set up environment variables (.env.example)

#### Day 3-4: Manager & Resilience
- [ ] Build `lib/ai/manager.ts` (LLMProviderManager)
- [ ] Implement `lib/ai/circuit-breaker.ts`
- [ ] Add retry logic with exponential backoff
- [ ] Create `lib/ai/cost-tracker.ts`
- [ ] Set up `lib/ai/cache.ts` (memory cache for MVP)

#### Day 5: Testing
- [ ] Write unit tests for Grok provider
- [ ] Write unit tests for Claude provider
- [ ] Test fallback scenarios
- [ ] Create mock providers for integration tests
- [ ] Test cost tracking accuracy

**Deliverables:**
- ✅ Provider abstraction works with Grok + Claude
- ✅ Fallback triggers correctly on failures
- ✅ Cost tracking logs accurately
- ✅ Unit test coverage >80%

---

### Week 2: Next.js API Integration

#### Day 1-2: API Routes
- [ ] Create `app/api/ai/research/route.ts`
- [ ] Create `app/api/ai/strategy/route.ts`
- [ ] Create `app/api/ai/critique/route.ts`
- [ ] Add authentication middleware (Supabase Auth)
- [ ] Implement budget checking per request
- [ ] Add error handling middleware

#### Day 3: Streaming Support
- [ ] Build `app/api/ai/stream/route.ts`
- [ ] Create `lib/ai/streaming.ts` helpers
- [ ] Test Server-Sent Events (SSE)
- [ ] Build frontend streaming client

#### Day 4: Database Integration
- [ ] Create Supabase migrations for new tables
- [ ] Integrate cost tracker with DB
- [ ] Set up usage logging
- [ ] Test data persistence

#### Day 5: Prompt Management
- [ ] Create `lib/ai/prompts/research.ts`
- [ ] Create `lib/ai/prompts/strategy.ts`
- [ ] Create `lib/ai/prompts/critique.ts`
- [ ] Version prompts in code
- [ ] Add prompt testing helpers

**Deliverables:**
- ✅ API routes work end-to-end
- ✅ Streaming responses work in frontend
- ✅ All LLM calls logged to database
- ✅ Prompts are versioned and testable

---

### Week 3: Quality & Analytics

#### Day 1-2: Quality Scoring
- [ ] Build `lib/ai/quality-scorer.ts`
- [ ] Create scoring prompts
- [ ] Integrate with output generation
- [ ] Add auto-flagging logic for low scores
- [ ] Test scoring accuracy

#### Day 3-4: Analytics Dashboard
- [ ] Create `app/api/analytics/usage/route.ts`
- [ ] Build cost analytics queries
- [ ] Add provider health monitoring
- [ ] Create analytics UI components
- [ ] Add charts (cost by provider, daily trends)

#### Day 5: Optimization
- [ ] Implement semantic caching (embeddings)
- [ ] Add request deduplication
- [ ] Optimize prompt token usage
- [ ] Test caching hit rate

**Deliverables:**
- ✅ Quality scoring flags bad outputs
- ✅ Analytics dashboard shows costs
- ✅ Caching reduces costs by 30-50%
- ✅ Provider health monitoring works

---

### Week 4: n8n Integration & Testing

#### Day 1-2: Workflow Updates
- [ ] Update n8n workflows to call Next.js API
- [ ] Replace direct LLM nodes with HTTP Request nodes
- [ ] Add error handling in n8n
- [ ] Test end-to-end workflow with real brief

#### Day 3: Advanced Features
- [ ] Add streaming support to n8n (optional)
- [ ] Implement batch processing
- [ ] Add quality gates (block low-quality outputs)
- [ ] Test parallel agent execution

#### Day 4-5: Final Testing & Documentation
- [ ] End-to-end testing with 3 real briefs
- [ ] Load testing (10+ concurrent workflows)
- [ ] Write API documentation
- [ ] Create deployment guide
- [ ] Security audit

**Deliverables:**
- ✅ n8n workflows use Next.js API
- ✅ End-to-end test completes <5min
- ✅ Load testing passes (10 concurrent)
- ✅ Documentation complete

---

## 5. Database Schema Updates

```sql
-- Add to existing Supabase schema

-- Track all LLM API calls
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'research', 'strategy', 'critique', 'qualityScore'
  provider TEXT NOT NULL, -- 'grok', 'claude', 'openai'
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  latency_ms INTEGER,
  finish_reason TEXT,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_llm_usage_project ON llm_usage_logs(project_id);
CREATE INDEX idx_llm_usage_user ON llm_usage_logs(user_id);
CREATE INDEX idx_llm_usage_created ON llm_usage_logs(created_at);
CREATE INDEX idx_llm_usage_provider ON llm_usage_logs(provider);

-- Track quality scores
CREATE TABLE quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id UUID REFERENCES outputs(id) ON DELETE CASCADE,
  completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 100),
  coherence_score INTEGER CHECK (coherence_score >= 0 AND coherence_score <= 100),
  actionability_score INTEGER CHECK (actionability_score >= 0 AND actionability_score <= 100),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  flagged_for_review BOOLEAN DEFAULT false,
  reasoning TEXT,
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quality_output ON quality_scores(output_id);
CREATE INDEX idx_quality_flagged ON quality_scores(flagged_for_review);

-- Provider health monitoring
CREATE TABLE provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  error_rate DECIMAL(5, 2) DEFAULT 0, -- 0-100%
  avg_latency_ms INTEGER,
  last_error TEXT,
  last_success_at TIMESTAMP,
  last_checked TIMESTAMP DEFAULT NOW(),
  circuit_breaker_state TEXT DEFAULT 'closed' CHECK (circuit_breaker_state IN ('closed', 'open', 'half-open'))
);

-- Response cache (optional, can use Redis instead)
CREATE TABLE response_cache (
  cache_key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  ttl INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  hits INTEGER DEFAULT 0
);

CREATE INDEX idx_cache_created ON response_cache(created_at);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM response_cache
  WHERE created_at + (ttl || ' seconds')::interval < NOW();
END;
$$ LANGUAGE plpgsql;

-- Run cleanup every hour
-- (Set up in Supabase cron or via separate job)

-- Budget tracking (aggregate view)
CREATE OR REPLACE VIEW user_budgets AS
SELECT
  user_id,
  SUM(cost_usd) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS daily_cost,
  SUM(cost_usd) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly_cost,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly_requests
FROM llm_usage_logs
GROUP BY user_id;

-- Project cost tracking
CREATE OR REPLACE VIEW project_costs AS
SELECT
  project_id,
  SUM(cost_usd) AS total_cost,
  SUM(total_tokens) AS total_tokens,
  COUNT(*) AS total_requests,
  MAX(created_at) AS last_request_at
FROM llm_usage_logs
GROUP BY project_id;

-- Row-level security (RLS)
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY "Users can view own logs" ON llm_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON llm_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view quality scores for their outputs
CREATE POLICY "Users can view own quality scores" ON quality_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM outputs o
      JOIN projects p ON o.project_id = p.id
      WHERE o.id = quality_scores.output_id
      AND p.user_id = auth.uid()
    )
  );
```

---

## 6. API Design & Endpoints

### 6.1 Research Agent Endpoint

```typescript
// app/api/ai/research/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMManager } from '@/lib/ai/manager';
import { RESEARCH_PROMPT } from '@/lib/ai/prompts/research';
import { AI_CONFIG } from '@/lib/ai/config';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { projectId, brief } = await req.json();

    // Validation
    if (!projectId || !brief) {
      return NextResponse.json(
        { error: 'projectId and brief are required' },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project and verify ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check project budget
    const { data: projectCost } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .eq('project_id', projectId);

    const totalCost = projectCost?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;

    if (totalCost >= AI_CONFIG.budgets.perProject) {
      return NextResponse.json({
        error: `Project budget exceeded. Max: $${AI_CONFIG.budgets.perProject}`,
        totalCost
      }, { status: 429 });
    }

    // Check user budget
    const { data: userCost } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

    const userTotal = userCost?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;

    if (userTotal >= AI_CONFIG.budgets.perUser) {
      return NextResponse.json({
        error: `Monthly budget exceeded. Max: $${AI_CONFIG.budgets.perUser}`,
        userTotal
      }, { status: 429 });
    }

    // Generate research
    const manager = getLLMManager();
    const routing = AI_CONFIG.routing.research;

    // Create cache key based on brief content
    const cacheKey = `research:${createHash('sha256').update(brief).digest('hex')}`;

    const response = await manager.generate(
      {
        prompt: RESEARCH_PROMPT.user(brief),
        systemPrompt: RESEARCH_PROMPT.system,
        temperature: routing.temperature,
        maxTokens: routing.maxTokens,
        model: AI_CONFIG.providers[routing.provider]?.models[routing.model]
      },
      {
        preferredProvider: routing.provider,
        enableFallback: routing.enableFallback,
        cacheKey: AI_CONFIG.cache.enabled ? cacheKey : undefined,
        budgetLimit: AI_CONFIG.budgets.perProject - totalCost,
        timeout: AI_CONFIG.timeouts.research
      }
    );

    // Save output to database
    const { data: output, error: outputError } = await supabase
      .from('outputs')
      .insert({
        project_id: projectId,
        section: 'research',
        content: response.content
      })
      .select()
      .single();

    if (outputError) {
      console.error('Failed to save output:', outputError);
    }

    // Log usage
    await supabase.from('llm_usage_logs').insert({
      project_id: projectId,
      user_id: user.id,
      agent_type: 'research',
      provider: response.provider,
      model: response.model,
      prompt_tokens: response.tokensUsed.prompt,
      completion_tokens: response.tokensUsed.completion,
      total_tokens: response.tokensUsed.total,
      cost_usd: response.cost || 0,
      latency_ms: response.latency,
      finish_reason: response.finishReason,
      cached: response.metadata?.cached || false
    });

    // Update project status
    await supabase
      .from('projects')
      .update({
        status: 'running',
        updated_at: new Date()
      })
      .eq('id', projectId);

    return NextResponse.json({
      success: true,
      outputId: output?.id,
      content: response.content,
      metadata: {
        provider: response.provider,
        model: response.model,
        cost: response.cost,
        cached: response.metadata?.cached || false,
        tokensUsed: response.tokensUsed.total
      }
    });

  } catch (error: any) {
    console.error('[Research API Error]:', error);

    return NextResponse.json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
```

### 6.2 Streaming Endpoint

```typescript
// app/api/ai/stream/route.ts

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLLMManager } from '@/lib/ai/manager';
import { AI_CONFIG } from '@/lib/ai/config';

export async function POST(req: NextRequest) {
  try {
    const { projectId, task, prompt, systemPrompt } = await req.json();

    // Auth check
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (!project || project.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const manager = getLLMManager();
    const routing = AI_CONFIG.routing[task] || AI_CONFIG.routing.strategy;

    // Create readable stream
    const encoder = new TextEncoder();
    let fullContent = '';
    let tokenCount = 0;
    const startTime = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of manager.stream(
            {
              prompt,
              systemPrompt,
              temperature: routing.temperature,
              maxTokens: routing.maxTokens,
              model: AI_CONFIG.providers[routing.provider]?.models[routing.model]
            },
            {
              preferredProvider: routing.provider,
              enableFallback: true,
              timeout: AI_CONFIG.timeouts.streaming
            }
          )) {
            fullContent += chunk.content;
            tokenCount += Math.ceil(chunk.content.length / 4); // Rough estimate

            // Send chunk to client
            const data = JSON.stringify({
              content: chunk.content,
              isComplete: chunk.isComplete,
              tokensSoFar: tokenCount
            });

            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            if (chunk.isComplete) {
              break;
            }
          }

          const latency = Date.now() - startTime;

          // Save complete output
          const { data: output } = await supabase
            .from('outputs')
            .insert({
              project_id: projectId,
              section: task,
              content: fullContent
            })
            .select()
            .single();

          // Log usage (estimate tokens and cost)
          const estimatedCost = (tokenCount / 1_000_000) * 5; // Rough estimate

          await supabase.from('llm_usage_logs').insert({
            project_id: projectId,
            user_id: user.id,
            agent_type: task,
            provider: routing.provider,
            model: routing.model,
            prompt_tokens: Math.floor(tokenCount * 0.3),
            completion_tokens: Math.floor(tokenCount * 0.7),
            total_tokens: tokenCount,
            cost_usd: estimatedCost,
            latency_ms: latency,
            finish_reason: 'stop'
          });

          // Send final event with output ID
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              isComplete: true,
              outputId: output?.id,
              totalTokens: tokenCount,
              cost: estimatedCost
            })}\n\n`)
          );

          controller.close();

        } catch (error: any) {
          console.error('[Stream Error]:', error);

          const errorData = JSON.stringify({
            error: error.message,
            isComplete: true
          });

          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    });

  } catch (error: any) {
    console.error('[Stream Setup Error]:', error);
    return new Response(error.message, { status: 500 });
  }
}
```

### 6.3 Analytics Endpoint

```typescript
// app/api/analytics/usage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const projectId = searchParams.get('projectId');

    // Calculate date range
    const daysMap = { '24h': 1, '7d': 7, '30d': 30 };
    const days = daysMap[timeframe] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Base query
    let query = supabase
      .from('llm_usage_logs')
      .select('*, projects!inner(user_id)')
      .eq('projects.user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: logs } = await query;

    if (!logs) {
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Aggregate data
    const providerCosts = logs.reduce((acc, log) => {
      acc[log.provider] = (acc[log.provider] || 0) + log.cost_usd;
      return acc;
    }, {} as Record<string, number>);

    const modelCosts = logs.reduce((acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + log.cost_usd;
      return acc;
    }, {} as Record<string, number>);

    const agentCosts = logs.reduce((acc, log) => {
      acc[log.agent_type] = (acc[log.agent_type] || 0) + log.cost_usd;
      return acc;
    }, {} as Record<string, number>);

    const dailyCosts = logs.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + log.cost_usd;
      return acc;
    }, {} as Record<string, number>);

    const totalCost = logs.reduce((sum, log) => sum + log.cost_usd, 0);
    const totalTokens = logs.reduce((sum, log) => sum + log.total_tokens, 0);
    const totalRequests = logs.length;
    const avgLatency = logs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / totalRequests;
    const cacheHitRate = logs.filter(log => log.cached).length / totalRequests;

    // Most expensive prompts
    const expensivePrompts = logs
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, 10)
      .map(log => ({
        agentType: log.agent_type,
        provider: log.provider,
        model: log.model,
        cost: log.cost_usd,
        tokens: log.total_tokens,
        timestamp: log.created_at
      }));

    return NextResponse.json({
      summary: {
        totalCost,
        totalTokens,
        totalRequests,
        avgLatency: Math.round(avgLatency),
        cacheHitRate: Math.round(cacheHitRate * 100)
      },
      breakdown: {
        byProvider: providerCosts,
        byModel: modelCosts,
        byAgent: agentCosts,
        byDay: dailyCosts
      },
      expensivePrompts
    });

  } catch (error: any) {
    console.error('[Analytics Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 7. n8n Integration Strategy

### 7.1 Current vs New Architecture

**OLD WAY (Direct LLM Calls):**
```
[Webhook Trigger]
    ↓
[LLM Node: Grok API]  ← Hard-coded API key, no fallback
    ↓
[Save to Supabase]
```

**NEW WAY (Via Next.js API):**
```
[Webhook Trigger]
    ↓
[HTTP Request: POST /api/ai/research]  ← Abstraction layer
    ↓                                     ↓
[HTTP Request: POST /api/ai/strategy]   [Automatic fallback]
    ↓                                     [Cost tracking]
[HTTP Request: POST /api/ai/critique]   [Quality scoring]
    ↓                                     [Caching]
[Update Supabase Status]
```

### 7.2 n8n HTTP Request Node Configuration

#### Research Agent

```json
{
  "method": "POST",
  "url": "{{ $env.NEXT_API_URL }}/api/ai/research",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "httpHeaderAuth": {
    "name": "Authorization",
    "value": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
  },
  "body": {
    "projectId": "{{ $node['Webhook'].json['projectId'] }}",
    "brief": "{{ $node['Webhook'].json['brief'] }}"
  },
  "options": {
    "timeout": 60000
  }
}
```

#### Strategy Agent (with Error Handling)

```json
{
  "nodes": [
    {
      "name": "Generate Strategy",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "{{ $env.NEXT_API_URL }}/api/ai/strategy",
        "body": {
          "projectId": "{{ $node['Research'].json['projectId'] }}",
          "researchData": "{{ $node['Research'].json['content'] }}"
        },
        "timeout": 90000
      }
    },
    {
      "name": "Handle Error",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "if ($input.item.json.error) {\n  // Retry or notify\n  return { error: $input.item.json.error };\n}\nreturn $input.item.json;"
      }
    }
  ]
}
```

### 7.3 Workflow Checkpointing

```typescript
// Add to n8n workflow: Save state after each step

// After Research completes:
await supabase
  .from('workflow_checkpoints')
  .insert({
    project_id: projectId,
    step: 'research_complete',
    data: { researchOutputId },
    timestamp: new Date()
  });

// To resume from checkpoint:
const { data: checkpoint } = await supabase
  .from('workflow_checkpoints')
  .select('*')
  .eq('project_id', projectId)
  .order('timestamp', { ascending: false })
  .limit(1)
  .single();

// Start from last completed step
if (checkpoint.step === 'research_complete') {
  // Skip research, start at strategy
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// lib/ai/__tests__/manager.test.ts

import { LLMProviderManager } from '../manager';
import { MockGrokProvider, MockClaudeProvider } from './mocks';
import { CircuitBreaker } from '../circuit-breaker';
import { ResponseCache } from '../cache';
import { CostTracker } from '../cost-tracker';

describe('LLMProviderManager', () => {
  let manager: LLMProviderManager;
  let grokProvider: MockGrokProvider;
  let claudeProvider: MockClaudeProvider;

  beforeEach(() => {
    grokProvider = new MockGrokProvider();
    claudeProvider = new MockClaudeProvider();

    manager = new LLMProviderManager({
      providers: new Map([
        ['grok', grokProvider],
        ['claude', claudeProvider]
      ]),
      fallbackChain: ['grok', 'claude'],
      circuitBreakers: new Map([
        ['grok', new CircuitBreaker()],
        ['claude', new CircuitBreaker()]
      ]),
      costTracker: new CostTracker(),
      cache: new ResponseCache('memory', 100)
    });
  });

  describe('Provider Selection', () => {
    it('should use preferred provider when specified', async () => {
      const result = await manager.generate(
        { prompt: 'test' },
        { preferredProvider: 'grok' }
      );

      expect(result.provider).toBe('grok');
      expect(grokProvider.generate).toHaveBeenCalled();
    });

    it('should use first provider in fallback chain when no preference', async () => {
      const result = await manager.generate({ prompt: 'test' });

      expect(result.provider).toBe('grok');
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to next provider on failure', async () => {
      // Make Grok fail
      grokProvider.generate = jest.fn().mockRejectedValue(new Error('API down'));

      const result = await manager.generate(
        { prompt: 'test' },
        { enableFallback: true }
      );

      expect(result.provider).toBe('claude');
      expect(claudeProvider.generate).toHaveBeenCalled();
    });

    it('should throw if all providers fail', async () => {
      grokProvider.generate = jest.fn().mockRejectedValue(new Error('Grok down'));
      claudeProvider.generate = jest.fn().mockRejectedValue(new Error('Claude down'));

      await expect(
        manager.generate({ prompt: 'test' }, { enableFallback: true })
      ).rejects.toThrow('All providers failed');
    });

    it('should not fallback if disabled', async () => {
      grokProvider.generate = jest.fn().mockRejectedValue(new Error('API down'));

      await expect(
        manager.generate({ prompt: 'test' }, { enableFallback: false })
      ).rejects.toThrow('API down');

      expect(claudeProvider.generate).not.toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    it('should skip provider when circuit is open', async () => {
      const breaker = manager['circuitBreakers'].get('grok');

      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        breaker?.recordFailure();
      }

      expect(breaker?.isOpen()).toBe(true);

      // Should skip Grok and use Claude
      const result = await manager.generate(
        { prompt: 'test' },
        { enableFallback: true }
      );

      expect(result.provider).toBe('claude');
      expect(grokProvider.generate).not.toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should return cached response', async () => {
      const firstCall = await manager.generate(
        { prompt: 'test' },
        { cacheKey: 'test-key' }
      );

      // Second call should be cached
      const secondCall = await manager.generate(
        { prompt: 'test' },
        { cacheKey: 'test-key' }
      );

      expect(secondCall.metadata?.cached).toBe(true);
      expect(grokProvider.generate).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Budget Limits', () => {
    it('should reject if exceeds budget', async () => {
      await expect(
        manager.generate(
          { prompt: 'test', maxTokens: 10000 },
          { budgetLimit: 0.01 } // Very low budget
        )
      ).rejects.toThrow('exceeds budget');
    });
  });

  describe('Retries', () => {
    it('should retry with exponential backoff', async () => {
      let attempts = 0;
      grokProvider.generate = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return { content: 'success', provider: 'grok' };
      });

      const result = await manager.generate(
        { prompt: 'test' },
        { maxRetries: 3 }
      );

      expect(attempts).toBe(3);
      expect(result.content).toBe('success');
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// app/api/ai/__tests__/research.test.ts

import { POST } from '../research/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

describe('/api/ai/research', () => {
  beforeEach(() => {
    // Mock Supabase client
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'project-123',
            user_id: 'user-123'
          }
        }),
        insert: jest.fn().mockReturnThis()
      })
    });
  });

  it('should generate research output', async () => {
    const request = new Request('http://localhost/api/ai/research', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-123',
        brief: 'Rebrand Denon for Gen Z audiophiles'
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.content).toBeDefined();
    expect(data.metadata.provider).toMatch(/grok|claude/);
    expect(data.metadata.cost).toBeLessThan(1); // Under $1
  });

  it('should reject if project not found', async () => {
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      })
    });

    const request = new Request('http://localhost/api/ai/research', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'nonexistent',
        brief: 'Test'
      })
    });

    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it('should enforce budget limits', async () => {
    // Mock high existing cost
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { cost_usd: 5 },
              { cost_usd: 5 }
            ]
          })
        }),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'project-123',
            user_id: 'user-123'
          }
        })
      })
    });

    const request = new Request('http://localhost/api/ai/research', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-123',
        brief: 'Test'
      })
    });

    const response = await POST(request as any);
    expect(response.status).toBe(429); // Too Many Requests
  });
});
```

### 8.3 End-to-End Test

```typescript
// e2e/full-workflow.test.ts

import { test, expect } from '@playwright/test';

test.describe('Full Rebrand Workflow', () => {
  test('should complete research → strategy → critique flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Create new project
    await page.goto('/dashboard');
    await page.click('text=New Project');

    // Fill brief
    await page.fill('[name="brief"]', `
      Rebrand Denon for Gen Z audiophiles.
      - Target audience: 18-25 year olds
      - Budget: $500k
      - Timeline: 6 months
    `);

    await page.click('button:has-text("Run Workflow")');

    // Wait for research to complete
    await expect(page.locator('text=Research: Complete')).toBeVisible({
      timeout: 60000
    });

    // Check research output
    const researchOutput = await page.textContent('[data-section="research"]');
    expect(researchOutput).toContain('market');
    expect(researchOutput).toContain('Gen Z');

    // Wait for strategy
    await expect(page.locator('text=Strategy: Complete')).toBeVisible({
      timeout: 90000
    });

    const strategyOutput = await page.textContent('[data-section="strategy"]');
    expect(strategyOutput).toContain('brand');
    expect(strategyOutput).toContain('positioning');

    // Wait for critique
    await expect(page.locator('text=Critique: Complete')).toBeVisible({
      timeout: 60000
    });

    // Check total cost
    const cost = await page.textContent('[data-testid="total-cost"]');
    expect(parseFloat(cost.replace('$', ''))).toBeLessThan(5); // Under $5

    // Check quality score
    const quality = await page.textContent('[data-testid="quality-score"]');
    expect(parseInt(quality)).toBeGreaterThan(60); // Above threshold
  });
});
```

---

## 9. Analytics & Monitoring

### 9.1 Real-time Dashboard

**Frontend Component:**

```typescript
// app/dashboard/analytics/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');

  useEffect(() => {
    fetch(`/api/analytics/usage?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(setData);
  }, [timeframe]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">AI Usage Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Cost</p>
          <p className="text-3xl font-bold">${data.summary.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Requests</p>
          <p className="text-3xl font-bold">{data.summary.totalRequests}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Avg Latency</p>
          <p className="text-3xl font-bold">{data.summary.avgLatency}ms</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Cache Hit Rate</p>
          <p className="text-3xl font-bold">{data.summary.cacheHitRate}%</p>
        </div>
      </div>

      {/* Cost by Provider */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Cost by Provider</h2>
        <Bar
          data={{
            labels: Object.keys(data.breakdown.byProvider),
            datasets: [{
              label: 'Cost (USD)',
              data: Object.values(data.breakdown.byProvider),
              backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981']
            }]
          }}
        />
      </div>

      {/* Daily Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Daily Cost Trend</h2>
        <Line
          data={{
            labels: Object.keys(data.breakdown.byDay),
            datasets: [{
              label: 'Cost (USD)',
              data: Object.values(data.breakdown.byDay),
              borderColor: '#3b82f6',
              fill: false
            }]
          }}
        />
      </div>

      {/* Expensive Prompts */}
      <div className="bg-white p-6 rounded-lg shadow mt-8">
        <h2 className="text-xl font-bold mb-4">Most Expensive Prompts</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-2">Agent</th>
              <th>Provider</th>
              <th>Model</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.expensivePrompts.map((prompt, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{prompt.agentType}</td>
                <td>{prompt.provider}</td>
                <td>{prompt.model}</td>
                <td>{prompt.tokens.toLocaleString()}</td>
                <td>${prompt.cost.toFixed(3)}</td>
                <td>{new Date(prompt.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 9.2 Provider Health Monitoring

```typescript
// lib/ai/health-monitor.ts

import { createClient } from '@/lib/supabase/server';
import { ProviderHealth } from './types';

export class ProviderHealthMonitor {
  async checkHealth(provider: string): Promise<ProviderHealth> {
    const supabase = createClient();

    // Get recent logs for this provider (last 1 hour)
    const { data: logs } = await supabase
      .from('llm_usage_logs')
      .select('*')
      .eq('provider', provider)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000));

    if (!logs || logs.length === 0) {
      return {
        provider,
        status: 'unknown',
        errorRate: 0,
        avgLatencyMs: 0,
        lastChecked: new Date()
      };
    }

    const totalRequests = logs.length;
    const errors = logs.filter(log => log.finish_reason === 'error').length;
    const errorRate = errors / totalRequests;
    const avgLatency = logs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / totalRequests;

    let status: 'healthy' | 'degraded' | 'down';
    if (errorRate > 0.5) status = 'down';
    else if (errorRate > 0.2 || avgLatency > 10000) status = 'degraded';
    else status = 'healthy';

    const health: ProviderHealth = {
      provider,
      status,
      errorRate: Math.round(errorRate * 100) / 100,
      avgLatencyMs: Math.round(avgLatency),
      lastError: logs.find(log => log.finish_reason === 'error')?.error_message,
      lastChecked: new Date()
    };

    // Save to database
    await supabase.from('provider_health').upsert(health);

    return health;
  }

  async checkAllProviders(): Promise<ProviderHealth[]> {
    const providers = ['grok', 'claude', 'openai'];
    return Promise.all(providers.map(p => this.checkHealth(p)));
  }
}
```

---

## 10. Deployment Guide

### 10.1 Environment Variables

```bash
# .env.production

# LLM Providers
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxx (optional)

# Provider Toggles
ENABLE_GROK=true
ENABLE_CLAUDE=true
ENABLE_OPENAI=false

# Fallback Chain (comma-separated)
FALLBACK_CHAIN=grok,claude

# Task Routing
RESEARCH_PROVIDER=grok
STRATEGY_PROVIDER=claude
CRITIQUE_PROVIDER=grok

# Budget Limits (USD)
MAX_PROJECT_BUDGET=10
MAX_USER_BUDGET=100
MAX_DAILY_BUDGET=500

# Caching
ENABLE_CACHE=true
CACHE_PROVIDER=memory  # or 'redis' for production
CACHE_TTL=3600
REDIS_URL=redis://...  (if using Redis)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Integration
NEXT_API_URL=https://your-app.vercel.app

# Rate Limits
GROK_RPM=60
GROK_TPM=100000
CLAUDE_RPM=50
CLAUDE_TPM=80000
```

### 10.2 Vercel Deployment

```json
// vercel.json
{
  "env": {
    "GROK_API_KEY": "@grok-api-key",
    "ANTHROPIC_API_KEY": "@anthropic-api-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  },
  "functions": {
    "app/api/ai/**/*.ts": {
      "maxDuration": 60,
      "memory": 512
    },
    "app/api/ai/stream/*.ts": {
      "maxDuration": 120
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

**Deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Set secrets
vercel secrets add grok-api-key "xai-..."
vercel secrets add anthropic-api-key "sk-ant-..."
vercel secrets add supabase-service-role-key "eyJ..."

# Deploy
vercel --prod
```

### 10.3 Supabase Setup

```bash
# Install Supabase CLI
npm i -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Verify tables
supabase db inspect
```

### 10.4 n8n Configuration

```bash
# Set environment variable in n8n
NEXT_API_URL=https://your-app.vercel.app

# Update all HTTP Request nodes:
# URL: {{ $env.NEXT_API_URL }}/api/ai/research
```

---

## 11. Future Enhancements

### 11.1 Advanced Features

1. **Fine-tuned Models**
   - Train custom models on your strategy outputs
   - Use for specific clients or industries
   - Lower cost + higher quality

2. **Multi-Agent Debate**
   - Run 3 parallel agents with different perspectives
   - Synthesize best ideas from all
   - Higher quality at 2-3x cost

3. **Voice Input**
   - Strategists dictate briefs
   - Whisper API for transcription
   - Faster input, better UX

4. **Visual Analysis**
   - Upload brand logos, competitor ads
   - Analyze with GPT-4 Vision or Claude
   - Include visual insights in strategy

5. **Real-time Collaboration**
   - Multiple strategists edit together
   - Cursor positions, live updates
   - Comments and suggestions

### 11.2 Scaling Improvements

1. **Redis Caching**
   - Replace memory cache with Redis
   - Shared across all instances
   - Better hit rate

2. **Background Workers**
   - Move LLM calls to queue (BullMQ/Celery)
   - Process async, non-blocking
   - Better scalability

3. **CDN for Outputs**
   - Cache generated outputs on Cloudflare
   - Faster delivery, lower DB load

4. **Auto-scaling**
   - Monitor queue depth
   - Spin up workers dynamically
   - Cost-efficient scaling

### 11.3 Cost Optimizations

1. **Semantic Caching**
   - Use embeddings to match similar prompts
   - Cache fuzzy matches
   - 70%+ hit rate vs 50% exact match

2. **Prompt Compression**
   - Remove unnecessary words
   - Use abbreviations
   - 20-30% token savings

3. **Model Routing by Complexity**
   - Simple prompts → cheap models
   - Complex → premium models
   - Auto-detect complexity

4. **Batch Processing**
   - Group similar requests
   - Send in one API call
   - Volume discounts

### 11.4 Quality Improvements

1. **Human-in-the-Loop**
   - Strategist reviews before final delivery
   - Edits feed back into training
   - Continuous improvement

2. **A/B Testing Framework**
   - Test prompt variations
   - Measure quality metrics
   - Auto-select best prompts

3. **Fine-tuning Loop**
   - Collect high-rated outputs
   - Fine-tune custom models
   - Improve over time

4. **Ensemble Methods**
   - Combine multiple LLM outputs
   - Vote on best results
   - Higher quality, higher cost

---

## Appendix: Prompt Templates

### Research Agent Prompt

```typescript
// lib/ai/prompts/research.ts

export const RESEARCH_PROMPT = {
  version: '1.0',
  system: `You are an expert market researcher and brand strategist specializing in rebranding projects.

Your role is to analyze brand briefs and produce comprehensive market research that covers:
1. Market landscape and competitive analysis
2. Target audience insights and behaviors
3. Industry trends and emerging opportunities
4. Cultural context and brand perception

Be thorough, data-driven, and strategic. Cite sources when possible.`,

  user: (brief: string) => `Analyze this brand brief and produce a comprehensive research report:

${brief}

Structure your response as:

## Market Landscape
- Current market size and growth
- Key competitors and their positioning
- Market gaps and opportunities

## Target Audience Analysis
- Demographics and psychographics
- Behaviors and preferences
- Pain points and desires

## Industry Trends
- Emerging trends relevant to this brand
- Cultural shifts
- Technology impacts

## Brand Perception
- Current brand awareness
- Competitor perceptions
- Opportunities for differentiation

Provide actionable insights that will inform the rebrand strategy.`,

  config: {
    temperature: 0.3,
    maxTokens: 1500
  }
};
```

### Strategy Generation Prompt

```typescript
// lib/ai/prompts/strategy.ts

export const STRATEGY_PROMPT = {
  version: '1.0',
  system: `You are a senior brand strategist with expertise in rebrand positioning.

Your role is to transform research insights into concrete rebrand strategies that include:
1. Brand purpose and positioning
2. Target audience definition
3. Key messaging pillars
4. Differentiation strategy

Be creative yet grounded in research. Think long-term brand building.`,

  user: (researchData: string) => `Based on this research, develop a comprehensive rebrand strategy:

${researchData}

Structure your response as:

## Brand Purpose
- Why does this brand exist?
- What transformation does it enable?

## Positioning Statement
- Target audience
- Category
- Point of difference
- Reason to believe

## Messaging Pillars (3-5)
- Key themes to communicate
- Supporting messages for each

## Differentiation Strategy
- How to stand out from competitors
- Unique value propositions

## Activation Plan
- Priority channels
- Key touchpoints
- Measurement approach

Make recommendations specific, actionable, and tied to the research insights.`,

  config: {
    temperature: 0.7,
    maxTokens: 3000
  }
};
```

### Critique Agent Prompt

```typescript
// lib/ai/prompts/critique.ts

export const CRITIQUE_PROMPT = {
  version: '1.0',
  system: `You are a critical brand advisor who identifies risks and opportunities in brand strategies.

Your role is to:
1. Challenge assumptions
2. Identify potential risks
3. Stress-test the strategy
4. Suggest improvements

Be constructively critical. Your goal is to strengthen the strategy, not tear it down.`,

  user: (strategyData: string) => `Critique this rebrand strategy and identify risks/opportunities:

${strategyData}

Structure your response as:

## Strengths
- What's working well
- Strong strategic choices

## Risks & Challenges
- Potential pitfalls
- Market risks
- Execution challenges

## Missed Opportunities
- What could be stronger
- Unexplored angles

## Recommendations
- Specific improvements
- Alternative approaches to consider

## Red Flags (if any)
- Major concerns
- Deal-breakers

Be honest and rigorous. This critique will be used to refine the strategy.`,

  config: {
    temperature: 0.5,
    maxTokens: 2000
  }
};
```

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Oct 24, 2025 | Initial comprehensive architecture document | AI Architecture Team |

---

**End of Document**
