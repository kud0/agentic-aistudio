/**
 * Health Check API Endpoint
 * Called by Vercel Cron or external monitoring services
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/health-check",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/ai/health-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

/**
 * GET /api/cron/health-check
 * Performs health check on all providers
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured (security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Health Check] Starting scheduled health check...');

    // Check all providers
    const results = await healthMonitor.checkAllProviders();

    // Alert on issues
    await healthMonitor.alertOnHealthIssues();

    // Prepare response
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const unhealthy = successful.filter(
      (r) => r.health && r.health.status !== 'healthy'
    );

    const response = {
      timestamp: new Date().toISOString(),
      success: true,
      providers_checked: results.length,
      healthy: successful.length - unhealthy.length,
      unhealthy: unhealthy.length,
      failed: failed.length,
      results: successful.map((r) => ({
        provider: r.health?.provider,
        status: r.health?.status,
        error_rate: r.health?.error_rate,
        avg_latency_ms: r.health?.avg_latency_ms,
      })),
    };

    console.log('[Health Check] Complete:', response);

    // Return 200 if all healthy, 207 (Multi-Status) if some unhealthy
    const statusCode = unhealthy.length > 0 ? 207 : 200;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[Health Check] Error:', error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
