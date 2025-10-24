# API Quick Reference Card

## 📡 Base URL
```
Development: http://localhost:3000
Production: https://your-app.vercel.app
```

## 🔐 Authentication
All endpoints require Bearer token in header:
```
Authorization: Bearer YOUR_SUPABASE_TOKEN
```

---

## 🎯 Endpoints

### 1. Research Agent
```http
POST /api/ai/research
```

**Body:**
```json
{
  "projectId": "uuid",
  "brief": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "outputId": "uuid",
  "content": "research output...",
  "metadata": {
    "provider": "grok",
    "model": "grok-2-latest",
    "cost": 0.45,
    "tokensUsed": 3500,
    "latencyMs": 2300,
    "cached": false,
    "budgetRemaining": {
      "project": 9.55,
      "user": 49.55
    }
  }
}
```

**Errors:**
- `400` - Missing projectId or brief
- `401` - Unauthorized (no token)
- `403` - Forbidden (not project owner)
- `429` - Budget exceeded
- `500` - Server error

---

### 2. Strategy Agent
```http
POST /api/ai/strategy
```

**Body:**
```json
{
  "projectId": "uuid",
  "researchData": "string"
}
```

**Response:** Same as Research

**Uses:** Claude by default (premium model)

---

### 3. Critique Agent
```http
POST /api/ai/critique
```

**Body:**
```json
{
  "projectId": "uuid",
  "strategyData": "string"
}
```

**Response:** Same as Research

**Note:** Marks project as "completed" (final step)

---

### 4. Streaming
```http
POST /api/ai/stream
```

**Body:**
```json
{
  "projectId": "uuid",
  "task": "research|strategy|critique",
  "prompt": "string",
  "systemPrompt": "string" (optional)
}
```

**Response:** `200 OK` - Server-Sent Events
```
Content-Type: text/event-stream

data: {"content":"This","isComplete":false,"tokensSoFar":1}

data: {"content":" is","isComplete":false,"tokensSoFar":2}

data: {"isComplete":true,"outputId":"uuid","totalTokens":3500,"cost":0.45}
```

**Client Example:**
```typescript
const response = await fetch('/api/ai/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ projectId, task, prompt }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data.content);
      if (data.isComplete) break;
    }
  }
}
```

---

### 5. Analytics
```http
GET /api/analytics/usage?timeframe=7d&projectId=uuid
```

**Query Params:**
- `timeframe` - `24h | 7d | 30d` (required)
- `projectId` - Filter by project (optional)

**Response:** `200 OK`
```json
{
  "timeframe": "7d",
  "generated_at": "2025-10-24T...",
  "summary": {
    "total_cost": 25.45,
    "total_requests": 150,
    "avg_latency": 2300,
    "cache_hit_rate": 0.35,
    "error_rate": 0.02
  },
  "breakdown": {
    "by_provider": {
      "grok": 12.30,
      "claude": 10.15,
      "openai": 3.00
    },
    "by_model": { ... },
    "by_agent": { ... },
    "by_day": { ... }
  },
  "expensive_prompts": [
    {
      "id": "uuid",
      "agent_type": "strategy",
      "provider": "claude",
      "cost": 1.27,
      "tokens": 8500
    }
  ]
}
```

---

## 💰 Budget Limits

- **Per Project:** $10.00
- **Per User (30 days):** $50.00
- **Per Request:** $2.00

All limits are enforced before LLM calls.

---

## ⚡ Provider Routing

| Agent | Default Provider | Model | Reason |
|-------|-----------------|-------|--------|
| Research | Grok | grok-2-latest | Cost-effective |
| Strategy | Claude | claude-3-5-sonnet | High quality |
| Critique | Claude | claude-3-5-sonnet | Analytical |

**Fallback Chain:** Grok → Claude → OpenAI

---

## 🔄 Response Caching

Enabled by default with SHA-256 cache keys:
- **TTL:** 1 hour
- **Cache Key:** `{task}:{sha256(input)}`
- **Response includes:** `metadata.cached: true`

Saves ~50% on costs for similar briefs.

---

## 🛡️ Error Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request (missing fields) |
| `401` | Unauthorized (no auth token) |
| `403` | Forbidden (not project owner) |
| `404` | Not Found (project doesn't exist) |
| `429` | Too Many Requests (budget exceeded) |
| `500` | Internal Server Error |

---

## 🧪 Quick Test

```bash
# Set env vars
export API_URL="http://localhost:3000"
export SUPABASE_TOKEN="your-token"
export PROJECT_ID="your-project-id"

# Test research
curl -X POST $API_URL/api/ai/research \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "brief": "Test brief"
  }'
```

---

## 📊 Monitoring

Check provider health:
```sql
SELECT * FROM provider_health;
```

Check recent usage:
```sql
SELECT * FROM llm_usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

Check budget:
```sql
SELECT * FROM project_budgets
WHERE project_id = 'your-project-id';
```

---

## 🔧 Configuration

**File:** `/lib/ai/config.ts`

Update routing, budgets, timeouts:
```typescript
export const AI_CONFIG = {
  routing: {
    research: {
      provider: 'grok',
      model: 'default',
      temperature: 0.7,
      maxTokens: 4000,
    },
  },
  budgets: {
    perProject: 10.0,
    perUser: 50.0,
  },
  // ...
};
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.4",
    "next": "16.0.0"
  }
}
```

---

## 🚀 Deployment

1. Deploy migration:
   ```bash
   supabase db push
   ```

2. Set env vars in Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   GROK_API_KEY
   ANTHROPIC_API_KEY
   OPENAI_API_KEY
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Update n8n:
   ```
   NEXT_API_URL=https://your-app.vercel.app
   ```

---

**Last Updated:** October 24, 2025
**Agent:** Backend API Developer (Agent 4)
