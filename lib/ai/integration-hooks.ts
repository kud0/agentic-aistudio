/**
 * Integration Hooks for Quality Scoring
 * Helper functions to integrate quality scoring into API routes
 */

import { qualityScorer, type OutputType } from './quality-scorer';
import { healthMonitor } from './health-monitor';
import type { QualityScore, ProviderHealth } from './types';

/**
 * Hook: Score output after generation
 * Call this after any AI output is generated
 *
 * @example
 * const output = await generateAIOutput(...);
 * await scoreAfterGeneration(output.content, 'research', output.id);
 */
export async function scoreAfterGeneration(
  content: string,
  type: OutputType,
  outputId: string
): Promise<QualityScore | null> {
  try {
    const result = await qualityScorer.scoreOutput(content, type, outputId);

    if (result.success && result.score) {
      // Log for monitoring
      console.log(
        `[Quality] Scored output ${outputId}: ${result.score.overall}/100 ${
          result.score.flagged_for_review ? '(FLAGGED)' : ''
        }`
      );

      // Alert if flagged
      if (result.score.flagged_for_review) {
        console.warn(
          `[Quality] Output ${outputId} flagged for review. Reason: ${result.score.reasoning}`
        );
        // TODO: Send alert to quality review team
      }

      return result.score;
    }

    return null;
  } catch (error) {
    console.error('[Quality] Scoring failed:', error);
    return null;
  }
}

/**
 * Hook: Check provider health before making request
 * Returns true if provider is healthy, false if degraded/down
 *
 * @example
 * const isHealthy = await checkProviderBeforeRequest('grok');
 * if (!isHealthy) {
 *   // Use fallback provider
 * }
 */
export async function checkProviderBeforeRequest(
  provider: string
): Promise<boolean> {
  try {
    const statuses = await healthMonitor.getHealthStatuses();
    const providerStatus = statuses.find((s) => s.provider === provider);

    if (!providerStatus) {
      console.warn(`[Health] No health status found for ${provider}`);
      return true; // Allow request if no data
    }

    const isHealthy = providerStatus.status === 'healthy';

    if (!isHealthy) {
      console.warn(
        `[Health] Provider ${provider} is ${providerStatus.status}. Consider fallback.`
      );
    }

    return isHealthy;
  } catch (error) {
    console.error('[Health] Health check failed:', error);
    return true; // Allow request on error
  }
}

/**
 * Hook: Log successful LLM usage
 * Call this after successful API call
 */
export async function logLLMUsage(data: {
  provider: string;
  model: string;
  agentType: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs: number;
  cached?: boolean;
  projectId?: string;
  userId?: string;
}): Promise<void> {
  // Import here to avoid circular dependencies
  const { createClient } = await import('@/lib/supabase/client');

  try {
    const supabase = createClient();

    await supabase.from('llm_usage_logs').insert({
      provider: data.provider,
      model: data.model,
      agent_type: data.agentType,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: data.promptTokens + data.completionTokens,
      cost_usd: data.cost,
      latency_ms: data.latencyMs,
      cached: data.cached || false,
      project_id: data.projectId,
      user_id: data.userId,
      finish_reason: 'success',
      created_at: new Date().toISOString(),
    } as any);

    console.log(`[Usage] Logged ${data.provider} usage: $${data.cost.toFixed(4)}`);
  } catch (error) {
    console.error('[Usage] Failed to log usage:', error);
  }
}

/**
 * Hook: Log failed LLM request
 * Call this when API call fails
 */
export async function logLLMError(data: {
  provider: string;
  model: string;
  agentType: string;
  error: string;
  latencyMs?: number;
  projectId?: string;
  userId?: string;
}): Promise<void> {
  const { createClient } = await import('@/lib/supabase/client');

  try {
    const supabase = createClient();

    await supabase.from('llm_usage_logs').insert({
      provider: data.provider,
      model: data.model,
      agent_type: data.agentType,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      latency_ms: data.latencyMs || 0,
      cached: false,
      project_id: data.projectId,
      user_id: data.userId,
      finish_reason: 'error',
      error_message: data.error,
      created_at: new Date().toISOString(),
    } as any);

    console.error(`[Usage] Logged ${data.provider} error: ${data.error}`);
  } catch (error) {
    console.error('[Usage] Failed to log error:', error);
  }
}

/**
 * Hook: Batch score multiple outputs
 * Use for bulk scoring operations
 */
export async function batchScoreOutputs(
  outputs: Array<{ content: string; type: OutputType; id: string }>
): Promise<QualityScore[]> {
  try {
    const results = await qualityScorer.scoreMultiple(outputs);

    const scores = results
      .filter((r) => r.success && r.score)
      .map((r) => r.score!);

    console.log(`[Quality] Batch scored ${scores.length} outputs`);

    return scores;
  } catch (error) {
    console.error('[Quality] Batch scoring failed:', error);
    return [];
  }
}

/**
 * Hook: Get quality gate status
 * Returns true if quality is acceptable, false if below threshold
 */
export async function qualityGateCheck(
  content: string,
  type: OutputType,
  threshold: number = 60
): Promise<{ passed: boolean; score?: QualityScore }> {
  try {
    const result = await qualityScorer.scoreOutput(content, type);

    if (result.success && result.score) {
      const passed = result.score.overall >= threshold;

      if (!passed) {
        console.warn(
          `[Quality Gate] FAILED: Score ${result.score.overall} below threshold ${threshold}`
        );
      }

      return { passed, score: result.score };
    }

    // Default to pass if scoring fails (don't block production)
    return { passed: true };
  } catch (error) {
    console.error('[Quality Gate] Check failed:', error);
    return { passed: true }; // Fail open
  }
}
