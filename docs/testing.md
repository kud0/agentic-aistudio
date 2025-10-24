# Testing Guide - AI Provider Architecture

Comprehensive testing documentation for the AI Provider backend.

## Test Overview

**Total Tests:** 72
**Test Suites:** 4
**Coverage:** Core functionality (cache, cost-tracker, circuit-breaker, providers)

## Running Tests

### All Tests

```bash
npm test
```

Expected output:
```
Test Suites: 4 passed, 4 total
Tests:       72 passed, 72 total
```

### Specific Test Suite

```bash
# Cache tests
npm test -- cache.test.ts

# Cost tracker tests
npm test -- cost-tracker.test.ts

# Circuit breaker tests
npm test -- circuit-breaker.test.ts

# Provider tests
npm test -- providers.test.ts
```

### Watch Mode

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

## Test Suites

### 1. Cache Tests (`cache.test.ts`)

Tests the response caching system with LRU eviction.

**Tests (23):**
- Basic operations (set, get, delete, clear)
- TTL expiration
- LRU eviction when cache is full
- Hit tracking and statistics
- Edge cases (rapid operations, complex metadata)

**Key Features Tested:**
- Cache hits and misses
- TTL-based expiration
- LRU eviction
- Statistics calculation
- Concurrent operations

**Example:**
```typescript
const cache = new ResponseCache('memory', 100);
await cache.set('key', response);
const cached = await cache.get('key');
```

### 2. Cost Tracker Tests (`cost-tracker.test.ts`)

Tests the cost logging and analytics system.

**Tests (29):**
- Basic logging operations
- Cost aggregation by provider
- Cost aggregation by model
- Time-period filtering
- Statistics generation
- High-volume performance

**Key Features Tested:**
- Per-provider cost tracking
- Per-model cost tracking
- Time-based queries
- Statistics (total cost, average, etc.)
- Performance with 1000+ entries

**Example:**
```typescript
const tracker = new CostTracker();
await tracker.log({
  provider: 'grok',
  model: 'grok-4-fast-reasoning',
  tokens: 1000,
  cost: 0.005,
  timestamp: new Date()
});
const total = tracker.getTotalCost();
```

### 3. Circuit Breaker Tests (`circuit-breaker.test.ts`)

Tests the fault tolerance and recovery mechanisms.

**Tests (12):**
- State transitions (closed → open → half-open)
- Failure threshold triggering
- Recovery timeout
- Half-open state testing
- Success tracking
- Statistics and health status

**Key Features Tested:**
- Circuit states (closed, open, half-open)
- Failure counting
- Automatic recovery
- Health status reporting
- Error rate calculation

**Example:**
```typescript
const breaker = new CircuitBreaker('grok', 3);
// After 3 failures, circuit opens
breaker.recordFailure();
breaker.recordFailure();
breaker.recordFailure();
expect(breaker.isOpen()).toBe(true);
```

### 4. Provider Tests (`providers.test.ts`)

Tests the Grok provider implementation.

**Tests (8):**
- API request formatting
- Response parsing
- Token counting
- Cost estimation
- Streaming support
- Error handling
- Model selection
- Feature support

**Key Features Tested:**
- Chat completions API
- Streaming responses
- Token usage calculation
- Cost calculation
- Error handling
- Model availability

**Example:**
```typescript
const provider = new GrokProvider(apiKey);
const response = await provider.generate({
  prompt: 'Test query',
  model: 'grok-4-fast-reasoning',
  maxTokens: 100
});
```

## API Testing

### Manual API Tests

Use the automated testing script:

```bash
# Start dev server
npm run dev

# In another terminal
./scripts/test-api.sh
```

This tests:
1. Research endpoint (`POST /api/ai/research`)
2. Strategy endpoint (`POST /api/ai/strategy`)
3. Critique endpoint (`POST /api/ai/critique`)
4. Streaming endpoint (`POST /api/ai/stream`)
5. Usage analytics (`GET /api/analytics/usage`)
6. Cost tracking (`GET /api/analytics/cost`)
7. Provider health (`GET /api/analytics/health`)

### Manual cURL Tests

#### Research Agent

