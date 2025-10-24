/**
 * Auth Helper Functions
 *
 * Business logic helpers for authentication, budgets, and usage tracking.
 * All functions properly enforce user isolation through auth.uid().
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Inserts } from '@/types/supabase';

/**
 * Budget check result
 */
export interface BudgetCheck {
  allowed: boolean;
  totalCost: number;
  remaining: number;
  maxBudget: number;
  message?: string;
}

/**
 * Check if project budget is exceeded
 * Only returns data for projects the user owns (enforced by RLS)
 *
 * @param projectId - Project ID to check
 * @param userId - User ID (must own the project)
 * @param maxBudget - Maximum allowed budget in USD
 */
export async function checkProjectBudget(
  projectId: string,
  userId: string,
  maxBudget: number = 100.0
): Promise<BudgetCheck> {
  const supabase = createClient(cookies());

  // Verify ownership first
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project || project.user_id !== userId) {
    throw new Error('Project not found or access denied');
  }

  // Get total cost (RLS ensures only user's logs are returned)
  const { data: logs, error } = await supabase
    .from('llm_usage_logs')
    .select('cost_usd')
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching project budget:', error);
    throw new Error('Failed to check project budget');
  }

  const totalCost = logs?.reduce((sum, log) => sum + Number(log.cost_usd), 0) || 0;
  const remaining = maxBudget - totalCost;
  const exceeded = totalCost >= maxBudget;

  return {
    allowed: !exceeded,
    totalCost,
    remaining,
    maxBudget,
    message: exceeded
      ? `Project budget exceeded ($${totalCost.toFixed(2)} / $${maxBudget.toFixed(2)})`
      : undefined,
  };
}

/**
 * Check if user's 30-day budget is exceeded
 * Only returns data for the authenticated user (enforced by RLS)
 *
 * @param userId - User ID to check
 * @param maxBudget - Maximum allowed budget in USD (30 days)
 */
export async function checkUserBudget(
  userId: string,
  maxBudget: number = 500.0
): Promise<BudgetCheck> {
  const supabase = createClient(cookies());

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get total cost for last 30 days (RLS ensures only user's logs)
  const { data: logs, error } = await supabase
    .from('llm_usage_logs')
    .select('cost_usd')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching user budget:', error);
    throw new Error('Failed to check user budget');
  }

  const totalCost = logs?.reduce((sum, log) => sum + Number(log.cost_usd), 0) || 0;
  const remaining = maxBudget - totalCost;
  const exceeded = totalCost >= maxBudget;

  return {
    allowed: !exceeded,
    totalCost,
    remaining,
    maxBudget,
    message: exceeded
      ? `30-day budget exceeded ($${totalCost.toFixed(2)} / $${maxBudget.toFixed(2)})`
      : undefined,
  };
}

/**
 * Check both project and user budgets
 * Returns first budget that's exceeded, or allows if both are OK
 *
 * @param projectId - Project ID to check
 * @param userId - User ID to check
 * @param projectMax - Max project budget
 * @param userMax - Max user 30-day budget
 */
export async function checkBudgets(
  projectId: string,
  userId: string,
  projectMax: number = 100.0,
  userMax: number = 500.0
): Promise<BudgetCheck> {
  const [projectBudget, userBudget] = await Promise.all([
    checkProjectBudget(projectId, userId, projectMax),
    checkUserBudget(userId, userMax),
  ]);

  // Return first exceeded budget
  if (!projectBudget.allowed) {
    return projectBudget;
  }

  if (!userBudget.allowed) {
    return userBudget;
  }

  // Both OK
  return {
    allowed: true,
    totalCost: projectBudget.totalCost,
    remaining: Math.min(projectBudget.remaining, userBudget.remaining),
    maxBudget: projectMax,
  };
}

/**
 * Log LLM usage to database
 * Creates a usage log entry that's associated with the user
 *
 * @param params - Usage log parameters
 */
