#!/usr/bin/env node

/**
 * Health Check Cron Job
 * Periodically checks provider health and alerts on issues
 *
 * Usage:
 *   npm run health-check
 *
 * Or set up as a cron job (every 5 minutes):
 *   Add to crontab: cd /path/to/project && npm run health-check
 *
 * Or use Vercel Cron (vercel.json):
 *   Add cron configuration for /api/cron/health-check endpoint
 */

import { healthMonitor } from '../lib/ai/health-monitor';

/**
 * Main health check execution
 */
async function runHealthCheck() {
  console.log(`[${new Date().toISOString()}] Starting provider health check...`);

  try {
    // Check all providers
    const results = await healthMonitor.checkAllProviders();

    // Log results
    results.forEach((result) => {
      if (result.success && result.health) {
        const { provider, status, error_rate, avg_latency_ms } = result.health;
        console.log(
          `✓ ${provider}: ${status} (error_rate: ${(error_rate * 100).toFixed(1)}%, latency: ${avg_latency_ms}ms)`
        );
      } else {
        console.error(`✗ Health check failed: ${result.error}`);
      }
    });

    // Alert on issues
    await healthMonitor.alertOnHealthIssues();

    // Get summary
    const unhealthy = results.filter(
      (r) => r.success && r.health && r.health.status !== 'healthy'
    );

    if (unhealthy.length > 0) {
      console.warn(`⚠️  ${unhealthy.length} provider(s) are unhealthy!`);
      process.exit(1); // Non-zero exit code for monitoring systems
    } else {
      console.log('✓ All providers are healthy');
      process.exit(0);
    }
  } catch (error) {
    console.error('Health check failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runHealthCheck().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runHealthCheck };
