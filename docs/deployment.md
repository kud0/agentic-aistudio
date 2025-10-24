# AI Provider Deployment Guide

Complete step-by-step guide to deploying the AI Provider system to production.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Vercel Deployment](#vercel-deployment)
4. [Supabase Setup](#supabase-setup)
5. [n8n Configuration](#n8n-configuration)
6. [Environment Secrets](#environment-secrets)
7. [Database Migrations](#database-migrations)
8. [Testing Deployment](#testing-deployment)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Vercel (Frontend + API Routes)             │
│  - Next.js App                               │
│  - AI Provider Manager                       │
│  - API Endpoints (/api/ai/*)                 │
└────────────┬────────────────────────────────┘
             │
             ├─────────────────┐
             │                 │
             ▼                 ▼
┌────────────────────┐  ┌────────────────────┐
│  Supabase (DB)     │  │  n8n (Workflows)   │
│  - PostgreSQL      │  │  - Self-hosted or  │
│  - Auth            │  │  - n8n Cloud       │
│  - Storage         │  └────────────────────┘
└────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│  AI Providers (External APIs)              │
│  - Grok (X.AI)                              │
│  - Claude (Anthropic)                       │
│  - OpenAI (Optional)                        │
└────────────────────────────────────────────┘
```

### Deployment Checklist

- [ ] Vercel project created
- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] Environment variables configured
- [ ] n8n instance deployed
- [ ] n8n workflows imported
- [ ] API keys secured
- [ ] DNS configured
- [ ] SSL certificates active
- [ ] Monitoring enabled
- [ ] Backup strategy implemented

---

## Prerequisites

### Required Accounts

1. **Vercel Account** (free tier works)
   - Sign up: https://vercel.com/signup
   - Install CLI: `npm i -g vercel`

2. **Supabase Account** (free tier works)
   - Sign up: https://supabase.com/dashboard
   - Create new project

3. **AI Provider Accounts**
   - Grok: https://x.ai/api
   - Anthropic: https://console.anthropic.com
   - OpenAI (optional): https://platform.openai.com

4. **n8n Account** (self-hosted or cloud)
   - Self-hosted: https://docs.n8n.io/hosting/
   - Cloud: https://n8n.io/cloud/

### Required Tools

```bash
# Install Vercel CLI
npm install -g vercel

# Install Supabase CLI
npm install -g supabase

# Install n8n CLI (for self-hosted)
npm install -g n8n

# Verify installations
vercel --version
supabase --version
n8n --version
```

---

## Vercel Deployment

### Step 1: Prepare Your Project

```bash
# Clone your repository
git clone https://github.com/your-org/strategist-agent.git
cd strategist-agent

# Install dependencies
npm install

# Build locally to verify
npm run build
```

### Step 2: Configure Vercel

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "GROK_API_KEY": "@grok-api-key",
    "ANTHROPIC_API_KEY": "@anthropic-api-key"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Authorization,Content-Type" }
      ]
    }
  ]
}
```

### Step 3: Deploy to Vercel

**Option 1: CLI Deployment**

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add GROK_API_KEY production
vercel env add ANTHROPIC_API_KEY production

# Deploy to production
vercel --prod
```

**Option 2: GitHub Integration**

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard
5. Click "Deploy"

### Step 4: Configure Environment Variables in Vercel Dashboard

Go to: Project Settings → Environment Variables

Add these variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Production |
| `GROK_API_KEY` | `xai-...` | Production |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production |
| `OPENAI_API_KEY` | `sk-...` | Production (optional) |
| `ENABLE_GROK` | `true` | Production |
| `ENABLE_CLAUDE` | `true` | Production |
| `ENABLE_OPENAI` | `false` | Production |
| `FALLBACK_CHAIN` | `grok,claude,openai` | Production |
| `BUDGET_PER_PROJECT` | `10` | Production |
| `BUDGET_PER_USER` | `100` | Production |
| `CACHE_ENABLED` | `true` | Production |
| `CACHE_PROVIDER` | `supabase` | Production |
| `NODE_ENV` | `production` | Production |

### Step 5: Verify Deployment

```bash
# Get deployment URL
vercel ls

# Test API endpoint
curl https://your-app.vercel.app/api/health

# Expected response:
# { "status": "ok", "timestamp": "..." }
```

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in details:
   - **Name:** `strategist-agent-prod`
   - **Database Password:** Generate strong password
   - **Region:** Choose closest to your users
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### Step 2: Get Credentials

Go to: Project Settings → API

Copy these values:
- **Project URL:** `https://xxx.supabase.co`
- **Anon/Public Key:** `eyJhbGc...`
- **Service Role Key:** `eyJhbGc...` (keep secret!)

### Step 3: Enable Required Extensions

Go to: Database → Extensions

Enable:
- [x] `pg_vector` (for semantic caching)
- [x] `uuid-ossp` (for UUID generation)

### Step 4: Configure Authentication

Go to: Authentication → Providers

Enable:
- [x] Email (default)
- [ ] Google (optional)
- [ ] GitHub (optional)

Go to: Authentication → Email Templates

Customize:
- Confirmation email
- Password reset email
- Magic link email

### Step 5: Set Up Row-Level Security (RLS)

RLS is automatically enabled by the migration scripts.

Verify in: Authentication → Policies

You should see policies for:
- `projects` table
- `outputs` table
- `llm_usage_logs` table
- `quality_scores` table

---

## Database Migrations

### Step 1: Install Supabase CLI

```bash
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 2: Create Migration Files

Create `supabase/migrations/20251024000001_ai_provider_schema.sql`:

```sql
-- AI Provider Schema Migration

-- LLM usage tracking
CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  provider TEXT NOT NULL,
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

CREATE INDEX idx_llm_usage_project ON llm_usage_logs(project_id);
CREATE INDEX idx_llm_usage_user ON llm_usage_logs(user_id);
CREATE INDEX idx_llm_usage_created ON llm_usage_logs(created_at);
CREATE INDEX idx_llm_usage_provider ON llm_usage_logs(provider);

-- Quality scores
CREATE TABLE IF NOT EXISTS quality_scores (
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
CREATE TABLE IF NOT EXISTS provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  error_rate DECIMAL(5, 2) DEFAULT 0,
  avg_latency_ms INTEGER,
  last_error TEXT,
  last_success_at TIMESTAMP,
  last_checked TIMESTAMP DEFAULT NOW(),
  circuit_breaker_state TEXT DEFAULT 'closed' CHECK (circuit_breaker_state IN ('closed', 'open', 'half-open'))
);

-- Response cache
CREATE TABLE IF NOT EXISTS response_cache (
  cache_key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  ttl INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  hits INTEGER DEFAULT 0
);

CREATE INDEX idx_cache_created ON response_cache(created_at);

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM response_cache
  WHERE created_at + (ttl || ' seconds')::interval < NOW();
END;
$$ LANGUAGE plpgsql;

-- Views for analytics
CREATE OR REPLACE VIEW user_budgets AS
SELECT
  user_id,
  SUM(cost_usd) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS daily_cost,
  SUM(cost_usd) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly_cost,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly_requests
FROM llm_usage_logs
GROUP BY user_id;

CREATE OR REPLACE VIEW project_costs AS
SELECT
  project_id,
  SUM(cost_usd) AS total_cost,
  SUM(total_tokens) AS total_tokens,
  COUNT(*) AS total_requests,
  MAX(created_at) AS last_request_at
FROM llm_usage_logs
GROUP BY project_id;

-- Row-level security
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON llm_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON llm_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

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

### Step 3: Run Migrations

```bash
# Push migrations to Supabase
supabase db push

# Verify tables were created
supabase db dump --data-only > verify.sql

# Or use Supabase Dashboard:
# Database → Tables → Check for new tables
```

### Step 4: Seed Initial Data (Optional)

Create `supabase/seed.sql`:

```sql
-- Seed provider health records
INSERT INTO provider_health (provider, status) VALUES
  ('grok', 'healthy'),
  ('claude', 'healthy'),
  ('openai', 'healthy')
ON CONFLICT (provider) DO NOTHING;
```

Run seed:

```bash
supabase db reset --db-url "postgresql://..."
```

---

## n8n Configuration

### Option 1: n8n Cloud (Recommended for MVP)

1. Sign up: https://n8n.io/cloud/
2. Create new instance
3. Wait for provisioning (2-3 min)
4. Access your n8n at: `https://your-instance.n8n.cloud`

### Option 2: Self-Hosted (Docker)

```bash
# Create docker-compose.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-secure-password
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.yourdomain.com/
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:

# Start n8n
docker-compose up -d

# Verify running
docker ps
curl http://localhost:5678
```

### Step 1: Import Workflows

1. Download workflow templates from `/workflows` directory
2. Go to n8n → Workflows → Import
3. Upload `strategist-agent-workflow.json`
4. Click "Save"

### Step 2: Configure Credentials

Go to: Credentials → Add Credential

**Supabase Credential:**
- Type: HTTP Header Auth
- Name: `Authorization`
- Value: `Bearer YOUR_SERVICE_ROLE_KEY`

**Next.js API Credential:**
- Type: HTTP Header Auth
- Name: `Authorization`
- Value: `Bearer YOUR_SERVICE_ROLE_KEY`

### Step 3: Update HTTP Request Nodes

For each HTTP Request node:

1. **Research Agent Node:**
   - URL: `https://your-app.vercel.app/api/ai/research`
   - Method: `POST`
   - Body: `{{ $json }}`
   - Timeout: `60000`

2. **Strategy Agent Node:**
   - URL: `https://your-app.vercel.app/api/ai/strategy`
   - Method: `POST`
   - Body: `{{ $json }}`
   - Timeout: `90000`

3. **Critique Agent Node:**
   - URL: `https://your-app.vercel.app/api/ai/critique`
   - Method: `POST`
   - Body: `{{ $json }}`
   - Timeout: `60000`

### Step 4: Test Workflow

1. Click "Execute Workflow"
2. Use test data:
   ```json
   {
     "projectId": "test-project-id",
     "brief": "Test brief for eco-friendly sneakers"
   }
   ```
3. Verify all nodes execute successfully
4. Check Supabase for logged data

### Step 5: Enable Webhook Trigger

1. Activate workflow
2. Copy webhook URL: `https://your-n8n.cloud/webhook/strategist-agent`
3. Test webhook:
   ```bash
   curl -X POST https://your-n8n.cloud/webhook/strategist-agent \
     -H "Content-Type: application/json" \
     -d '{
       "projectId": "550e8400...",
       "brief": "Launch campaign..."
     }'
   ```

---

## Environment Secrets

### Securing Secrets

**Never commit:**
- API keys
- Database passwords
- Service role keys
- Private keys

**Use:**
- Vercel Environment Variables
- GitHub Secrets (for CI/CD)
- 1Password/Vault (for team sharing)

### Rotating Secrets

**Monthly rotation schedule:**

1. **Week 1:** Generate new keys
2. **Week 2:** Add new keys to Vercel (without removing old)
3. **Week 3:** Update all services to use new keys
4. **Week 4:** Remove old keys from Vercel

**Rotation script:**

```bash
#!/bin/bash

# rotate-secrets.sh

echo "🔄 Rotating API secrets..."

# Generate new Supabase service key
NEW_SERVICE_KEY=$(supabase projects api-keys create --project-ref $PROJECT_ID)

# Update Vercel
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< $NEW_SERVICE_KEY

# Update n8n (manual step)
echo "⚠️  Manually update n8n credentials with: $NEW_SERVICE_KEY"

# Trigger redeploy
vercel --prod

echo "✅ Rotation complete"
```

---

## Testing Deployment

### Health Check

```bash
# Test API health
curl https://your-app.vercel.app/api/health

# Expected:
# { "status": "ok", "timestamp": "2025-10-24T..." }
```

### End-to-End Test

```bash
# 1. Create test project in Supabase (via app UI)

# 2. Test research endpoint
curl -X POST https://your-app.vercel.app/api/ai/research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "brief": "Test brief for deployment verification"
  }'

# 3. Verify response
# Should return: { "success": true, "outputId": "...", "content": "..." }

# 4. Check Supabase
# - Verify `outputs` table has new entry
# - Verify `llm_usage_logs` table has new entry

# 5. Test analytics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.vercel.app/api/analytics/usage?timeframe=24h
```

### Load Testing

```bash
# Install k6
brew install k6

# Create load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,        // 10 virtual users
  duration: '30s', // 30 seconds
};

export default function() {
  const url = 'https://your-app.vercel.app/api/ai/research';
  const payload = JSON.stringify({
    projectId: 'test-id',
    brief: 'Load test brief'
  });

  const params = {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 10s': (r) => r.timings.duration < 10000,
  });

  sleep(1);
}

# Run load test
k6 run load-test.js
```

---

## Monitoring & Alerts

### Vercel Analytics

1. Go to: Vercel Dashboard → Analytics
2. Monitor:
   - Request count
   - Error rate
   - P95 latency
   - Bandwidth usage

### Supabase Monitoring

1. Go to: Supabase → Reports
2. Monitor:
   - Database CPU
   - Database memory
   - Connection pool
   - Storage usage

### Custom Monitoring

**Create `/api/metrics` endpoint:**

```typescript
// app/api/metrics/route.ts

export async function GET() {
  const supabase = createClient()

  // Get key metrics
  const { data: logs } = await supabase
    .from('llm_usage_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 3600000)) // Last hour

  const totalCost = logs?.reduce((sum, log) => sum + log.cost_usd, 0) || 0
  const avgLatency = logs?.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / (logs?.length || 1)

  return Response.json({
    hourly_cost: totalCost,
    hourly_requests: logs?.length || 0,
    avg_latency_ms: Math.round(avgLatency),
    error_count: logs?.filter(l => l.finish_reason === 'error').length || 0
  })
}
```

**Set up alerts (Vercel Monitoring or external):**

```javascript
// Monitor costs
if (hourly_cost > 5) {
  sendAlert('High hourly cost: $' + hourly_cost)
}

// Monitor errors
if (error_count > 10) {
  sendAlert('High error count: ' + error_count)
}
```

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear Vercel cache
vercel --force

# Rebuild
npm run build

# Redeploy
vercel --prod
```

### Issue: Database connection errors

**Solution:**
```bash
# Check Supabase status
curl https://your-project.supabase.co

# Verify connection string
psql "postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"

# Check RLS policies
# Disable temporarily to test:
ALTER TABLE llm_usage_logs DISABLE ROW LEVEL SECURITY;
```

### Issue: n8n webhook not triggering

**Solution:**
```bash
# Test webhook directly
curl -X POST https://your-n8n.cloud/webhook/test \
  -d '{"test": "data"}'

# Check n8n logs
docker logs n8n_container_id

# Verify workflow is active
# n8n UI → Workflows → Check "Active" toggle
```

### Issue: High latency

**Solution:**
```typescript
// Enable caching
cache: {
  enabled: true,
  provider: 'supabase',
  ttl: 3600
}

// Use faster models
routing: {
  research: {
    model: 'fast'
  }
}

// Add CDN (Vercel Edge)
// next.config.js
module.exports = {
  experimental: {
    edge: true
  }
}
```

---

## Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard:
# Deployments → Select previous → Promote to Production
```

### Database Rollback

```bash
# List migrations
supabase db diff

# Rollback last migration
supabase db reset

# Or create down migration
# supabase/migrations/20251024000002_rollback_ai_provider.sql
DROP TABLE llm_usage_logs;
DROP TABLE quality_scores;
DROP TABLE provider_health;
DROP TABLE response_cache;
```

### n8n Workflow Rollback

1. Go to: Workflows → History
2. Select previous version
3. Click "Restore"
4. Save and activate

---

## Post-Deployment Checklist

- [ ] All endpoints return 200 status
- [ ] Authentication works correctly
- [ ] Database writes succeed
- [ ] n8n workflow completes successfully
- [ ] Costs are being tracked
- [ ] Analytics dashboard shows data
- [ ] Monitoring alerts configured
- [ ] Backup schedule created
- [ ] Documentation updated with production URLs
- [ ] Team trained on deployment process

---

## Next Steps

1. Set up continuous deployment (GitHub Actions)
2. Configure staging environment
3. Implement feature flags
4. Create runbooks for common issues
5. Schedule weekly cost reviews

---

## Support

- **Deployment Issues:** devops@strategistagent.com
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **n8n Community:** https://community.n8n.io
