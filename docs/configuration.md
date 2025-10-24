# AI Provider Configuration Guide

Complete guide to configuring the AI Provider system, including environment variables, provider settings, task routing, and optimization strategies.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Provider Configuration](#provider-configuration)
3. [Task Routing](#task-routing)
4. [Budget Management](#budget-management)
5. [Caching Strategy](#caching-strategy)
6. [Fallback Chain](#fallback-chain)
7. [Advanced Settings](#advanced-settings)
8. [How to Swap Providers](#how-to-swap-providers)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## Environment Variables

### Required Variables

Create a `.env.local` file in your project root with these variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI Provider API Keys
GROK_API_KEY=your-grok-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OPENAI_API_KEY=your-openai-api-key-here  # Optional

# Provider Enablement (true/false)
ENABLE_GROK=true
ENABLE_CLAUDE=true
ENABLE_OPENAI=false

# API Configuration
NEXT_API_URL=http://localhost:3000  # Development
# NEXT_API_URL=https://your-app.vercel.app  # Production

# Node Environment
NODE_ENV=development  # or 'production'
```

### Optional Variables

```bash
# Fallback Chain (comma-separated provider names)
FALLBACK_CHAIN=grok,claude,openai
DEFAULT_PROVIDER=grok

# Budget Limits (in USD)
BUDGET_PER_PROJECT=10
BUDGET_PER_USER=100
BUDGET_PER_REQUEST=1

# Cache Configuration
CACHE_ENABLED=true
CACHE_PROVIDER=memory  # or 'supabase'
CACHE_TTL=3600  # seconds (1 hour)
CACHE_MAX_SIZE=100  # max entries for memory cache

# Timeout Settings (milliseconds)
TIMEOUT_RESEARCH=60000
TIMEOUT_STRATEGY=90000
TIMEOUT_CRITIQUE=60000
TIMEOUT_STREAMING=120000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_CONCURRENT=5

# Circuit Breaker Settings
CIRCUIT_BREAKER_THRESHOLD=5  # failures before opening
CIRCUIT_BREAKER_TIMEOUT=60000  # ms before half-open
CIRCUIT_BREAKER_RESET_TIME=300000  # ms before closing

# Logging & Monitoring
LOG_LEVEL=info  # debug, info, warn, error
ENABLE_COST_TRACKING=true
ENABLE_QUALITY_SCORING=true
ENABLE_ANALYTICS=true

# n8n Integration
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_API_KEY=your-n8n-api-key
```

---

## Provider Configuration

### Provider Settings File

Create `lib/ai/config.ts` to centralize configuration:

```typescript
// lib/ai/config.ts

export const AI_CONFIG = {
  // Available providers
  providers: {
    grok: {
      enabled: process.env.ENABLE_GROK === 'true',
      apiKey: process.env.GROK_API_KEY,
      baseUrl: 'https://api.x.ai/v1',
      models: {
        default: 'grok-2-latest',
        premium: 'grok-2-latest',
        fast: 'grok-2-mini' // If available
      },
      pricing: {
        'grok-2-latest': {
          input: 5.0,   // $ per 1M tokens
          output: 15.0  // $ per 1M tokens
        }
      },
      limits: {
        maxTokens: 32768,
        requestsPerMinute: 60,
        tokensPerMinute: 200000
      }
    },

    claude: {
      enabled: process.env.ENABLE_CLAUDE === 'true',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1',
      models: {
        default: 'claude-3-5-sonnet-20241022',
        premium: 'claude-3-opus-20240229',
        fast: 'claude-3-5-haiku-20241022'
      },
      pricing: {
        'claude-3-5-sonnet-20241022': {
          input: 3.0,
          output: 15.0
        },
        'claude-3-opus-20240229': {
          input: 15.0,
          output: 75.0
        },
        'claude-3-5-haiku-20241022': {
          input: 1.0,
          output: 5.0
        }
      },
      limits: {
        maxTokens: 200000,
        requestsPerMinute: 50,
        tokensPerMinute: 160000
      }
    },

    openai: {
      enabled: process.env.ENABLE_OPENAI === 'true',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      models: {
        default: 'gpt-4-turbo',
        premium: 'gpt-4-turbo',
        fast: 'gpt-3.5-turbo'
      },
      pricing: {
        'gpt-4-turbo': {
          input: 10.0,
          output: 30.0
        },
        'gpt-3.5-turbo': {
          input: 0.5,
          output: 1.5
        }
      },
      limits: {
        maxTokens: 128000,
        requestsPerMinute: 500,
        tokensPerMinute: 160000
      }
    }
  },

  // Fallback chain (order matters!)
  fallbackChain: (process.env.FALLBACK_CHAIN || 'grok,claude,openai')
    .split(',')
    .map(p => p.trim()),

  // Default provider
  defaultProvider: process.env.DEFAULT_PROVIDER || 'grok',

  // Budget limits
  budgets: {
    perProject: parseFloat(process.env.BUDGET_PER_PROJECT || '10'),
    perUser: parseFloat(process.env.BUDGET_PER_USER || '100'),
    perRequest: parseFloat(process.env.BUDGET_PER_REQUEST || '1')
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    provider: process.env.CACHE_PROVIDER || 'memory',
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100')
  },

  // Timeouts (milliseconds)
  timeouts: {
    research: parseInt(process.env.TIMEOUT_RESEARCH || '60000'),
    strategy: parseInt(process.env.TIMEOUT_STRATEGY || '90000'),
    critique: parseInt(process.env.TIMEOUT_CRITIQUE || '60000'),
    streaming: parseInt(process.env.TIMEOUT_STREAMING || '120000')
  },

  // Task-specific routing
  routing: {
    research: {
      provider: 'grok',
      model: 'default',
      temperature: 0.7,
      maxTokens: 8000,
      enableFallback: true
    },
    strategy: {
      provider: 'claude',
      model: 'default',
      temperature: 0.8,
      maxTokens: 12000,
      enableFallback: true
    },
    critique: {
      provider: 'claude',
      model: 'fast',  // Use cheaper model
      temperature: 0.5,
      maxTokens: 6000,
      enableFallback: true
    }
  },

  // Circuit breaker settings
  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
    resetTime: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIME || '300000')
  },

  // Feature flags
  features: {
    costTracking: process.env.ENABLE_COST_TRACKING !== 'false',
    qualityScoring: process.env.ENABLE_QUALITY_SCORING !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    streaming: true,
    caching: true
  }
}
```

---

## Task Routing

Route different tasks to optimal providers based on cost, quality, or speed.

### Strategy 1: Cost Optimization

**Goal:** Minimize costs while maintaining quality

```typescript
export const COST_OPTIMIZED_ROUTING = {
  research: {
    provider: 'grok',           // $5/1M tokens (cheaper)
    model: 'default',
    temperature: 0.7,
    maxTokens: 8000
  },
  strategy: {
    provider: 'claude',         // $3/1M input (best balance)
    model: 'default',
    temperature: 0.8,
    maxTokens: 12000
  },
  critique: {
    provider: 'claude',         // Use fast model
    model: 'fast',              // Haiku = $1/1M tokens
    temperature: 0.5,
    maxTokens: 6000
  }
}

// Expected cost per project: $0.08-0.15
```

### Strategy 2: Quality Optimization

**Goal:** Best possible outputs, cost secondary

```typescript
export const QUALITY_OPTIMIZED_ROUTING = {
  research: {
    provider: 'claude',
    model: 'premium',           // Claude Opus (best reasoning)
    temperature: 0.7,
    maxTokens: 16000
  },
  strategy: {
    provider: 'claude',
    model: 'premium',           // Maximum quality
    temperature: 0.8,
    maxTokens: 20000
  },
  critique: {
    provider: 'claude',
    model: 'default',           // Sonnet (strong analysis)
    temperature: 0.5,
    maxTokens: 8000
  }
}

// Expected cost per project: $0.40-0.80
```

### Strategy 3: Speed Optimization

**Goal:** Fastest time to completion

```typescript
export const SPEED_OPTIMIZED_ROUTING = {
  research: {
    provider: 'openai',
    model: 'fast',              // GPT-3.5 Turbo (fastest)
    temperature: 0.7,
    maxTokens: 6000
  },
  strategy: {
    provider: 'openai',
    model: 'fast',
    temperature: 0.8,
    maxTokens: 8000
  },
  critique: {
    provider: 'claude',
    model: 'fast',              // Haiku (very fast)
    temperature: 0.5,
    maxTokens: 4000
  }
}

// Expected time per project: 10-20 seconds
```

### Strategy 4: Balanced (Recommended)

**Goal:** Best cost/quality/speed tradeoff

```typescript
export const BALANCED_ROUTING = {
  research: {
    provider: 'grok',           // Good quality, good price
    model: 'default',
    temperature: 0.7,
    maxTokens: 8000
  },
  strategy: {
    provider: 'claude',         // Best for creative strategy
    model: 'default',           // Sonnet (sweet spot)
    temperature: 0.8,
    maxTokens: 12000
  },
  critique: {
    provider: 'claude',         // Fast model for critiques
    model: 'fast',              // Haiku
    temperature: 0.5,
    maxTokens: 6000
  }
}

// Expected cost: $0.10-0.20, time: 20-40s
```

### How to Apply Routing Strategies

In `lib/ai/config.ts`:

```typescript
import { BALANCED_ROUTING } from './routing-strategies'

export const AI_CONFIG = {
  // ...
  routing: BALANCED_ROUTING,
  // Or: routing: COST_OPTIMIZED_ROUTING,
  // Or: routing: QUALITY_OPTIMIZED_ROUTING,
  // Or: routing: SPEED_OPTIMIZED_ROUTING,
}
```

---

## Budget Management

### Setting Budget Limits

**Project-Level Budgets:**

```typescript
// In lib/ai/config.ts
budgets: {
  perProject: 10,  // $10 max per project (lifetime)
}

// Check in API route:
const totalCost = await costTracker.getProjectCost(projectId)
if (totalCost >= 10) {
  return NextResponse.json({
    error: 'Project budget exceeded'
  }, { status: 429 })
}
```

**User-Level Budgets:**

```typescript
budgets: {
  perUser: 100,  // $100 max per user per month
}

// Check in API route:
const userCost = await costTracker.getUserCost(userId, 30)
if (userCost >= 100) {
  return NextResponse.json({
    error: 'Monthly budget exceeded'
  }, { status: 429 })
}
```

**Request-Level Budgets:**

```typescript
// Reject requests that would cost >$1
const estimatedCost = provider.estimateCost(maxTokens, model)
if (estimatedCost > 1) {
  throw new Error('Request exceeds per-request budget')
}
```

### Dynamic Budget Allocation

```typescript
// Allocate more budget to high-value projects
const projectTier = project.tier // 'basic', 'premium', 'enterprise'

const budgetMap = {
  basic: 5,
  premium: 20,
  enterprise: 100
}

if (totalCost >= budgetMap[projectTier]) {
  // Budget exceeded for tier
}
```

---

## Caching Strategy

### Memory Cache (Default)

Fast, but limited capacity. Good for development.

```typescript
cache: {
  enabled: true,
  provider: 'memory',
  ttl: 3600,      // 1 hour
  maxSize: 100    // 100 entries max
}
```

### Supabase Cache (Recommended for Production)

Persistent, shared across instances.

```typescript
cache: {
  enabled: true,
  provider: 'supabase',
  ttl: 86400,     // 24 hours
  maxSize: 1000   // Not applicable for Supabase
}

// Requires 'response_cache' table (see schema in architecture doc)
```

### Semantic Caching (Advanced)

Cache based on meaning, not exact match:

```typescript
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'

async function semanticCacheKey(text: string): Promise<string> {
  const embeddings = new OpenAIEmbeddings()
  const vector = await embeddings.embedQuery(text)

  // Find similar cached responses using vector search
  const { data } = await supabase.rpc('match_embeddings', {
    query_embedding: vector,
    match_threshold: 0.85,  // 85% similarity
    match_count: 1
  })

  if (data?.[0]) {
    return data[0].cache_key  // Reuse existing cache
  }

  return createHash('sha256').update(text).digest('hex')
}
```

### Cache Invalidation

```typescript
// Clear all cache
await cache.clear()

// Clear specific keys
await cache.delete('research:abc123...')

// Clear by pattern (Supabase)
await supabase
  .from('response_cache')
  .delete()
  .like('cache_key', 'research:%')
```

---

## Fallback Chain

### How Fallback Works

```
Request → Grok (fails) → Claude (fails) → OpenAI (succeeds) → Response
```

### Configuring Fallback Order

```typescript
// In .env.local
FALLBACK_CHAIN=grok,claude,openai

// Or in config:
fallbackChain: ['grok', 'claude', 'openai']
```

### Fallback Strategies

**1. Cost-Based Fallback (Cheap → Expensive)**

```typescript
fallbackChain: ['grok', 'claude', 'openai']
// Try cheapest first, use expensive as last resort
```

**2. Quality-Based Fallback (Best → Good)**

```typescript
fallbackChain: ['claude', 'grok', 'openai']
// Try best model first, degrade if necessary
```

**3. Speed-Based Fallback (Fast → Slower)**

```typescript
fallbackChain: ['openai', 'claude', 'grok']
// Try fastest provider first
```

### Disabling Fallback

```typescript
// Per request:
await manager.generate(params, {
  preferredProvider: 'grok',
  enableFallback: false  // Fail if Grok fails
})

// Globally (not recommended):
routing: {
  research: {
    provider: 'grok',
    enableFallback: false
  }
}
```

### Circuit Breaker Integration

Automatically skip failing providers:

```typescript
circuitBreaker: {
  threshold: 5,       // Open after 5 consecutive failures
  timeout: 60000,     // Stay open for 60s
  resetTime: 300000   // Fully reset after 5 minutes
}

// Circuit states:
// - Closed: Normal operation
// - Open: Skip provider (triggered after 5 failures)
// - Half-Open: Try 1 request to test recovery
```

---

## Advanced Settings

### Retry Logic

```typescript
// In manager.ts
async executeWithRetry(
  provider: LLMProvider,
  params: GenerateParams,
  maxRetries: number = 3,
  timeout?: number
): Promise<LLMResponse> {
  let lastError: Error | null = null
  let delay = 1000 // Start with 1s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        provider.generate(params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout || 60000)
        )
      ])

      return response as LLMResponse

    } catch (error: any) {
      lastError = error
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message)

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }

  throw lastError || new Error('All retries failed')
}
```

### Custom Temperature by Task

```typescript
routing: {
  research: {
    temperature: 0.7,  // Balanced
  },
  strategy: {
    temperature: 0.9,  // More creative
  },
  critique: {
    temperature: 0.3,  // More focused/deterministic
  }
}
```

### Token Limits by Task Complexity

```typescript
routing: {
  research: {
    maxTokens: 8000,   // Moderate length
  },
  strategy: {
    maxTokens: 16000,  // Long, detailed strategy
  },
  critique: {
    maxTokens: 4000,   // Short, focused critique
  }
}
```

---

## How to Swap Providers

### Method 1: Environment Variables (Easiest)

```bash
# .env.local

