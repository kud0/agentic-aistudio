/**
 * Critique API Route
 *
 * Endpoint for generating critiques and recommendations for brand strategies.
 *
 * Flow:
 * 1. Authenticate user with Supabase
 * 2. Validate project ownership
 * 3. Check budget limits (project, user, daily)
 * 4. Load strategy data as context
 * 5. Generate critique using LLMProviderManager
 * 6. Save output to database
 * 7. Log usage and costs
 * 8. Return response with metadata
 *
 * @route POST /api/ai/critique
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/ai/critique', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${token}`,
 *   },
 *   body: JSON.stringify({
 *     projectId: '123',
 *     strategyId: '789',
 *     focusAreas: ['positioning', 'messaging'],
 *   }),
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireProjectOwnership, handleAuthError } from '@/lib/auth/middleware';
import { checkBudgets, logLLMUsage, saveLLMOutput } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';

/**
 * Request body interface
 */
interface CritiqueRequest {
  projectId: string;
  strategyId?: string; // Optional: use existing strategy
  strategyData?: string; // Optional: provide strategy directly
  focusAreas?: string[]; // Optional: specific areas to critique
  options?: {
    model?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Response interface
 */
interface CritiqueResponse {
  success: boolean;
  data?: {
    critique: string;
    recommendations: string[];
    score?: number; // 0-100
    metadata: {
      model: string;
      provider: string;
      tokensUsed: number;
      cost: number;
      latencyMs: number;
      cached: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * POST /api/ai/critique
 *
 * Generate critique and recommendations for a strategy.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body: CritiqueRequest = await request.json();

    if (!body.projectId || (!body.strategyId && !body.strategyData)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'projectId and (strategyId or strategyData) are required',
          },
        },
        { status: 400 }
      );
    }

    // 2. Authenticate and verify project ownership
    const { user, project, error: authError } = await requireProjectOwnership(body.projectId);
    if (authError) return authError;

    // 3. Load strategy data if strategyId provided
    let strategyContext = body.strategyData || '';

    if (body.strategyId && !strategyContext) {
      const supabase = await createClient();
      const { data: strategy, error: fetchError } = await supabase
        .from('outputs')
        .select('content')
        .eq('id', body.strategyId)
        .eq('project_id', body.projectId)
        .eq('section', 'strategy')
        .single();

      if (fetchError || !strategy) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Strategy not found' } },
          { status: 404 }
        );
      }

      strategyContext = (strategy as { content: string }).content;
    }

    // 4. Check budget limits (critique tasks are cheaper)
    const budgetCheck = await checkBudgets(body.projectId, user.id);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BUDGET_EXCEEDED',
            message: budgetCheck.message || 'Budget exceeded',
          },
        },
        { status: 429 }
      );
    }

    // TODO: 6. Get LLM Provider Manager
    // import { getLLMProviderManager } from '@/lib/ai/manager';
    // const manager = getLLMProviderManager();

    // TODO: 7. Load critique prompt template
    // import { createCritiquePrompt } from '@/lib/ai/prompts/critique';
    // const prompt = createCritiquePrompt({
    //   strategy: strategyContext,
    //   focusAreas: body.focusAreas,
    //   industry: project.data.industry,
    // });

    // TODO: 8. Generate critique
    // Critique tasks can use cheaper models (Haiku or Grok)
    // const result = await manager.generateCompletion({
    //   prompt,
    //   systemPrompt: 'You are a critical brand strategist...',
    //   taskType: 'critique',
    //   model: body.options?.model,
    //   provider: body.options?.provider,
    //   temperature: body.options?.temperature ?? 0.7,
    //   maxTokens: body.options?.maxTokens ?? 4096,
    //   metadata: {
    //     projectId: body.projectId,
    //     userId: session.user.id,
    //     taskType: 'critique',
    //   },
    // });

    // TODO: 9. Parse critique response (extract score and recommendations)
    // const parsed = parseCritiqueResponse(result.content);

    // TODO: 10. Save critique to database
    // await supabase.from('critique_outputs').insert({
    //   project_id: body.projectId,
    //   strategy_id: body.strategyId,
    //   content: result.content,
    //   score: parsed.score,
    //   recommendations: parsed.recommendations,
    //   model: result.model,
    //   provider: result.providerId,
    //   tokens_used: result.usage.totalTokens,
    //   cost: result.cost,
    //   latency_ms: result.latencyMs,
    //   created_by: session.user.id,
    // });

    // TODO: 11. Log usage for analytics
    // await supabase.from('llm_usage_logs').insert({
    //   user_id: session.user.id,
    //   project_id: body.projectId,
    //   provider: result.providerId,
    //   model: result.model,
    //   task_type: 'critique',
    //   prompt_tokens: result.usage.promptTokens,
    //   completion_tokens: result.usage.completionTokens,
    //   total_tokens: result.usage.totalTokens,
    //   cost: result.cost,
    //   latency_ms: result.latencyMs,
    //   cached: result.cached,
    //   success: true,
    // });

    // TODO: 12. Return success response
    return NextResponse.json({
      success: true,
      data: {
        critique: 'TODO: Implement critique generation',
        recommendations: [
          'TODO: Extract recommendations from critique',
        ],
        score: 75,
        metadata: {
          model: 'claude-3-5-haiku-20241022',
          provider: 'claude',
          tokensUsed: 0,
          cost: 0,
          latencyMs: 0,
          cached: false,
        },
      },
    });

  } catch (error) {
    console.error('Critique generation error:', error);
    return handleAuthError(error);
  }
}

/**
 * GET /api/ai/critique
 *
 * Get previous critiques for a project or strategy.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'projectId is required' } },
        { status: 400 }
      );
    }

    // Authenticate and verify project ownership
    const { user, error: authError } = await requireProjectOwnership(projectId);
    if (authError) return authError;

    // TODO: Fetch critique outputs from database
    // const supabase = createClient(cookies());
    // const { data: critiques } = await supabase
    //   .from('outputs')
    //   .select('*')
    //   .eq('project_id', projectId)
    //   .eq('section', 'critique')
    //   .order('created_at', { ascending: false })
    //   .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        critiques: [],
      },
    });

  } catch (error) {
    console.error('Critique fetch error:', error);
    return handleAuthError(error);
  }
}

/**
 * Helper function to parse critique response
 *
 * TODO: Implement parsing logic
 * - Extract numeric score
 * - Extract bullet points as recommendations
 * - Handle various response formats
 */
function parseCritiqueResponse(content: string): { score: number; recommendations: string[] } {
  // Placeholder implementation
  return {
    score: 75,
    recommendations: ['TODO: Parse recommendations from critique'],
  };
}
