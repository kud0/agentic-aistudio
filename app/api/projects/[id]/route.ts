/**
 * Single Project API Endpoint
 *
 * GET /api/projects/:id - Get a single project by ID
 * PUT /api/projects/:id - Update a project
 * DELETE /api/projects/:id - Delete a project
 *
 * Includes authentication and ownership verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectOwnership, handleAuthError } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * Route params interface
 */
interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/:id
 *
 * Get a single project with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 1. Authenticate and verify ownership
    const { user, project, error: authError } = await requireProjectOwnership(params.id);
    if (authError) return authError;

    // 2. Fetch full project details with outputs and inputs
    const supabase = await createClient();

    const [projectDetails, outputs, inputs] = await Promise.all([
      supabase
        .from('project_summaries')
        .select('*')
        .eq('id', params.id)
        .single(),
      supabase
        .from('outputs')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('inputs')
        .select('*')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false }),
    ]);

    if (projectDetails.error) {
      console.error('Database error fetching project:', projectDetails.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch project details',
          },
        },
        { status: 500 }
      );
    }

    // 3. Return full project data
    return NextResponse.json({
      success: true,
      data: {
        project: projectDetails.data,
        outputs: outputs.data || [],
        inputs: inputs.data || [],
      },
    });

  } catch (error) {
    console.error('Project fetch error:', error);
    return handleAuthError(error);
  }
}

/**
 * PUT /api/projects/:id
 *
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 1. Authenticate and verify ownership
    const { user, error: authError } = await requireProjectOwnership(params.id);
    if (authError) return authError;

    // 2. Parse request body
    const body = await request.json();
    const { title, brief, status, budget_limit, metadata } = body;

    // 3. Build update object (only update provided fields)
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (brief !== undefined) updateData.brief = brief;
    if (status !== undefined) updateData.status = status;
    if (budget_limit !== undefined) updateData.budget_limit = budget_limit;
    if (metadata !== undefined) updateData.metadata = metadata;

    // 4. Update project
    const supabase = await createClient();
    const { data: updatedProject, error: dbError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (dbError) {
      console.error('Database error updating project:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update project',
          },
        },
        { status: 500 }
      );
    }

    // 5. Return updated project
    return NextResponse.json({
      success: true,
      data: {
        project: updatedProject,
      },
    });

  } catch (error) {
    console.error('Project update error:', error);
    return handleAuthError(error);
  }
}

/**
 * DELETE /api/projects/:id
 *
 * Delete a project (cascade deletes outputs and inputs)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 1. Authenticate and verify ownership
    const { user, error: authError } = await requireProjectOwnership(params.id);
    if (authError) return authError;

    // 2. Delete project (cascade will handle related records)
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id);

    if (dbError) {
      console.error('Database error deleting project:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to delete project',
          },
        },
        { status: 500 }
      );
    }

    // 3. Return success
    return NextResponse.json({
      success: true,
      data: {
        message: 'Project deleted successfully',
      },
    });

  } catch (error) {
    console.error('Project deletion error:', error);
    return handleAuthError(error);
  }
}
