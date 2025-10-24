/**
 * Auth Middleware
 *
 * Provides authentication and authorization helpers for API routes.
 * All functions are designed to work with Next.js App Router and Supabase SSR.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Auth error responses
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Get authenticated user from session
 * Throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const user = await getAuthUser();
 *   // user is guaranteed to be authenticated here
 * }
 * ```
 */
export async function getAuthUser(): Promise<User> {
  const supabase = createClient(cookies());
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return user;
}

/**
 * Require authentication middleware
 * Returns user if authenticated, otherwise returns 401 response
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const { user, error } = await requireAuth();
 *   if (error) return error;
 *
 *   // user is authenticated here
 * }
 * ```
 */
export async function requireAuth(): Promise<
  | { user: User; error: null }
  | { user: null; error: NextResponse }
> {
  try {
    const user = await getAuthUser();
    return { user, error: null };
  } catch (error) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message:
              error instanceof AuthError
                ? error.message
                : 'Authentication required',
          },
        },
        { status: 401 }
      ),
    };
  }
}

/**
 * Verify user owns a project
 * Throws ForbiddenError if user doesn't own the project
 *
 * @example
 * ```typescript
 * const user = await getAuthUser();
 * await verifyProjectOwnership(projectId, user.id);
 * // ownership verified
 * ```
 */
export async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<void> {
  const supabase = createClient(cookies());

  const { data: project, error } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error) {
    throw new ForbiddenError('Project not found');
  }

  if (project.user_id !== userId) {
    throw new ForbiddenError('You do not own this project');
  }
}

/**
 * Verify user owns a project and return project
 * Combines authentication + ownership verification
 *
 * @example
 * ```typescript
 * const { user, project, error } = await requireProjectOwnership(projectId);
 * if (error) return error;
 * // user owns project
 * ```
 */
export async function requireProjectOwnership(projectId: string): Promise<
  | {
      user: User;
      project: { id: string; user_id: string };
      error: null;
    }
  | { user: null; project: null; error: NextResponse }
> {
  try {
    const user = await getAuthUser();
    const supabase = createClient(cookies());

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (error) {
      return {
        user: null,
        project: null,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Project not found',
            },
          },
          { status: 404 }
        ),
      };
    }

    if (project.user_id !== user.id) {
      return {
        user: null,
        project: null,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not own this project',
            },
          },
          { status: 403 }
        ),
      };
    }

    return { user, project, error: null };
  } catch (error) {
    return {
      user: null,
      project: null,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      ),
    };
  }
}

/**
 * Handle auth errors in API routes
 * Converts AuthError exceptions to proper JSON responses
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   try {
 *     const user = await getAuthUser();
 *     // ... your logic
 *   } catch (error) {
 *     return handleAuthError(error);
 *   }
 * }
 * ```
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code:
            error instanceof UnauthorizedError ? 'UNAUTHORIZED' : 'FORBIDDEN',
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  // Unknown error
  console.error('Unexpected auth error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}
