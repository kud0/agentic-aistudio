# API Testing Scripts

## test-api.ts

Comprehensive test suite for all deployed API endpoints.

### Prerequisites

1. **Grok API Key**: Set in your environment
2. **Deployment URL**: Your Vercel deployment URL (optional, defaults to localhost)

### Usage

**Test Production Deployment:**
```bash
# Set your Grok API key
export GROK_API_KEY=your_grok_api_key_here

# Set your Vercel URL (or it will use localhost:3000)
export VERCEL_URL=https://your-app.vercel.app

# Run tests
npm run test:api
```

**Test Local Development:**
```bash
# Start your local server first
npm run dev

# In another terminal
export GROK_API_KEY=your_grok_api_key_here
npm run test:api
```

### What It Tests

The script tests all 7 API endpoints:

1. **GET /api/cron/health-check** - Health monitoring cron
2. **GET /api/analytics/health** - Provider health status
3. **GET /api/analytics/usage** - Usage statistics
4. **POST /api/ai/research** - Research analysis with Grok
5. **POST /api/ai/strategy** - Strategy generation with Grok
6. **POST /api/ai/critique** - Content critique with Grok
7. **POST /api/ai/stream** - Streaming responses with Grok

### Output

The script provides:
- ✓ Green checkmarks for passing tests
- ✗ Red X for failing tests
- Response times in milliseconds
- Sample response data
- Final summary with pass/fail counts

### Example Output

```
╔════════════════════════════════════════════╗
║   API Endpoint Test Suite                 ║
╚════════════════════════════════════════════╝

Target: https://your-app.vercel.app
API Key: xai-abc123...

Testing: Health Check Cron
GET /api/cron/health-check
✓ PASSED (245ms)
Status: 200
Response: { "status": "healthy", ... }

...

╔════════════════════════════════════════════╗
║   Test Results                             ║
╚════════════════════════════════════════════╝
Passed: 7
Failed: 0
Total: 7

🎉 All tests passed!
```

### Troubleshooting

**Error: GROK_API_KEY not set**
```bash
export GROK_API_KEY=your_key_here
```

**Connection refused (ECONNREFUSED)**
- Make sure your server is running (`npm run dev`)
- Or verify your VERCEL_URL is correct

**401 Unauthorized**
- Check your Grok API key is valid
- Verify environment variables are set in Vercel dashboard

**Timeout errors**
- Increase timeout in the script
- Check Vercel function limits (10s default, 60s for Pro)

## Other Scripts

### health-check-cron.ts
Monitors provider health and logs issues.

```bash
npm run health-check
```

### verify-quality-system.ts
Verifies the quality scoring system is working.

```bash
npm run verify:quality
```
