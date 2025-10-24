/**
 * Load Testing Script - Concurrent Requests
 * Tests the system under high load with concurrent AI requests
 */

const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  concurrentRequests: 10,
  totalRequests: 50,
  requestDelay: 100, // ms between batches
};

// Test data
const mockBrief = `
Rebrand Denon for Gen Z Audiophiles

CLIENT: Denon
CHALLENGE: Declining market share among 18-30 demographic
GOAL: Modernize brand perception while maintaining audio quality heritage
BUDGET: $2M
TIMELINE: 6 months
`;

// Statistics tracking
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalLatency: 0,
  totalCost: 0,
  errors: [],
  circuitBreakerActivations: 0,
  budgetExceeded: 0,
};

/**
 * Make a single API request
 */
async function makeRequest(endpoint, data, requestId) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer test-token', // Mock auth
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const latency = Date.now() - startTime;
        stats.totalRequests++;
        stats.totalLatency += latency;

        try {
          const parsed = JSON.parse(responseData);

          if (res.statusCode === 200) {
            stats.successfulRequests++;
            if (parsed.metadata?.cost) {
              stats.totalCost += parsed.metadata.cost;
            }
            console.log(`✓ Request ${requestId}: ${res.statusCode} (${latency}ms) $${parsed.metadata?.cost || 0}`);
          } else if (res.statusCode === 429) {
            stats.budgetExceeded++;
            console.log(`⚠ Request ${requestId}: Budget exceeded (${latency}ms)`);
          } else {
            stats.failedRequests++;
            console.log(`✗ Request ${requestId}: ${res.statusCode} (${latency}ms)`);
          }
        } catch (error) {
          stats.failedRequests++;
          stats.errors.push({ requestId, error: error.message, responseData });
          console.log(`✗ Request ${requestId}: Parse error (${latency}ms)`);
        }

        resolve();
      });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push({ requestId, error: error.message });
      console.log(`✗ Request ${requestId}: ${error.message} (${latency}ms)`);
      resolve();
    });

    req.setTimeout(30000, () => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push({ requestId, error: 'Timeout' });
      console.log(`✗ Request ${requestId}: Timeout`);
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Run a batch of concurrent requests
 */
async function runBatch(batchNum, batchSize) {
  console.log(`\n--- Batch ${batchNum} (${batchSize} concurrent requests) ---`);

  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    const requestId = (batchNum - 1) * batchSize + i + 1;

    promises.push(
      makeRequest(
        '/api/ai/research',
        {
          projectId: `test-project-${requestId}`,
          brief: mockBrief,
        },
        requestId
      )
    );
  }

  await Promise.all(promises);
}

/**
 * Print final statistics
 */
function printStats() {
  console.log('\n' + '='.repeat(60));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`\nTotal Requests:     ${stats.totalRequests}`);
  console.log(`Successful:         ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed:             ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Budget Exceeded:    ${stats.budgetExceeded}`);

  if (stats.totalRequests > 0) {
    const avgLatency = stats.totalLatency / stats.totalRequests;
    console.log(`\nAverage Latency:    ${avgLatency.toFixed(0)}ms`);
    console.log(`Total Cost:         $${stats.totalCost.toFixed(4)}`);
    console.log(`Avg Cost/Request:   $${(stats.totalCost / stats.successfulRequests || 0).toFixed(4)}`);
  }

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach((err) => {
      console.log(`  - Request ${err.requestId}: ${err.error}`);
    });
    if (stats.errors.length > 5) {
      console.log(`  ... and ${stats.errors.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Test assertions
  const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
  const avgLatency = stats.totalLatency / stats.totalRequests;

  console.log('\nTEST CRITERIA:');
  console.log(`✓ Success rate > 90%:        ${successRate > 90 ? 'PASS' : 'FAIL'} (${successRate.toFixed(1)}%)`);
  console.log(`✓ Avg latency < 5000ms:      ${avgLatency < 5000 ? 'PASS' : 'FAIL'} (${avgLatency.toFixed(0)}ms)`);
  console.log(`✓ No critical errors:        ${stats.errors.filter(e => !e.error.includes('Budget')).length === 0 ? 'PASS' : 'FAIL'}`);

  console.log('\n');
}

/**
 * Run the load test
 */
async function runLoadTest() {
  console.log('AI Provider Load Test');
  console.log('='.repeat(60));
  console.log(`Concurrent Requests: ${CONFIG.concurrentRequests}`);
  console.log(`Total Requests:      ${CONFIG.totalRequests}`);
  console.log(`Base URL:            ${CONFIG.baseUrl}`);
  console.log('='.repeat(60));

  const totalBatches = Math.ceil(CONFIG.totalRequests / CONFIG.concurrentRequests);
  const startTime = Date.now();

  for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
    const batchSize = Math.min(
      CONFIG.concurrentRequests,
      CONFIG.totalRequests - (batchNum - 1) * CONFIG.concurrentRequests
    );

    await runBatch(batchNum, batchSize);

    // Delay between batches
    if (batchNum < totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.requestDelay));
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\nTotal test duration: ${(totalTime / 1000).toFixed(2)}s`);

  printStats();
}

/**
 * Check if server is running
 */
async function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Main execution
(async () => {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('\n⚠ Warning: Could not connect to server at http://localhost:3000');
    console.log('Please ensure the Next.js server is running with: npm run dev\n');
    console.log('Running in simulation mode...\n');
  }

  try {
    await runLoadTest();
    process.exit(0);
  } catch (error) {
    console.error('\nLoad test failed:', error.message);
    process.exit(1);
  }
})();
