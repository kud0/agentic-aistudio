/**
 * Projects API Endpoint
 *
 * GET /api/projects - List all projects for the authenticated user
 *
 * Returns all projects with their metadata and summary statistics.
 * Includes RLS filtering by user_id for security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * Project response interface
 */
interface Project {
  id: string;
  user_id: string;
  title: string;
  brief: string;
  status: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  budget_limit: number;
  metadata: Record<string, unknown>;
}

/**
 * Project summary interface (from project_summaries view)
 */
interface ProjectSummary extends Project {
  research_count: number;
  strategy_count: number;
  critique_count: number;
  input_count: number;
}

/**
 * GET /api/projects
 *
 * List all projects for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 3. Fetch projects with summaries
    const supabase = await createClient();

    let query = supabase
      .from('project_summaries')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error fetching projects:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch projects',
          },
        },
        { status: 500 }
      );
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      data: {
        projects: projects || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      },
    });

  } catch (error) {
    console.error('Projects fetch error:', error);
    return handleAuthError(error);
  }
}

/**
 * POST /api/projects
 *
 * Create a new project
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Parse request body
    const body = await request.json();
    const { title, brief, budget_limit, metadata } = body;

    // 3. Validate required fields
    if (!title || !brief) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'title and brief are required',
          },
        },
        { status: 400 }
      );
    }

    // 4. Create project
    const supabase = await createClient();
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title,
        brief,
        status: 'pending',
        budget_limit: budget_limit || 10.0,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating project:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create project',
          },
        },
        { status: 500 }
      );
    }

    // 5. Return created project
    return NextResponse.json(
      {
        success: true,
        data: {
          project,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Project creation error:', error);
    return handleAuthError(error);
  }
}
