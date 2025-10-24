# AI Provider API - Usage Guide

Complete guide to using the AI Provider API for generating research, strategy, and critique content.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Endpoints Overview](#endpoints-overview)
4. [Example Requests](#example-requests)
5. [Streaming Responses](#streaming-responses)
6. [Rate Limits & Budgets](#rate-limits--budgets)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [SDK Examples](#sdk-examples)

---

## Quick Start

### 1. Get Your Authentication Token

The API uses Supabase authentication. Get your token from the Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign in to get session
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

const token = session?.access_token
```

### 2. Make Your First Request

```bash
curl -X POST https://api.strategistagent.com/api/ai/research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "brief": "Launch campaign for eco-friendly sneakers targeting Gen Z consumers. Brand values: sustainability, authenticity, innovation."
  }'
```

### 3. Get the Response

```json
{
  "success": true,
  "outputId": "660e8400-e29b-41d4-a716-446655440001",
  "content": "# Market Research Analysis\n\n## Market Insights...",
  "metadata": {
    "provider": "grok",
    "model": "grok-2-latest",
    "cost": 0.0234,
    "cached": false,
    "tokensUsed": 4680
  }
}
```

---

## Authentication

All API endpoints require authentication using Supabase JWT tokens.

### Header Format

```
Authorization: Bearer <YOUR_SUPABASE_TOKEN>
```

### Getting a Token

**Option 1: From Frontend (React/Next.js)**

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

**Option 2: Service Role (Backend/n8n)**

```bash
# Use service role key for server-to-server calls
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Option 3: API Key (For Testing)**

```bash
# For development only - use session tokens in production
curl -H "Authorization: Bearer YOUR_ANON_KEY" ...
```

### Token Expiration

- Session tokens expire after 1 hour
- Refresh tokens automatically in your client
- Use service role key for long-running processes (n8n workflows)

---

## Endpoints Overview

| Endpoint | Method | Purpose | Avg. Time | Avg. Cost |
|----------|--------|---------|-----------|-----------|
| `/api/ai/research` | POST | Market & audience research | 15-30s | $0.02-0.05 |
| `/api/ai/strategy` | POST | Brand strategy generation | 20-40s | $0.03-0.08 |
| `/api/ai/critique` | POST | Quality assessment & critique | 10-20s | $0.01-0.03 |
| `/api/ai/stream` | POST | Real-time streaming (SSE) | 15-30s | $0.02-0.05 |
| `/api/analytics/usage` | GET | Usage analytics & costs | <1s | Free |

---

## Example Requests

### Research Generation

**cURL:**

```bash
curl -X POST https://api.strategistagent.com/api/ai/research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "brief": "Launch a new organic coffee brand targeting health-conscious millennials. Key differentiators: single-origin beans, transparent supply chain, carbon-neutral shipping."
  }'
```

**TypeScript (fetch):**

```typescript
const response = await fetch('https://api.strategistagent.com/api/ai/research', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: '550e8400-e29b-41d4-a716-446655440000',
    brief: 'Launch a new organic coffee brand targeting health-conscious millennials...'
  })
})

const data = await response.json()
console.log(data.content) // Markdown research report
console.log(data.metadata.cost) // e.g., 0.0234
```

**Response:**

```json
{
  "success": true,
  "outputId": "660e8400-e29b-41d4-a716-446655440001",
  "content": "# Market Research Analysis\n\n## Executive Summary\nThe organic coffee market is experiencing 12% annual growth...\n\n## Market Insights\n- Market size: $8.2B (2025)\n- Growth rate: 12% CAGR\n- Key drivers: Health consciousness, sustainability values\n\n## Competitor Analysis\n1. **Blue Bottle Coffee**\n   - Strengths: Premium positioning, retail presence\n   - Weaknesses: High pricing, limited online DTC\n\n2. **Trade Coffee**\n   - Strengths: Subscription model, personalization\n   - Weaknesses: Complex onboarding, brand perception\n\n## Target Audience Profile\n- Age: 28-42\n- Income: $60k-120k\n- Values: Sustainability, transparency, quality\n- Behavior: Regular coffee consumers (2-3 cups/day)\n\n## Recommendations\n1. Position as premium but accessible ($16-22/bag)\n2. Lead with transparency (farm profiles, carbon tracking)\n3. Subscription-first model with flexible options",
  "metadata": {
    "provider": "grok",
    "model": "grok-2-latest",
    "cost": 0.0345,
    "cached": false,
    "tokensUsed": 6900
  }
}
```

---

### Strategy Generation

**TypeScript:**

```typescript
const strategyResponse = await fetch('https://api.strategistagent.com/api/ai/strategy', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: projectId,
    researchData: researchOutput.content // Pass research from previous step
  })
})

const strategy = await strategyResponse.json()
```

**Response Structure:**

```json
{
  "success": true,
  "outputId": "770e8400-e29b-41d4-a716-446655440002",
  "content": "# Brand Strategy Document\n\n## Brand Positioning\n\"Transparent craft coffee for conscious consumers\"...",
  "metadata": {
    "provider": "claude",
    "model": "claude-3-5-sonnet",
    "cost": 0.0567,
    "cached": false,
    "tokensUsed": 11340
  }
}
```

---

### Critique Generation

**TypeScript:**

```typescript
const critiqueResponse = await fetch('https://api.strategistagent.com/api/ai/critique', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: projectId,
    strategyData: strategyOutput.content // Pass strategy from previous step
  })
})

const critique = await critiqueResponse.json()
```

**Response Structure:**

```json
{
  "success": true,
  "outputId": "880e8400-e29b-41d4-a716-446655440003",
  "content": "# Quality Critique\n\n## Overall Assessment\nScore: 85/100\n\n## Strengths\n- Clear positioning statement\n- Well-researched competitive landscape...\n\n## Areas for Improvement\n1. **Messaging Framework**\n   - Current: Generic sustainability claims\n   - Recommended: Specific carbon metrics, farm partnerships\n\n2. **Channel Strategy**\n   - Gap: No TikTok/Instagram Reels strategy for Gen Z...",
  "metadata": {
    "provider": "claude",
    "model": "claude-3-5-sonnet",
    "cost": 0.0189,
    "cached": true,
    "tokensUsed": 3780
  }
}
```

---

## Streaming Responses

For better UX, use the streaming endpoint to show content as it's generated.

### Server-Sent Events (SSE) Example

**TypeScript (Frontend):**

```typescript
async function streamResearch(projectId: string, brief: string) {
  const response = await fetch('https://api.strategistagent.com/api/ai/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      task: 'research',
      prompt: brief,
      systemPrompt: 'You are an expert market researcher.'
    })
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))

        if (data.content) {
          fullContent += data.content
          // Update UI in real-time
          document.getElementById('output')!.textContent = fullContent
        }

        if (data.isComplete) {
          console.log('Stream complete!')
          console.log('Output ID:', data.outputId)
          console.log('Total cost:', data.cost)
          console.log('Total tokens:', data.totalTokens)
        }
      }
    }
  }
}
```

**React Hook Example:**

```typescript
import { useState, useEffect } from 'react'

export function useStreamedGeneration(projectId: string, task: string, prompt: string) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)

  useEffect(() => {
    if (!prompt) return

    setIsLoading(true)
    setContent('')
    setError(null)

    const fetchStream = async () => {
      try {
        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId, task, prompt })
        })

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader!.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))

              if (data.content) {
                setContent(prev => prev + data.content)
              }

              if (data.isComplete) {
                setIsLoading(false)
                setMetadata({
                  outputId: data.outputId,
                  cost: data.cost,
                  totalTokens: data.totalTokens
                })
              }

              if (data.error) {
                setError(data.error)
                setIsLoading(false)
              }
            }
          }
        }
      } catch (err: any) {
        setError(err.message)
        setIsLoading(false)
      }
    }

    fetchStream()
  }, [projectId, task, prompt])

  return { content, isLoading, error, metadata }
}
```

---

## Rate Limits & Budgets

The API enforces cost-based budgets to prevent runaway spending.

### Budget Limits

| Scope | Limit | Reset Period |
|-------|-------|--------------|
| Per Project | $10 | Lifetime |
| Per User | $100 | 30 days (rolling) |
| Per Request | $1 | N/A |

### Budget Exceeded Responses

**Project Budget:**

```json
{
  "error": "Project budget exceeded. Max: $10",
  "totalCost": 10.42
}
```

**User Budget:**

```json
{
  "error": "Monthly budget exceeded. Max: $100",
  "userTotal": 103.56
}
```

### Checking Remaining Budget

```typescript
const analytics = await fetch('/api/analytics/usage?timeframe=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
})

const data = await analytics.json()
console.log('Monthly spend:', data.summary.totalCost)
console.log('Remaining budget:', 100 - data.summary.totalCost)
```

### Rate Limiting

- **Requests per minute:** 60
- **Concurrent requests:** 5
- **Retry after:** 429 responses include `Retry-After` header

**Handling 429 Errors:**

```typescript
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)

    if (response.status !== 429) {
      return response
    }

    const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
    console.log(`Rate limited. Retrying after ${retryAfter}s...`)
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  }

  throw new Error('Max retries exceeded')
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Error message",
  "details": "Stack trace (development only)",
  "totalCost": 10.42,
  "userTotal": 103.56
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes | Action |
|------|---------|---------------|--------|
| 400 | Bad Request | Missing fields, invalid format | Check request body |
| 401 | Unauthorized | Missing/expired token | Re-authenticate |
| 403 | Forbidden | Not project owner | Verify permissions |
| 404 | Not Found | Invalid project ID | Check ID exists |
| 429 | Rate Limit | Budget exceeded, too many requests | Wait or upgrade |
| 500 | Server Error | Provider failure, internal bug | Retry or contact support |

### Comprehensive Error Handling

```typescript
async function generateResearch(projectId: string, brief: string) {
  try {
    const response = await fetch('/api/ai/research', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId, brief })
    })

    // Check for HTTP errors
    if (!response.ok) {
      const error = await response.json()

      switch (response.status) {
        case 400:
          throw new Error(`Invalid request: ${error.error}`)
        case 401:
          // Refresh token and retry
          await refreshSession()
          return generateResearch(projectId, brief)
        case 403:
          throw new Error('You do not have access to this project')
        case 404:
          throw new Error('Project not found')
        case 429:
          if (error.totalCost) {
            throw new Error(`Project budget exceeded: $${error.totalCost}`)
          } else {
            // Rate limit - wait and retry
            await new Promise(r => setTimeout(r, 60000))
            return generateResearch(projectId, brief)
          }
        case 500:
          throw new Error(`Server error: ${error.error}`)
        default:
          throw new Error(`Unexpected error: ${error.error}`)
      }
    }

    const data = await response.json()
    return data

  } catch (error: any) {
    console.error('Research generation failed:', error)

    // Log to error tracking service
    // Sentry.captureException(error)

    throw error
  }
}
```

---

## Best Practices

### 1. Cache Aggressively

The API automatically caches responses. Reuse cache keys for similar requests:

```typescript
import { createHash } from 'crypto'

