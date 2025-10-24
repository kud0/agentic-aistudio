# AI Provider API Documentation

Comprehensive documentation for the AI Provider API system.

## 📚 Documentation Files

### 1. [OpenAPI Specification](./api-spec.yaml)
**Format:** OpenAPI 3.0 YAML
**Purpose:** Complete API reference with schemas, examples, and validation
**Use Cases:**
- Import into Swagger UI for interactive documentation
- Generate client SDKs (TypeScript, Python, Go, etc.)
- API testing with Postman
- Contract validation in CI/CD

**Quick Start:**
```bash
# Validate spec
npx @redocly/cli lint docs/api-spec.yaml

# Preview in Swagger UI
npx swagger-ui-watcher docs/api-spec.yaml

# Or use online editor
# https://editor.swagger.io (paste content)
```

---

### 2. [API Usage Guide](./api-usage.md)
**Purpose:** Practical examples and integration patterns
**Covers:**
- Authentication setup
- Request/response examples (cURL, TypeScript, Python)
- Streaming implementation
- Rate limiting & budgets
- Error handling patterns
- Best practices
- n8n integration examples

**Who Should Read:**
- Frontend developers integrating the API
- Backend developers building workflows
- n8n workflow designers

---

### 3. [Configuration Guide](./configuration.md)
**Purpose:** System configuration and optimization
**Covers:**
- Environment variables (required & optional)
- Provider settings (Grok, Claude, OpenAI)
- Task routing strategies (cost, quality, speed)
- Budget management
- Caching strategies
- Fallback chain configuration
- How to swap providers
- Performance tuning

**Who Should Read:**
- DevOps engineers
- System administrators
- Solutions architects
- Performance engineers

---

### 4. [Deployment Guide](./deployment.md)
**Purpose:** Production deployment procedures
**Covers:**
- Vercel deployment (step-by-step)
- Supabase setup & migrations
- n8n configuration (cloud & self-hosted)
- Environment secrets management
- Database schema migration
- Testing deployment
- Monitoring & alerts
- Rollback procedures
- Troubleshooting

**Who Should Read:**
- DevOps engineers
- Platform engineers
- Release managers
- Site reliability engineers (SREs)

---

## 🚀 Quick Start by Role

### Frontend Developer
1. Read: [API Usage Guide](./api-usage.md)
2. Import: [OpenAPI Spec](./api-spec.yaml) into Postman
3. Test: Use Swagger UI for live testing
4. Implement: Copy TypeScript examples from usage guide

### Backend Developer
1. Read: [API Usage Guide](./api-usage.md) → SDK Examples
2. Read: [Configuration Guide](./configuration.md) → Task Routing
3. Configure: Set up environment variables
4. Integrate: Use n8n workflow examples

### DevOps Engineer
1. Read: [Deployment Guide](./deployment.md)
2. Read: [Configuration Guide](./configuration.md) → Environment Variables
3. Set up: Vercel, Supabase, n8n
4. Monitor: Implement monitoring from deployment guide

### Solutions Architect
1. Read: [API Usage Guide](./api-usage.md) → Overview
2. Read: [Configuration Guide](./configuration.md) → Task Routing
3. Review: [OpenAPI Spec](./api-spec.yaml) → Endpoints
4. Design: Choose optimal provider routing strategy

---

## 📖 Documentation Overview

### API Endpoints

| Endpoint | Method | Purpose | Avg. Cost | Avg. Time |
|----------|--------|---------|-----------|-----------|
| `/api/ai/research` | POST | Market research analysis | $0.02-0.05 | 15-30s |
| `/api/ai/strategy` | POST | Brand strategy generation | $0.03-0.08 | 20-40s |
| `/api/ai/critique` | POST | Quality assessment | $0.01-0.03 | 10-20s |
| `/api/ai/stream` | POST | Streaming generation (SSE) | $0.02-0.05 | 15-30s |
| `/api/analytics/usage` | GET | Usage analytics | Free | <1s |

### Key Features

- ✅ **Multi-Provider Support:** Grok, Claude, OpenAI
- ✅ **Automatic Fallback:** Seamless provider switching on failures
- ✅ **Cost Optimization:** Intelligent task routing to optimal models
- ✅ **Real-time Streaming:** Server-Sent Events for live updates
- ✅ **Budget Enforcement:** Per-project and per-user limits
- ✅ **Response Caching:** 50%+ cost savings on similar requests
- ✅ **Quality Scoring:** Automated output validation
- ✅ **Analytics Dashboard:** Comprehensive usage insights

---

## 🛠️ Tools & Resources

### Testing Tools

**Swagger UI (Interactive Documentation):**
```bash
# Install globally
npm install -g swagger-ui-watcher

# Serve documentation locally
swagger-ui-watcher docs/api-spec.yaml

# Opens at http://localhost:3000
```

**Postman Collection:**
```bash
# Import OpenAPI spec to Postman
# 1. Open Postman
# 2. Click "Import"
# 3. Select docs/api-spec.yaml
# 4. Configure environment variables
```

