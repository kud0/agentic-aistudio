# Performance Optimization Recommendations
## AI Provider Architecture - Performance Review

**Date:** October 24, 2025
**Reviewer:** Agent 8 (Code Reviewer & Optimizer)
**Status:** BLOCKED - No Implementation to Benchmark

---

## Executive Summary

**Status:** ❌ **CANNOT BENCHMARK - No implementation exists**

Performance review requires actual code to measure and optimize. This document provides:
1. Performance targets based on architecture design
2. Optimization strategies to implement during development
3. Benchmarking plan for when code is ready

---

## Performance Targets

### API Response Time Targets

| Endpoint | Target (p50) | Target (p95) | Target (p99) |
|----------|--------------|--------------|--------------|
| `/api/ai/research` | <8s | <15s | <30s |
| `/api/ai/strategy` | <5s | <10s | <20s |
| `/api/ai/critique` | <3s | <6s | <12s |
| `/api/ai/stream` (first token) | <500ms | <1s | <2s |
| `/api/analytics/usage` | <200ms | <500ms | <1s |

**Status:** ❌ CANNOT MEASURE - No endpoints exist

### Database Query Targets

| Query Type | Target Latency |
|------------|----------------|
| Single row lookup | <10ms |
| Analytics aggregation | <100ms |
| Full-text search | <200ms |
| Join queries | <50ms |

**Status:** ❌ CANNOT MEASURE - No queries exist

### Provider Latency Targets

| Provider | Model | Target (First Token) | Target (Complete) |
|----------|-------|---------------------|-------------------|
| Grok | grok-2-latest | <800ms | <8s |
| Claude | claude-3-5-sonnet | <600ms | <6s |
| OpenAI | gpt-4-turbo | <700ms | <7s |

**Status:** ❌ CANNOT MEASURE - No provider integration exists

### Caching Targets

| Metric | Target |
|--------|--------|
| Cache hit rate | >40% |
| Cache lookup latency | <5ms |
| Cost savings from cache | >30% |
| Cache memory usage | <500MB |

**Status:** ❌ CANNOT MEASURE - No cache implemented

---

## Database Optimization

### Index Strategy

#### Required Indexes (Not Yet Created)

```sql
-- llm_usage_logs table
CREATE INDEX idx_llm_logs_project_created
  ON llm_usage_logs(project_id, created_at DESC);

CREATE INDEX idx_llm_logs_user_created
  ON llm_usage_logs(user_id, created_at DESC);

CREATE INDEX idx_llm_logs_provider_model
  ON llm_usage_logs(provider, model);

-- quality_scores table
CREATE INDEX idx_quality_flagged_created
  ON quality_scores(flag_for_review, scored_at DESC)
  WHERE flag_for_review = TRUE;

-- response_cache table (partial index for active cache)
CREATE INDEX idx_cache_active
  ON response_cache(cache_key, expires_at)
  WHERE expires_at > NOW();

-- provider_health table
CREATE INDEX idx_provider_status
  ON provider_health(provider, status, updated_at DESC);
```

**Impact:**
- Analytics queries: 10-100x faster
- Cache lookups: 5-10x faster
- Dashboard loads: 50% faster

**Status:** ❌ NOT CREATED - No migrations exist

### Query Optimization

#### Anti-Pattern: N+1 Queries

```typescript
// ❌ BAD: N+1 query problem
const projects = await supabase.from('projects').select('*');
for (const project of projects) {
  const usage = await supabase
    .from('llm_usage_logs')
    .select('*')
    .eq('project_id', project.id);
  project.usage = usage;
}

// ✅ GOOD: Single query with join
const projects = await supabase
  .from('projects')
  .select(`
    *,
    usage:llm_usage_logs(*)
  `);
```

**Status:** ❌ CANNOT VERIFY - No query code exists

#### Use Materialized Views for Analytics

```sql
-- Expensive analytics query (runs in 2-5 seconds)
SELECT
  provider,
  DATE(created_at) as date,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency,
  COUNT(*) as request_count
FROM llm_usage_logs
GROUP BY provider, DATE(created_at);

-- ✅ OPTIMIZED: Create materialized view (refreshed hourly)
CREATE MATERIALIZED VIEW daily_provider_stats AS
SELECT
  provider,
  DATE(created_at) as date,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency,
  COUNT(*) as request_count
FROM llm_usage_logs
GROUP BY provider, DATE(created_at);

-- Refresh every hour (can be done via cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_provider_stats;
```

**Impact:** Analytics dashboard 20-50x faster (5s → 100ms)

**Status:** ❌ NOT CREATED

### Connection Pooling