# Disable Grok, enable Claude
ENABLE_GROK=false
ENABLE_CLAUDE=true

# Update fallback chain
FALLBACK_CHAIN=claude,openai
DEFAULT_PROVIDER=claude
```

No code changes needed. Restart the app.

### Method 2: Config File

```typescript
// lib/ai/config.ts

routing: {
  research: {
    provider: 'claude',  // Changed from 'grok'
    model: 'default',
  },
  strategy: {
    provider: 'claude',  // Already Claude
    model: 'default',
  },
  critique: {
    provider: 'claude',  // Changed from 'claude' fast to default
    model: 'default',
  }
}
```

### Method 3: Runtime Override

```typescript
// In your API route or frontend
const response = await manager.generate(params, {
  preferredProvider: 'claude',  // Override config
  enableFallback: false
})
```

### Method 4: Feature Flags (Recommended for Production)

Use a feature flag service (LaunchDarkly, Flagsmith):

```typescript
import { getFeatureFlag } from '@/lib/feature-flags'

const preferredProvider = await getFeatureFlag('ai-provider', 'grok')

routing: {
  research: {
    provider: preferredProvider,
    // ...
  }
}
```

---

## Performance Tuning

### Optimize for Latency

```typescript
// Use faster models
routing: {
  research: {
    model: 'fast',  // Haiku, GPT-3.5, etc.
  }
}

