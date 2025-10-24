/**
 * Provider Health API Endpoint
 * Returns current health status of all providers
 *
 * GET /api/analytics/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/ai/health-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/health
 * Returns provider health statuses
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === 'true';

    // If refresh requested, run new health checks
    if (refresh) {
      console.log('[Health API] Running fresh health checks...');
      await healthMonitor.checkAllProviders();
    }

    // Get current health statuses from database
    const statuses = await healthMonitor.getHealthStatuses();

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        providers: statuses,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[Health API] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch health status',
      },
      { status: 500 }
    );
  }
}