export async function logLLMUsage(
  params: Omit<Inserts<'llm_usage_logs'>, 'id' | 'created_at' | 'total_tokens'>
): Promise<void> {
  const supabase = createClient(cookies());

  const { error } = await supabase.from('llm_usage_logs').insert({
    ...params,
    cached: params.cached ?? false,
    metadata: params.metadata ?? {},
  } as any);

  if (error) {
    console.error('Error logging LLM usage:', error);
    throw new Error('Failed to log LLM usage');
  }
}

/**
 * Save LLM output to database
 * Creates an output entry that's associated with a project
 *
 * @param params - Output parameters
 */
export async function saveLLMOutput(params: {
  projectId: string;
  section: string;
  content: string;
}): Promise<{ id: string }> {
  const supabase = createClient(cookies());

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      project_id: params.projectId,
      section: params.section,
      content: params.content,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error saving output:', error);
    throw new Error('Failed to save output');
  }

  return data;
}

/**
 * Update project status
 * Only updates projects the user owns (enforced by ownership check)
 *
 * @param projectId - Project ID
 * @param userId - User ID (must own project)
 * @param status - New status
 */
export async function updateProjectStatus(
  projectId: string,
  userId: string,
  status: 'draft' | 'running' | 'completed' | 'failed'
): Promise<void> {
  const supabase = createClient(cookies());

  // Verify ownership
  const { data: project, error: ownershipError } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (ownershipError || !project || project.user_id !== userId) {
    throw new Error('Project not found or access denied');
  }

  // Update status
  const { error } = await supabase
    .from('projects')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating project status:', error);
    throw new Error('Failed to update project status');
  }
}

/**
 * Get user's usage statistics
 * Returns usage data for the authenticated user only
 *
 * @param userId - User ID
 * @param timeframe - Time period ('24h', '7d', '30d', 'all')
 */
export async function getUserUsageStats(
  userId: string,
  timeframe: '24h' | '7d' | '30d' | 'all' = '30d'
) {
  const supabase = createClient(cookies());

  let dateFilter = new Date();
  if (timeframe === '24h') {
    dateFilter.setHours(dateFilter.getHours() - 24);
  } else if (timeframe === '7d') {
    dateFilter.setDate(dateFilter.getDate() - 7);
  } else if (timeframe === '30d') {
    dateFilter.setDate(dateFilter.getDate() - 30);
  }

  const query = supabase
    .from('llm_usage_logs')
    .select('*')
    .eq('user_id', userId);

  if (timeframe !== 'all') {
    query.gte('created_at', dateFilter.toISOString());
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error('Error fetching usage stats:', error);
    throw new Error('Failed to fetch usage statistics');
  }

  // Calculate aggregates
  const totalCost = logs?.reduce((sum, log) => sum + Number(log.cost_usd), 0) || 0;
  const totalTokens = logs?.reduce((sum, log) => sum + log.total_tokens, 0) || 0;
  const totalRequests = logs?.length || 0;

  // Group by provider
  const byProvider = logs?.reduce(
    (acc, log) => {
      if (!acc[log.provider]) {
        acc[log.provider] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[log.provider].cost += Number(log.cost_usd);
      acc[log.provider].tokens += log.total_tokens;
      acc[log.provider].requests += 1;
      return acc;
    },
    {} as Record<string, { cost: number; tokens: number; requests: number }>
  );

  // Group by agent type
  const byAgent = logs?.reduce(
    (acc, log) => {
      if (!acc[log.agent_type]) {
        acc[log.agent_type] = { cost: 0, tokens: 0, requests: 0 };
      }
      acc[log.agent_type].cost += Number(log.cost_usd);
      acc[log.agent_type].tokens += log.total_tokens;
      acc[log.agent_type].requests += 1;
      return acc;
    },
    {} as Record<string, { cost: number; tokens: number; requests: number }>
  );

  return {
    totalCost,
    totalTokens,
    totalRequests,
    byProvider,
    byAgent,
    logs: logs || [],
  };
}