// Create deterministic cache key
const cacheKey = createHash('sha256')
  .update(brief)
  .digest('hex')

// Same brief = same cache key = cached response (50% cost savings)
```

### 2. Use Streaming for Better UX

```typescript
// Good: Users see progress immediately
<StreamingOutput projectId={id} task="research" prompt={brief} />

// Bad: Users wait 30s staring at loading spinner
await fetch('/api/ai/research', { ... })
```

### 3. Monitor Costs in Real-Time

```typescript
// Check costs before expensive operations
const analytics = await fetch('/api/analytics/usage?projectId=' + id)
const { summary } = await analytics.json()

if (summary.totalCost > 8) {
  alert('Project approaching budget limit!')
}
```

### 4. Implement Exponential Backoff

```typescript
async function fetchWithBackoff(url: string, options: any) {
  let delay = 1000 // Start with 1s

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response

      if (response.status === 429 || response.status >= 500) {
        console.log(`Retry ${attempt}/5 after ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
        delay *= 2 // Exponential backoff
        continue
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (attempt === 5) throw error
    }
  }
}
```

### 5. Handle Provider Failures Gracefully

The API automatically falls back to alternative providers. Trust the system:

```typescript
// ✅ Good: Let the API handle fallback
const result = await fetch('/api/ai/research', { ... })

// ❌ Bad: Don't implement your own provider logic
// if (grokFails) { useClaude() } // API already does this!
```

### 6. Validate Brief Length

```typescript
function validateBrief(brief: string): void {
  if (brief.length < 50) {
    throw new Error('Brief too short. Minimum 50 characters.')
  }

  if (brief.length > 50000) {
    throw new Error('Brief too long. Maximum 50,000 characters.')
  }

  // Estimate tokens (rough: 1 token ≈ 4 chars)
  const estimatedTokens = brief.length / 4
  const estimatedCost = (estimatedTokens / 1_000_000) * 5 // $5/1M tokens

  if (estimatedCost > 0.50) {
    console.warn(`This request may cost ~$${estimatedCost.toFixed(3)}`)
  }
}
```

---

## SDK Examples

### n8n Workflow Node

```json
{
  "name": "Generate Research",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "={{ $env.NEXT_API_URL }}/api/ai/research",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "httpHeaderAuth": {
      "name": "Authorization",
      "value": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
    },
    "body": {
      "projectId": "={{ $json.projectId }}",
      "brief": "={{ $json.brief }}"
    },
    "options": {
      "timeout": 60000,
      "retry": {
        "maxRetries": 3,
        "waitBetweenRetries": 5000
      }
    }
  }
}
```

### Python SDK

```python
import requests

class AIProviderClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def generate_research(self, project_id: str, brief: str):
        response = requests.post(
            f'{self.base_url}/api/ai/research',
            headers=self.headers,
            json={'projectId': project_id, 'brief': brief}
        )
        response.raise_for_status()
        return response.json()

    def get_analytics(self, timeframe='7d', project_id=None):
        params = {'timeframe': timeframe}
        if project_id:
            params['projectId'] = project_id

        response = requests.get(
            f'{self.base_url}/api/analytics/usage',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage
client = AIProviderClient('https://api.strategistagent.com', 'YOUR_TOKEN')
result = client.generate_research('550e8400...', 'Launch campaign for...')
print(result['content'])
```

---

## Support

- **Documentation:** https://docs.strategistagent.com
- **API Status:** https://status.strategistagent.com
- **Support Email:** support@strategistagent.com
- **GitHub Issues:** https://github.com/your-org/strategist-agent/issues

---

## Next Steps

1. Read the [Configuration Guide](./configuration.md) to customize provider settings
2. Review the [Deployment Guide](./deployment.md) for production setup
3. Import [OpenAPI Spec](./api-spec.yaml) into Postman/Swagger for testing
