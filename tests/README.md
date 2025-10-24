# Test Suite Documentation

Comprehensive testing strategy for the AI Provider System with >80% code coverage.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Test Coverage](#test-coverage)
4. [Mock Providers](#mock-providers)
5. [Test Categories](#test-categories)
6. [Load Testing](#load-testing)
7. [Troubleshooting](#troubleshooting)

## Test Structure

```
tests/
├── unit/           # Unit tests for utilities and providers
├── integration/    # API integration tests
├── e2e/           # End-to-end workflow tests
└── load/          # Load and performance tests

lib/ai/__tests__/
├── mocks.ts                    # Mock provider implementations
├── providers.test.ts           # Provider unit tests
├── circuit-breaker.test.ts     # Circuit breaker tests
├── cache.test.ts               # Response cache tests
└── cost-tracker.test.ts        # Cost tracking tests
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Load tests
npm run test:load
```

### Watch Mode (Development)

```bash
npm run test:watch
```

## Test Coverage

Current coverage targets (enforced by Jest):

- **Statements**: >80%
- **Branches**: >80%
- **Functions**: >80%
- **Lines**: >80%

### View Coverage Report

After running `npm run test:coverage`, open:

```bash
open coverage/lcov-report/index.html
```

## Mock Providers

### MockGrokProvider

Simulates Grok API with configurable behavior:

```typescript
import { MockGrokProvider } from '@/lib/ai/__tests__/mocks';

const provider = new MockGrokProvider({
  shouldFail: false,         // Simulate failures
  delay: 100,                // Response delay in ms
  response: {                // Custom response
    content: 'Custom text',
    metadata: { custom: true }
  }
});

// Generate response
const response = await provider.generate({ prompt: 'Test' });

// Stream response
for await (const chunk of provider.stream({ prompt: 'Test' })) {
  console.log(chunk.content);
}

// Check calls
console.log(provider.generateCalls);  // All generate() calls
console.log(provider.streamCalls);    // All stream() calls

// Reset tracking
provider.reset();
```

### MockClaudeProvider

Simulates Claude API with similar interface:

```typescript
import { MockClaudeProvider } from '@/lib/ai/__tests__/mocks';

const provider = new MockClaudeProvider({
  shouldFail: false,
  delay: 150,
});

const response = await provider.generate({
  prompt: 'Explain quantum computing',
  model: 'claude-3-5-sonnet-20240620'
});
```

### Mock Supabase Client

For testing API routes:

```typescript
import { createMockSupabaseClient } from '@/lib/ai/__tests__/mocks';

const mockSupabase = createMockSupabaseClient();

// Set mock data
mockSupabase.__setMockData('project', {
  id: 'test-project',
  user_id: 'test-user',
  name: 'Test Project'
});

// Use in tests
const { data } = await mockSupabase
  .from('projects')
  .select('*')
  .eq('id', 'test-project')
  .single();
```

## Test Categories

### 1. Unit Tests

**Circuit Breaker** (`circuit-breaker.test.ts`)
- State transitions (closed → open → half-open)
- Failure threshold enforcement
- Auto-recovery after timeout
- Manual reset
- Custom configuration

**Response Cache** (`cache.test.ts`)
- Set/get operations
- TTL expiration
- LRU eviction
- Hit rate tracking
- Statistics

**Cost Tracker** (`cost-tracker.test.ts`)
- Cost logging
- Aggregation by provider/model
- Time period filtering
- Statistics and reporting

**Provider Tests** (`providers.test.ts`)
- generate() method
- stream() method
- Token counting
- Cost estimation
- Feature support
- Model listing

### 2. Integration Tests

**API Endpoints** (coming soon)
- `/api/ai/research`
- `/api/ai/strategy`
- `/api/ai/critique`
- `/api/ai/stream`
- `/api/analytics/usage`

Tests cover:
- Authentication
- Budget enforcement
- Provider fallback
- Error handling
- Response format

### 3. E2E Tests

**Full Workflow** (coming soon)
- User login
- Project creation
- Brief submission
- Research generation
- Strategy generation
- Critique generation
- Cost tracking
- Quality scoring

### 4. Load Tests

**Concurrent Requests** (`load/concurrent-requests.js`)

Simulates high load:
- 10 concurrent requests
- 50 total requests
- Circuit breaker activation
- Budget enforcement
- Performance metrics

Run with:
```bash
npm run test:load
```

Expected results:
- Success rate >90%
- Average latency <5000ms
- Graceful degradation under load

## Load Testing

### Configuration

Edit `tests/load/concurrent-requests.js`:

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  concurrentRequests: 10,    // Concurrent requests per batch
  totalRequests: 50,         // Total requests to send
  requestDelay: 100,         // ms between batches
};
```

### Metrics Tracked

- Total requests sent
- Successful requests
- Failed requests
- Circuit breaker activations
- Budget exceeded errors
- Average latency
- Total cost
- Average cost per request

### Running Load Tests

1. Start the development server:
```bash
npm run dev
```

2. In another terminal, run load tests:
```bash
npm run test:load
```

### Sample Output

```
AI Provider Load Test
============================================================
Concurrent Requests: 10
Total Requests:      50
Base URL:            http://localhost:3000
============================================================

--- Batch 1 (10 concurrent requests) ---
✓ Request 1: 200 (1234ms) $0.0050
✓ Request 2: 200 (1189ms) $0.0048
⚠ Request 3: 429 Budget exceeded (856ms)
...

============================================================
LOAD TEST RESULTS
============================================================

Total Requests:     50
Successful:         45 (90.0%)
Failed:             5 (10.0%)
Budget Exceeded:    5

Average Latency:    1234ms
Total Cost:         $0.2250
Avg Cost/Request:   $0.0050

TEST CRITERIA:
✓ Success rate > 90%:        PASS (90.0%)
✓ Avg latency < 5000ms:      PASS (1234ms)
✓ No critical errors:        PASS
```

## Troubleshooting

### Tests Failing

**"Module not found" errors:**
```bash
npm install
```

**"Cannot find mock" errors:**
Check that mock files are imported correctly:
```typescript
import { MockGrokProvider } from '../mocks';  // Relative path
// OR
import { MockGrokProvider } from '@/lib/ai/__tests__/mocks';  // Absolute
```

**Timeout errors:**
Increase Jest timeout in test file:
```typescript
jest.setTimeout(30000);  // 30 seconds
```

### Coverage Not Meeting Threshold

**View uncovered lines:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

**Common issues:**
- Missing edge case tests
- Error handlers not tested
- Async code not awaited
- Missing branch coverage

### Load Tests Failing

**Server not running:**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:load
```

**Timeout errors:**
Increase timeout in `concurrent-requests.js`:
```javascript
req.setTimeout(60000);  // 60 seconds
```

**High failure rate:**
- Check server logs for errors
- Reduce `concurrentRequests`
- Increase `requestDelay`
- Check database connection

## Best Practices

1. **Write tests first (TDD)**: Define behavior before implementation
2. **One test, one assertion**: Keep tests focused
3. **Descriptive names**: `should return cached response when key exists`
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Mock external dependencies**: Keep tests fast and isolated
6. **Test edge cases**: Empty inputs, null values, boundaries
7. **Clean up**: Reset state between tests

## Example Test

```typescript
describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache('memory', 100);
  });

  afterEach(() => {
    cache.clear();
  });

  it('should return cached response when key exists', async () => {
    // Arrange
    const key = 'test-key';
    const response = { content: 'Test', /* ... */ };
    await cache.set(key, response);

    // Act
    const retrieved = await cache.get(key);

    // Assert
    expect(retrieved).toEqual(response);
  });
});
```

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure >80% coverage
3. Run full test suite
4. Update this documentation

## Support

For issues or questions:
1. Check this documentation
2. Review test examples
3. Check Jest documentation: https://jestjs.io/
4. Open an issue in the repository