// Reduce max tokens
routing: {
  research: {
    maxTokens: 4000,  // Halve generation time
  }
}

// Enable streaming
// Users see output immediately, perceived latency drops
```

### Optimize for Cost

```typescript
// Use cheaper providers
fallbackChain: ['grok', 'claude', 'openai'],

// Enable aggressive caching
cache: {
  enabled: true,
  ttl: 86400,  // 24 hours
}

// Use cheaper models for less critical tasks
routing: {
  critique: {
    model: 'fast',  // Haiku = 80% cheaper than Sonnet
  }
}
```

### Optimize for Quality

```typescript
// Use best models
routing: {
  research: {
    provider: 'claude',
    model: 'premium',  // Claude Opus
  }
}

// Increase max tokens
routing: {
  research: {
    maxTokens: 20000,  // More detailed output
  }
}

// Higher temperature for creativity
routing: {
  strategy: {
    temperature: 0.95,
  }
}
```

---

## Troubleshooting

### Issue: "Provider API key not found"

**Solution:**

```bash
# Check .env.local has the key
GROK_API_KEY=xai-...

# Verify it's loaded
console.log(process.env.GROK_API_KEY)  // Should not be undefined

# Restart dev server
npm run dev
```

### Issue: "Budget exceeded immediately"

**Solution:**

```typescript
// Check existing costs
const cost = await costTracker.getProjectCost(projectId)
console.log('Current cost:', cost)