```typescript
// ✅ Use Supabase connection pooler for high-traffic
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    global: {
      // Use connection pooler for better performance
      fetch: (...args) => fetch(...args)
    }
  }
);
```

**Status:** ❌ CANNOT VERIFY - No Supabase client configuration exists

---

## Caching Strategy

### Response Cache Design

```typescript
// lib/ai/cache.ts (NOT YET IMPLEMENTED)

export interface CacheConfig {
  /** Cache storage (memory, redis, supabase) */
  storage: 'memory' | 'redis' | 'supabase';

  /** Default TTL in seconds */
  defaultTTL: number;

  /** Max cache size (MB) */
  maxSize: number;

  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new Map();
  }

  /**
   * Generate cache key from prompt (deterministic hash)
   */
  generateKey(params: GenerateParams): string {
    // Use fast hashing (e.g., FNV-1a or xxHash)
    const normalized = JSON.stringify({
      prompt: params.prompt.trim().toLowerCase(),
      systemPrompt: params.systemPrompt?.trim(),
      temperature: params.temperature,
      model: params.model
    });
    return this.hashString(normalized);
  }

  /**
   * Fast string hashing (FNV-1a)
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) +
              (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  async get(key: string): Promise<LLMResponse | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Track hit
    entry.hits++;

    return entry.response;
  }

  async set(
    key: string,
    response: LLMResponse,
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    // LRU eviction if cache full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      response,
      expiresAt: Date.now() + (ttl * 1000),
      hits: 0,
      createdAt: Date.now()
    });
  }

  private evictOldest(): void {
    // Find least recently used
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalHits = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalSize += JSON.stringify(entry.response).length;
    }

    return {
      size: this.cache.size,
      totalHits,
      hitRate: totalHits / (totalHits + 1), // Approximate
      memoryUsageMB: totalSize / (1024 * 1024)
    };
  }
}
```

**Expected Performance:**
- Cache lookup: <5ms
- Hit rate: 40-60% (varies by use case)
- Cost savings: 30-50%

**Status:** ❌ NOT IMPLEMENTED

### Semantic Caching (Future Enhancement)

```typescript
/**
 * Semantic caching: Find similar prompts using embeddings
 *
 * Example:
 * - "Analyze Apple Inc"
 * - "Research Apple Company"
 * → Same intent, reuse cached response
 */
export class SemanticCache extends ResponseCache {
  private embeddings: Map<string, number[]>;

  async getSimilar(
    prompt: string,
    threshold: number = 0.85
  ): Promise<LLMResponse | null> {
    const embedding = await this.generateEmbedding(prompt);

    // Find most similar cached prompt
    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    for (const [key, cachedEmbedding] of this.embeddings.entries()) {
      const similarity = this.cosineSimilarity(embedding, cachedEmbedding);
      if (similarity > threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = key;
      }
    }

    if (bestMatch) {
      return this.get(bestMatch);
    }

    return null;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use cheap embedding model (e.g., text-embedding-3-small)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

**Expected Impact:**
- Cache hit rate: 40% → 60-70%
- Additional cost savings: 20-30%
- Latency overhead: ~50ms for embedding

**Status:** ❌ FUTURE ENHANCEMENT (Post-MVP)

---

## Provider Performance Optimization

### Parallel Provider Health Checks

```typescript
// ❌ BAD: Sequential health checks (slow)
async function checkProviderHealth() {
  const grokHealth = await checkGrok();
  const claudeHealth = await checkClaude();
  const openaiHealth = await checkOpenAI();
  return { grokHealth, claudeHealth, openaiHealth };
}

// ✅ GOOD: Parallel health checks
async function checkProviderHealth() {
  const [grokHealth, claudeHealth, openaiHealth] = await Promise.all([
    checkGrok(),
    checkClaude(),
    checkOpenAI()
  ]);
  return { grokHealth, claudeHealth, openaiHealth };
}
```

**Impact:** Health checks 3x faster (3s → 1s)

**Status:** ❌ CANNOT VERIFY - No health check code exists

### Request Deduplication

```typescript
/**
 * Deduplicate identical in-flight requests
 *
 * Scenario: 5 users submit identical prompts within 100ms
 * Without dedup: 5 LLM calls ($0.50)
 * With dedup: 1 LLM call ($0.10), others wait for result
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<LLMResponse>>;

  constructor() {
    this.pending = new Map();
  }

  async dedupe(
    key: string,
    fn: () => Promise<LLMResponse>
  ): Promise<LLMResponse> {
    // Check if identical request in flight
    if (this.pending.has(key)) {
      console.log(`[Dedup] Reusing in-flight request: ${key}`);
      return this.pending.get(key)!;
    }

    // Start new request
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}
```

**Expected Savings:** 10-20% in high-concurrency scenarios

**Status:** ❌ NOT IMPLEMENTED

### Streaming Optimization

```typescript
/**
 * Optimized streaming implementation
 */
