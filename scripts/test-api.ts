#!/usr/bin/env ts-node

/**
 * API Test Script
 * Tests all deployed API endpoints with real Grok API key
 *
 * Usage:
 *   npm run test:api
 *
 * Or with custom URL:
 *   VERCEL_URL=https://your-app.vercel.app npm run test:api
 */

import https from 'https';
import http from 'http';

// Configuration
const VERCEL_URL = process.env.VERCEL_URL || 'http://localhost:3000';
const GROK_API_KEY = process.env.GROK_API_KEY || '';

if (!GROK_API_KEY) {
  console.error('❌ Error: GROK_API_KEY environment variable not set');
  console.log('Please set it: export GROK_API_KEY=your_key_here');
  process.exit(1);
}

// Test results tracker
let passed = 0;
let failed = 0;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTP request helper
 */
function makeRequest(
  url: string,
  options: http.RequestOptions,
  body?: string
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode || 0,
            data: parsed,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            status: res.statusCode || 0,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(
  name: string,
  path: string,
  method: string = 'GET',
  body?: any,
  expectedStatus: number = 200
): Promise<void> {
  console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
  console.log(`${colors.blue}${method} ${path}${colors.reset}`);

  try {
    const url = `${VERCEL_URL}${path}`;
    const bodyString = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyString ? { 'Content-Length': Buffer.byteLength(bodyString) } : {}),
      },
    };

    const startTime = Date.now();
    const result = await makeRequest(url, options, bodyString);
    const duration = Date.now() - startTime;

    if (result.status === expectedStatus) {
      console.log(`${colors.green}✓ PASSED${colors.reset} (${duration}ms)`);
      console.log(`Status: ${result.status}`);
      if (result.data) {
        console.log('Response:', JSON.stringify(result.data, null, 2).slice(0, 500));
      }
      passed++;
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset}`);
      console.log(`Expected status: ${expectedStatus}, Got: ${result.status}`);
      console.log('Response:', result.data);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset}`);
    console.error(error instanceof Error ? error.message : error);
    failed++;
  }
}

/**
 * Test streaming endpoint
 */
async function testStreamingEndpoint(
  name: string,
  path: string,
  body: any
): Promise<void> {
  console.log(`\n${colors.cyan}Testing (Streaming): ${name}${colors.reset}`);
  console.log(`${colors.blue}POST ${path}${colors.reset}`);

  try {
    const url = `${VERCEL_URL}${path}`;
    const bodyString = JSON.stringify(body);

    const protocol = url.startsWith('https') ? https : http;

    const options: http.RequestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString),
      },
    };

    let chunks = 0;
    let totalData = '';

    const promise = new Promise<void>((resolve, reject) => {
      const req = protocol.request(url, options, (res) => {
        console.log(`Status: ${res.statusCode}`);

        res.on('data', (chunk) => {
          chunks++;
          totalData += chunk.toString();
          process.stdout.write('.');
        });

        res.on('end', () => {
          console.log(''); // New line
          if (res.statusCode === 200 && chunks > 0) {
            console.log(`${colors.green}✓ PASSED${colors.reset} (${chunks} chunks received)`);
            console.log('Sample data:', totalData.slice(0, 200));
            passed++;
            resolve();
          } else {
            console.log(`${colors.red}✗ FAILED${colors.reset}`);
            console.log('Response:', totalData.slice(0, 500));
            failed++;
            resolve();
          }
        });

        res.on('error', reject);
      });

      req.on('error', reject);
      req.write(bodyString);
      req.end();
    });

    await promise;
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset}`);
    console.error(error instanceof Error ? error.message : error);
    failed++;
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log(`${colors.yellow}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║   API Endpoint Test Suite                 ║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTarget: ${VERCEL_URL}`);
  console.log(`API Key: ${GROK_API_KEY.slice(0, 10)}...`);

  // Test 1: Health Check (no auth needed)
  await testEndpoint(
    'Health Check Cron',
    '/api/cron/health-check',
    'GET'
  );

  // Test 2: Analytics - Health
  await testEndpoint(
    'Analytics - Provider Health',
    '/api/analytics/health',
    'GET'
  );

  // Test 3: Analytics - Usage (requires auth - expect 401)
  await testEndpoint(
    'Analytics - Usage (Auth Check)',
    '/api/analytics/usage?timeframe=7d',
    'GET',
    undefined,
    401  // Expect 401 without authentication
  );

  // Test 4: AI - Research (requires auth - expect 401)
  await testEndpoint(
    'AI - Research (Auth Check)',
    '/api/ai/research',
    'POST',
    {
      brief: 'Research the benefits of AI in healthcare',
      projectId: 'test-project-123',
      options: {
        provider: 'grok',
        model: 'grok-2-latest',
      }
    },
    401  // Expect 401 without authentication
  );

  // Test 5: AI - Strategy (requires auth - expect 401)
  await testEndpoint(
    'AI - Strategy (Auth Check)',
    '/api/ai/strategy',
    'POST',
    {
      brief: 'Create a marketing strategy for a new AI product',
      projectId: 'test-project-123',
      options: {
        provider: 'grok',
        model: 'grok-2-latest',
      }
    },
    401  // Expect 401 without authentication
  );

  // Test 6: AI - Critique (requires auth - expect 401)
  await testEndpoint(
    'AI - Critique (Auth Check)',
    '/api/ai/critique',
    'POST',
    {
      projectId: 'test-project-123',
      strategyData: {
        targetAudience: ['developers'],
        brandVoice: 'professional',
      },
      options: {
        provider: 'grok',
        model: 'grok-2-latest',
      }
    },
    401  // Expect 401 without authentication
  );

  // Test 7: AI - Streaming (requires auth - expect 401)
  await testEndpoint(
    'AI - Streaming (Auth Check)',
    '/api/ai/stream',
    'POST',
    {
      projectId: 'test-project-123',
      taskType: 'research',
      prompt: 'Tell me about AI in healthcare',
      options: {
        provider: 'grok',
        model: 'grok-2-latest',
      }
    },
    401  // Expect 401 without authentication
  );

  // Print summary
  console.log(`\n${colors.yellow}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║   Test Results                             ║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