// Increase budget if needed
budgets: {
  perProject: 20,  // Increased from 10
}
```

### Issue: "All providers failing"

**Solution:**

```bash
# Check provider health
curl https://api.x.ai/v1/chat/completions # Test Grok
curl https://api.anthropic.com/v1/messages # Test Claude

# Check circuit breaker state
const health = await manager.getProviderHealth()
console.log(health)  // { grok: 'open', claude: 'open' }

# Reset circuit breakers
await manager.resetCircuitBreakers()
```

### Issue: "Streaming not working"

**Solution:**

```typescript
// Ensure headers are correct
headers: {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
}

// Disable buffering (nginx/Vercel)
'X-Accel-Buffering': 'no'

// Check browser console for CORS errors
// Add to next.config.js:
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ]
}
```

### Issue: "Cache not working"

**Solution:**

```typescript
// Verify cache is enabled
console.log(AI_CONFIG.cache.enabled)  // true

// Check cache hits
const response = await manager.generate(params, {
  cacheKey: 'test-key'
})
console.log(response.metadata.cached)  // Should be true on 2nd call

// Clear cache if stale
await cache.clear()
```

---

## Next Steps

1. Review [API Usage Guide](./api-usage.md) for implementation examples
2. Read [Deployment Guide](./deployment.md) for production setup
3. Monitor costs with [Analytics Dashboard](./analytics.md)

---

## Support

- **Configuration Issues:** support@strategistagent.com
- **GitHub Discussions:** https://github.com/your-org/strategist-agent/discussions
- **Documentation:** https://docs.strategistagent.com
