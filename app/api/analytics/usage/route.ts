/**
 * Analytics Usage API Endpoint
 * Provides comprehensive analytics data for dashboard
 *
 * GET /api/analytics/usage?timeframe=7d
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/middleware';
import { getUserUsageStats } from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Timeframe = '24h' | '7d' | '30d' | 'all';

/**
 * GET /api/analytics/usage
 * Returns comprehensive analytics data
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = (searchParams.get('timeframe') || '30d') as Timeframe;

    // Validate timeframe
    const validTimeframes: Timeframe[] = ['24h', '7d', '30d', 'all'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: 24h, 7d, 30d, all' },
        { status: 400 }
      );
    }

    console.log(`[Analytics] Fetching data for user ${user.id}, timeframe: ${timeframe}`);

    // 3. Fetch user's usage statistics
    const analytics = await getUserUsageStats(user.id, timeframe);

    // 4. Add metadata
    const response = {
      timeframe,
      generated_at: new Date().toISOString(),
      user_id: user.id,
      ...analytics,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return handleAuthError(error);
  }
}
