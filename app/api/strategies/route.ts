/**
 * Strategies API Endpoint
 *
 * GET /api/strategies - List all strategy outputs for the authenticated user
 *
 * This endpoint is specifically for the critique agent to fetch
 * previously generated strategies that can be critiqued.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * Strategy output interface
 */
interface StrategyOutput {
  id: string;
  project_id: string;
  section: string;
  content: string;
  version: number;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  project?: {
    id: string;
    title: string;
    brief: string;
    status: string;
  };
}

/**
 * GET /api/strategies
 *
 * List all strategy outputs for the authenticated user's projects
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeProject = searchParams.get('includeProject') === 'true';

    // 3. Build query for strategy outputs
    const supabase = await createClient();

    let query = supabase
      .from('outputs')
      .select(includeProject ? `
        *,
        project:projects (
          id,
          title,
          brief,
          status
        )
      ` : '*')
      .eq('section', 'strategy')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: strategies, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error fetching strategies:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch strategies',
          },
        },
        { status: 500 }
      );
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      data: {
        strategies: strategies || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      },
    });

  } catch (error) {
    console.error('Strategies fetch error:', error);
    return handleAuthError(error);
  }
}

/**
 * POST /api/strategies
 *
 * Create a new strategy output
 * (This is typically called by the strategy agent)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Parse request body
    const body = await request.json();
    const { projectId, content, metadata } = body;

    // 3. Validate required fields
    if (!projectId || !content) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'projectId and content are required',
          },
        },
        { status: 400 }
      );
    }

    // 4. Verify project ownership
    const supabase = await createClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Project not found or access denied',
          },
        },
        { status: 403 }
      );
    }

    // 5. Create strategy output
    const { data: strategy, error: dbError } = await supabase
      .from('outputs')
      .insert({
        project_id: projectId,
        section: 'strategy',
        content,
        version: 1,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating strategy:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create strategy',
          },
        },
        { status: 500 }
      );
    }

    // 6. Return created strategy
    return NextResponse.json(
      {
        success: true,
        data: {
          strategy,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Strategy creation error:', error);
    return handleAuthError(error);
  }
}