```bash
curl -X POST http://localhost:3000/api/ai/research \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the AI market in 2025",
    "projectId": "test-123"
  }'
```

#### Strategy Agent

```bash
curl -X POST http://localhost:3000/api/ai/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a GTM strategy",
    "projectId": "test-123"
  }'
```

#### Critique Agent

```bash
curl -X POST http://localhost:3000/api/ai/critique \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Review: We build better software",
    "projectId": "test-123"
  }'
```

#### Streaming

```bash
curl -N -X POST http://localhost:3000/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Count from 1 to 10",
    "projectId": "test-123",
    "taskType": "research"
  }'
```

#### Analytics

```bash
# Usage stats
curl http://localhost:3000/api/analytics/usage?projectId=test-123

# Cost breakdown
curl http://localhost:3000/api/analytics/cost?projectId=test-123

# Provider health
curl http://localhost:3000/api/analytics/health
```

## Integration Tests

### Database Integration

Test database connectivity and queries:

```bash
# Requires Supabase running
npm run test:integration
```

Tests:
- Project creation
- Usage log insertion
- Cost aggregation queries
- RLS policy enforcement

### End-to-End Tests

Full workflow tests:

```bash
npm run test:e2e
```

Tests:
- User creates project
- Makes AI request
- Cost is tracked
- Cache is populated
- Analytics are updated

## Performance Tests

### Load Testing

Test system under load:

```bash
npm run test:load
```

Simulates:
- 100 concurrent requests
- Mixed task types
- Cache hit scenarios
- Cost tracking overhead

### Stress Testing

Find breaking points:

```bash
npm run test:stress
```

Tests:
- Maximum concurrent requests
- Memory limits
- Cache eviction performance
- Database connection pooling

## Mocking

### Mock Grok API

For testing without API key:

```typescript
// Set in .env.test
MOCK_AI_RESPONSES=true
```

Returns:
- Predictable responses
- Simulated latency
- Controlled token counts

### Mock Database

In-memory database for unit tests:

```typescript
// Already configured in tests
// Uses in-memory cost tracker and cache
```

## Test Data

### Fixtures

Located in `lib/ai/__tests__/fixtures/`:
- `mock-responses.ts` - Sample LLM responses
- `mock-projects.ts` - Test projects
- `mock-users.ts` - Test users

### Factories

Generate test data:

```typescript
import { createMockResponse } from './fixtures/factories';

const response = createMockResponse({
  provider: 'grok',
  cost: 0.01
});
```

## Debugging Tests

### Verbose Output

```bash
npm test -- --verbose
```

### Single Test

```bash
npm test -- -t "should cache responses"
```

### Debug in VSCode

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## Continuous Integration

### GitHub Actions

`.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:integration
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm test
npm run lint
npm run typecheck
```

## Test Maintenance

### Updating Tests

When changing implementation:

1. Run tests: `npm test`
2. Identify failures
3. Update test expectations
4. Verify all pass
5. Update documentation

### Adding Tests

For new features:

1. Create test file in `lib/ai/__tests__/`
2. Follow existing patterns
3. Test happy path + edge cases
4. Aim for >80% coverage
5. Document in this file

## Common Issues

### Test Timeout

```bash
# Increase timeout
npm test -- --testTimeout=10000
```

### Database Connection

```bash
# Check .env.test has correct values
cat .env.test
```

### API Rate Limits

```bash
# Use mock mode
MOCK_AI_RESPONSES=true npm test
```

## Test Checklist

Before merging code:

- [ ] All unit tests pass (72/72)
- [ ] No TypeScript errors
- [ ] API tests pass
- [ ] Health check passes
- [ ] Coverage >80%
- [ ] Integration tests pass (if applicable)
- [ ] No console errors
- [ ] Documentation updated

## Resources

- **Jest Docs:** https://jestjs.io/docs/getting-started
- **Testing Library:** https://testing-library.com/docs/react-testing-library/intro/
- **Supertest (API):** https://github.com/visionmedia/supertest

---

**Test Coverage Goal:** 80%+
**Current Coverage:** 85%
**Last Updated:** 2025-10-24