async function* streamResponse(
  provider: LLMProvider,
  params: GenerateParams
): AsyncGenerator<LLMChunk> {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  let buffer = '';

  for await (const chunk of provider.stream(params)) {
    // Track time to first token
    if (!firstTokenTime) {
      firstTokenTime = Date.now();
      console.log(`First token: ${firstTokenTime - startTime}ms`);
    }

    // Buffer small chunks (reduce overhead)
    buffer += chunk.content;

    // Yield buffered content every 50 chars or complete
    if (buffer.length >= 50 || chunk.isComplete) {
      yield {
        content: buffer,
        isComplete: chunk.isComplete
      };
      buffer = '';
    }
  }
}
```

**Impact:**
- Reduced network overhead: 30-50%
- Perceived latency: 40% improvement
- Client-side rendering: Smoother UX

**Status:** ❌ NOT IMPLEMENTED

---

## API Route Optimization

### Middleware Optimization

```typescript
// Use lightweight middleware stack
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();

  // 1. FAST PATH: Check if request needs auth
  if (!request.url.includes('/api/ai/')) {
    return NextResponse.next();
  }

  // 2. Verify JWT (cached for 5 minutes)
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Validate token (use in-memory cache for recent tokens)
  const user = await verifyToken(token); // <-- Should be cached
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 4. Add user to request context
  const response = NextResponse.next();
  response.headers.set('X-User-ID', user.id);

  const latency = Date.now() - startTime;
  console.log(`Middleware latency: ${latency}ms`);

  return response;
}
```

**Target Middleware Latency:** <10ms

**Status:** ❌ NOT IMPLEMENTED

### Response Compression

```typescript
// Enable gzip compression for large responses
export async function POST(req: Request) {
  const response = await generateResponse(req);

  // Compress if response > 1KB
  if (response.content.length > 1024) {
    return new Response(
      response.content,
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip'
        }
      }
    );
  }

  return Response.json(response);
}
```

**Impact:** 60-80% smaller payloads, 30-50% faster transfer

**Status:** ❌ NOT IMPLEMENTED

---

## Memory Optimization

### Avoid Memory Leaks

```typescript
// ❌ BAD: Global cache grows unbounded
const globalCache = new Map();

// ✅ GOOD: LRU cache with size limit
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500, // Max 500 items
  maxSize: 100 * 1024 * 1024, // 100MB max
  sizeCalculation: (value) => JSON.stringify(value).length,
  ttl: 1000 * 60 * 60 // 1 hour TTL
});
```

**Status:** ❌ CANNOT VERIFY - No cache implementation exists

### Stream Processing (Don't Buffer Entire Response)

```typescript
// ❌ BAD: Buffer entire response in memory
async function processLargeOutput(output: string) {
  const chunks = output.split('\n');
  return chunks.map(processChunk);
}

// ✅ GOOD: Stream processing
async function* processLargeOutput(stream: AsyncIterator<string>) {
  for await (const chunk of stream) {
    yield processChunk(chunk);
  }
}
```

**Impact:** 10-100x lower memory usage for large outputs

**Status:** ❌ NOT IMPLEMENTED

---

## Monitoring & Profiling

### Performance Monitoring (To Implement)

```typescript
// lib/ai/monitoring.ts

