# AI Provider Architecture - Grok Only Backend

A production-ready AI provider abstraction layer built with **Grok (X.AI)** as the exclusive LLM provider.

## 🚀 Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone <your-repo>
cd agentic-aistudio
npm install

# 2. Set up environment (interactive)
./scripts/setup-env.sh

# 3. Deploy database
./scripts/deploy-db.sh

# 4. Run health check
./scripts/health-check.sh

# 5. Start development
npm run dev
```

Visit: http://localhost:3000

## 📋 Features

### ✅ Completed (Production Ready)

- **Grok Integration** - grok-4-fast-reasoning model
- **Cost Tracking** - Real-time usage monitoring
- **Response Caching** - LRU cache with TTL
- **Circuit Breaker** - Automatic fault tolerance
- **Streaming Support** - Server-Sent Events
- **Supabase Integration** - PostgreSQL with RLS
- **Type Safety** - Full TypeScript coverage
- **72 Unit Tests** - 100% passing
- **Health Monitoring** - Real-time provider status
- **Budget Limits** - Configurable spending caps

### 📊 System Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/SSE
┌──────▼──────────────────────┐
│   Next.js API Routes        │
│  /api/ai/{research,         │
│   strategy,critique,stream} │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   Provider Manager          │
│  • Grok Provider Only       │
│  • Cost Tracking            │
│  • Caching                  │
│  • Circuit Breaker          │
└──────┬──────────────────────┘
       │
┌──────▼────────┐  ┌─────────────┐
│  Grok API     │  │  Supabase   │
│  (X.AI)       │  │  Database   │
└───────────────┘  └─────────────┘
```

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Next.js 15
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **LLM Provider:** Grok (X.AI)
- **Testing:** Jest
- **Deployment:** Vercel (recommended)

## 📦 Project Structure

```
agentic-aistudio/
├── lib/ai/                    # AI provider architecture
│   ├── __tests__/             # Unit tests (72 tests)
│   ├── providers/             # Provider implementations
│   │   └── grok.ts            # Grok provider
│   ├── config.ts              # Configuration (Grok only)
│   ├── cache.ts               # Response caching
│   ├── cost-tracker.ts        # Cost tracking
│   ├── circuit-breaker.ts     # Fault tolerance
│   └── types.ts               # TypeScript types
├── app/api/                   # API routes
│   ├── ai/                    # AI endpoints
│   │   ├── research/          # Research agent
│   │   ├── strategy/          # Strategy agent
│   │   ├── critique/          # Critique agent
│   │   └── stream/            # Streaming endpoint
│   └── analytics/             # Analytics endpoints
├── supabase/migrations/       # Database migrations
│   ├── 001_ai_provider_schema.sql
│   └── 002_auth_policies.sql
├── scripts/                   # Deployment scripts
│   ├── setup-env.sh           # Environment setup
│   ├── deploy-db.sh           # Database deployment
│   ├── health-check.sh        # Health verification
│   └── test-api.sh            # API testing
├── docs/                      # Documentation
│   ├── deployment.md          # Deployment guide
│   └── testing.md             # Testing guide
└── .env.example.grok          # Environment template
```

## 🧪 Testing

### Run Tests

```bash
# All tests (72 tests)
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# API tests
npm run dev
./scripts/test-api.sh
```

### Test Results

```
Test Suites: 4 passed, 4 total
Tests:       72 passed, 72 total
Snapshots:   0 total
Time:        5.3s
```

**Test Coverage:**
- Cache implementation (23 tests)
- Cost tracking (29 tests)
- Circuit breaker (12 tests)
- Provider integration (8 tests)

## 📚 Documentation

- **[Deployment Guide](docs/deployment.md)** - Complete deployment walkthrough
- **[Testing Guide](docs/testing.md)** - Testing strategies and examples
- **[API Documentation](docs/api.md)** - API endpoints and usage (coming soon)

## 🔧 Configuration

### Required Environment Variables

```bash
# Grok API
XAI_API_KEY=your_grok_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Auth
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

### Optional Settings

```bash
# Budget limits (USD)
MAX_COST_PER_PROJECT=10.00
MAX_COST_PER_USER=50.00

# Features
ENABLE_CACHING=true
ENABLE_STREAMING=true
ENABLE_QUALITY_SCORING=true

# Logging
LOG_LEVEL=info
```

See `.env.example.grok` for full configuration options.

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel Dashboard.

### Other Platforms

Supports any Node.js platform:
- Railway
- Render
- Fly.io
- AWS Lambda
- Google Cloud Run

See [Deployment Guide](docs/deployment.md) for details.

## 📊 Cost Tracking

Real-time cost monitoring for all LLM requests:

```typescript
// Automatic tracking
const response = await fetch('/api/ai/research', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Analyze market',
    projectId: 'proj-123'
  })
});

// Get cost analytics
const analytics = await fetch('/api/analytics/cost?projectId=proj-123');
```

**Features:**
- Per-project budgets
- Per-user budgets
- Real-time tracking
- Cost breakdown by model
- Historical analytics

## 🏥 Health Monitoring

```bash
# Automated health check
./scripts/health-check.sh

# Manual check
curl http://localhost:3000/api/health
```

**Checks:**
- Environment variables
- Database connection
- Grok API connectivity
- Circuit breaker status
- Test suite status

## 🔐 Security

- **Row Level Security (RLS)** - Enabled on all tables
- **API Key Rotation** - Recommended every 90 days
- **Rate Limiting** - Built-in circuit breaker
- **Budget Caps** - Prevent runaway costs
- **Environment Secrets** - Never committed to git

## 🐛 Troubleshooting

### Tests Failing

```bash
npm test -- --verbose
```

### Database Connection Issues

```bash
# Check Supabase status
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
```

### Grok API Errors

```bash
# Test API key
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-2-latest","messages":[{"role":"user","content":"hi"}]}'
```

See [Deployment Guide](docs/deployment.md) for more troubleshooting.

## 📈 Performance

### Benchmarks

- **Average Latency:** <2s for non-cached requests
- **Cache Hit Rate:** ~60% after warmup
- **Cost Savings:** ~40% with caching
- **Concurrent Requests:** 100+ simultaneous

### Optimization

- Response caching (1-hour TTL)
- Streaming for long responses
- Circuit breaker prevents cascade failures
- Database connection pooling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [Grok by X.AI](https://x.ai/)
- [Supabase](https://supabase.com/)
- [TypeScript](https://www.typescriptlang.org/)

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Grok API:** [X.AI Docs](https://docs.x.ai)

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Provider:** Grok Only (grok-4-fast-reasoning)
**Tests:** 72/72 passing
**Last Updated:** 2025-10-24