**cURL Testing:**
```bash
# Test research endpoint
curl -X POST https://your-app.vercel.app/api/ai/research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @examples/research-request.json
```

### Code Generation

**TypeScript SDK:**
```bash
# Generate TypeScript client from OpenAPI spec
npx openapi-typescript docs/api-spec.yaml --output src/types/api.ts

# Use in your app
import type { paths } from './types/api'

type ResearchRequest = paths['/api/ai/research']['post']['requestBody']['content']['application/json']
```

**Python SDK:**
```bash
# Generate Python client
openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g python \
  -o sdk/python

# Install and use
pip install ./sdk/python
from openapi_client import ApiClient, Configuration
```

---

## 📊 Example Workflows

### Basic Research Generation

```typescript
// 1. Authenticate
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// 2. Generate research
const response = await fetch('/api/ai/research', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: 'project-uuid',
    brief: 'Launch eco-friendly sneakers for Gen Z...'
  })
})

const data = await response.json()
console.log(data.content) // Markdown research report
console.log(data.metadata.cost) // e.g., 0.0234
```

### Streaming Generation

```typescript
// Real-time streaming with React
import { useStreamedGeneration } from '@/hooks/useStreamedGeneration'

function ResearchComponent() {
  const { content, isLoading, error } = useStreamedGeneration(
    projectId,
    'research',
    brief
  )

  return (
    <div>
      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
```

### Complete Workflow (n8n)

```json
{
  "nodes": [
    {
      "name": "Trigger",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Research",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-app.vercel.app/api/ai/research",
        "method": "POST"
      }
    },
    {
      "name": "Strategy",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-app.vercel.app/api/ai/strategy",
        "method": "POST"
      }
    },
    {
      "name": "Critique",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-app.vercel.app/api/ai/critique",
        "method": "POST"
      }
    }
  ]
}
```

---

## 🔒 Security Best Practices

### Authentication
- ✅ Always use HTTPS in production
- ✅ Never commit API keys to git
- ✅ Use environment variables for secrets
- ✅ Rotate keys monthly
- ✅ Use service role key only on backend

### Authorization
- ✅ Verify project ownership in API routes
- ✅ Enable Supabase Row-Level Security (RLS)
- ✅ Implement rate limiting per user
- ✅ Enforce budget limits

### Data Privacy
- ✅ Encrypt sensitive data at rest
- ✅ Use HTTPS for data in transit
- ✅ Implement audit logging
- ✅ GDPR compliance (right to delete)

---

## 📈 Performance Optimization

### Caching Strategy
- Enable response caching (50%+ cost savings)
- Use semantic caching for fuzzy matches
- Set appropriate TTL (1-24 hours)

### Provider Selection
- Cost optimization: Grok → Claude → OpenAI
- Quality optimization: Claude → Grok → OpenAI
- Speed optimization: OpenAI → Claude → Grok

### Request Optimization
- Batch similar requests
- Use streaming for better UX
- Implement request deduplication
- Monitor and optimize prompts

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** 401 Unauthorized
**Solution:** Check token expiration, re-authenticate

**Problem:** 429 Budget Exceeded
**Solution:** Review usage analytics, increase budget if justified

**Problem:** 500 Server Error
**Solution:** Check provider health, verify fallback chain

**Problem:** Slow Response Times
**Solution:** Enable caching, use faster models, implement streaming

### Debug Mode

```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug'

// Check provider health
const health = await manager.getProviderHealth()
console.log(health)

// View circuit breaker state
const circuits = await manager.getCircuitBreakerStates()
console.log(circuits)
```

---

## 📞 Support

### Documentation
- **API Reference:** [OpenAPI Spec](./api-spec.yaml)
- **Usage Guide:** [api-usage.md](./api-usage.md)
- **Configuration:** [configuration.md](./configuration.md)
- **Deployment:** [deployment.md](./deployment.md)

### Community
- **GitHub Issues:** https://github.com/your-org/strategist-agent/issues
- **Discussions:** https://github.com/your-org/strategist-agent/discussions
- **Discord:** https://discord.gg/strategist-agent

### Professional Support
- **Email:** support@strategistagent.com
- **Slack:** #ai-provider-support
- **Office Hours:** Weekly Q&A sessions

---

## 🗺️ Roadmap

### Upcoming Features
- [ ] OpenAI GPT-4 Turbo support
- [ ] Semantic caching with embeddings
- [ ] Multi-language support (Spanish, French)
- [ ] Advanced analytics dashboard
- [ ] Custom model fine-tuning
- [ ] Webhook notifications
- [ ] GraphQL API

### Contributing
See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## 📝 License

MIT License - See [LICENSE](../LICENSE) for details.

---

## ✅ Verification Checklist

Before going to production:

- [ ] OpenAPI spec validated (`npx @redocly/cli lint`)
- [ ] All examples tested in Swagger UI
- [ ] Authentication working correctly
- [ ] Budget limits configured
- [ ] Caching enabled and tested
- [ ] Monitoring alerts set up
- [ ] Error handling tested
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation reviewed by team

---

**Last Updated:** October 24, 2025
**Version:** 1.0.0
**Maintained By:** AI Provider Team