export class PerformanceMonitor {
  /**
   * Track API endpoint latency
   */
  static async trackEndpoint<T>(
    endpoint: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();

      const latency = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Log to monitoring service (e.g., Vercel Analytics)
      console.log({
        endpoint,
        latency,
        memoryUsed: memoryUsed / (1024 * 1024), // MB
        status: 'success'
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;

      console.error({
        endpoint,
        latency,
        status: 'error',
        error: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Track provider call performance
   */
  static async trackProviderCall(
    provider: string,
    model: string,
    tokensUsed: number,
    latency: number
  ): Promise<void> {
    await supabase.from('provider_metrics').insert({
      provider,
      model,
      tokens_used: tokensUsed,
      latency_ms: latency,
      timestamp: new Date()
    });
  }
}
```

**Status:** ❌ NOT IMPLEMENTED

### Recommended Monitoring Tools

1. **Vercel Analytics** - Built-in (already available)
   - Web Vitals (LCP, FID, CLS)
   - API route latency
   - Edge function performance

2. **Supabase Performance Insights** - Built-in
   - Slow query log
   - Index usage stats
   - Connection pool metrics

3. **Sentry** - Error tracking + performance
   - Real user monitoring (RUM)
   - Transaction tracing
   - Performance regression alerts

4. **Grafana + Prometheus** - Optional (advanced)
   - Custom dashboards
   - Alerting rules
   - Long-term metrics storage

**Status:** ❌ NOT CONFIGURED

---

## Benchmarking Plan

### When Implementation is Ready

#### 1. Load Testing Script

```bash
#!/bin/bash
# load-test.sh

# Test 1: Single user, single request
echo "Test 1: Single request latency"
time curl -X POST http://localhost:3000/api/ai/research \
  -H "Content-Type: application/json" \
  -d '{"projectId":"123","brief":"Test brief"}'

# Test 2: 10 concurrent users
echo "Test 2: 10 concurrent requests"
seq 1 10 | xargs -P 10 -I {} curl -X POST \
  http://localhost:3000/api/ai/research \
  -H "Content-Type: application/json" \
  -d '{"projectId":"{}","brief":"Test brief"}'

# Test 3: Streaming latency
echo "Test 3: Time to first token"
curl -N -X POST http://localhost:3000/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}' | head -n 1
```

#### 2. Artillery Load Test

```yaml
# artillery-load-test.yml
config:
  target: "https://your-app.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 5  # 5 users/sec
      name: "Warm up"
    - duration: 300
      arrivalRate: 20  # 20 users/sec
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50  # 50 users/sec
      name: "Spike test"

scenarios:
  - name: "Research endpoint"
    flow:
      - post:
          url: "/api/ai/research"
          json:
            projectId: "{{ $randomString() }}"
            brief: "Test brief for load testing"
          headers:
            Authorization: "Bearer {{ $env.TEST_JWT_TOKEN }}"
```

Run with:
```bash
artillery run artillery-load-test.yml
```

#### 3. Database Query Profiling

```sql
-- Enable query logging in Supabase
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries >100ms

-- Find slowest queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Unused indexes
ORDER BY pg_size_pretty(pg_relation_size(indexrelid)) DESC;
```

**Status:** ❌ CANNOT RUN - No implementation exists

---

## Performance Budget

### Resource Limits

| Resource | Limit | Current | Status |
|----------|-------|---------|--------|
| API response time (p95) | <15s | ❌ N/A | NOT MEASURED |
| Database query time (p95) | <500ms | ❌ N/A | NOT MEASURED |
| Memory usage per request | <256MB | ❌ N/A | NOT MEASURED |
| Cache size | <500MB | ❌ N/A | NOT MEASURED |
| Concurrent requests | 100 | ❌ N/A | NOT TESTED |

### Cost Budget

| Item | Monthly Budget | Current | Status |
|------|----------------|---------|--------|
| LLM API costs | $1,000 | $0 | ✅ Under budget |
| Database storage | $50 | $0 | ✅ Under budget |
| Vercel hosting | $20 | $20 | ✅ On budget |
| Monitoring tools | $50 | $0 | ❌ Not set up |

---

## Optimization Checklist

### Database
- [ ] Create all recommended indexes
- [ ] Implement connection pooling
- [ ] Set up materialized views for analytics
- [ ] Enable query logging for slow queries
- [ ] Configure auto-vacuum settings

### Caching
- [ ] Implement LRU cache with size limits
- [ ] Set appropriate TTL values
- [ ] Monitor cache hit rates
- [ ] Implement cache warming for common prompts
- [ ] Add semantic caching (post-MVP)

### API Routes
- [ ] Enable response compression
- [ ] Implement request deduplication
- [ ] Optimize middleware stack
- [ ] Add edge caching for static responses
- [ ] Use Vercel Edge Functions where appropriate

### Provider Integration
- [ ] Implement parallel health checks
- [ ] Add request timeouts
- [ ] Implement exponential backoff
- [ ] Use streaming for long responses
- [ ] Batch small requests when possible

### Monitoring
- [ ] Set up Vercel Analytics
- [ ] Configure Sentry for error tracking
- [ ] Add custom performance metrics
- [ ] Create Grafana dashboards (optional)
- [ ] Set up alerting for SLA violations

---

## Conclusion

**Status:** ❌ **BLOCKED - Cannot optimize without implementation**

**Next Steps:**
1. Wait for implementation from Agents 3, 4, 5, 6
2. Run initial benchmarks to establish baseline
3. Implement high-impact optimizations (caching, indexing)
4. Re-benchmark to measure improvements
5. Iterate on low-impact optimizations

**Expected Performance Gains (After Optimization):**
- API latency: 40-60% reduction
- Cache hit rate: 40-60%
- Cost savings: 30-50%
- Concurrent capacity: 10x improvement

**Reviewer:** Agent 8 (Code Reviewer & Optimizer)
**Date:** October 24, 2025
