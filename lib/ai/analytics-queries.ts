/**
 * Analytics Queries Module
 * Optimized database queries for AI usage analytics and cost tracking
 */

import { createClient } from '@/lib/supabase/client';
import type {
  AnalyticsData,
  AnalyticsSummary,
  CostBreakdown,
  ExpensivePrompt,
  QualityDistribution,
  ProviderName,
  AgentType,
} from './types';

/**
 * Analytics Timeframe Options
 */
export type Timeframe = '24h' | '7d' | '30d' | '90d' | 'all';

/**
 * Database Row Types
 */
interface LLMUsageLogRow {
  id: string;
  created_at: string;
  project_id: string;
  user_id: string;
  output_id: string | null;
  agent_type: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  finish_reason: string | null;
  cached: boolean;
  error_message: string | null;
  metadata: Record<string, any>;
}

interface QualityScoreRow {
  id: string;
  created_at: string;
  updated_at: string;
  output_id: string;
  project_id: string;
  completeness_score: number;
  coherence_score: number;
  actionability_score: number;
  overall_score: number;
  flag_for_review: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reasoning: string | null;
  improvement_suggestions: string[] | null;
  scoring_model: string | null;
  metadata: Record<string, any>;
}

/**
 * Analytics Query Service
 * Provides optimized queries for analytics dashboard
 */
export class AnalyticsQueries {
  /**
   * Get comprehensive analytics data for a timeframe
   * @param timeframe - Time period to analyze
   * @returns Complete analytics data structure
   */
  async getAnalytics(timeframe: Timeframe = '7d'): Promise<AnalyticsData> {
    try {
      // Execute all queries in parallel for performance
      const [summary, breakdown, expensivePrompts, qualityDist] = await Promise.all([
        this.getSummary(timeframe),
        this.getCostBreakdown(timeframe),
        this.getExpensivePrompts(10, timeframe),
        this.getQualityDistribution(timeframe),
      ]);

      return {
        summary,
        breakdown,
        expensive_prompts: expensivePrompts,
        quality_distribution: qualityDist,
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get summary metrics for the timeframe
   */
  async getSummary(timeframe: Timeframe = '7d'): Promise<AnalyticsSummary> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      // Fetch all logs in timeframe
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .returns<LLMUsageLogRow[]>();

      if (error) throw error;

      if (!logs || logs.length === 0) {
        return {
          total_cost: 0,
          total_requests: 0,
          avg_latency: 0,
          cache_hit_rate: 0,
          error_rate: 0,
        };
      }

      // Calculate metrics
      const totalCost = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
      const totalRequests = logs.length;
      const cachedRequests = logs.filter((log) => log.cached).length;
      const errors = logs.filter((log) => log.finish_reason === 'error').length;

      const validLatencies = logs
        .map((log) => log.latency_ms)
        .filter((lat) => lat != null && lat > 0);

      const avgLatency =
        validLatencies.length > 0
          ? validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length
          : 0;

      const cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;
      const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

      return {
        total_cost: Math.round(totalCost * 100) / 100,
        total_requests: totalRequests,
        avg_latency: Math.round(avgLatency),
        cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
        error_rate: Math.round(errorRate * 10) / 10,
      };
    } catch (error) {
      console.error('Error calculating summary:', error);
      throw error;
    }
  }

  /**
   * Get cost breakdown by various dimensions
   */
  async getCostBreakdown(timeframe: Timeframe = '7d'): Promise<CostBreakdown> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .returns<LLMUsageLogRow[]>();

      if (error) throw error;

      // Initialize breakdown structure
      const breakdown: CostBreakdown = {
        by_provider: {} as Record<ProviderName, number>,
        by_model: {},
        by_agent: {} as Record<AgentType, number>,
        by_day: {},
      };

      if (!logs || logs.length === 0) return breakdown;

      // Aggregate costs by provider
      logs.forEach((log) => {
        // By provider
        const provider = log.provider as ProviderName;
        breakdown.by_provider[provider] =
          (breakdown.by_provider[provider] || 0) + log.cost_usd;

        // By model
        breakdown.by_model[log.model] = (breakdown.by_model[log.model] || 0) + log.cost_usd;

        // By agent type
        const agent = log.agent_type as AgentType;
        breakdown.by_agent[agent] = (breakdown.by_agent[agent] || 0) + log.cost_usd;

        // By day (ISO date string)
        const day = new Date(log.created_at).toISOString().split('T')[0];
        breakdown.by_day[day] = (breakdown.by_day[day] || 0) + log.cost_usd;
      });

      // Round all values to 2 decimals
      this.roundBreakdownValues(breakdown);

      return breakdown;
    } catch (error) {
      console.error('Error calculating breakdown:', error);
      throw error;
    }
  }

  /**
   * Get most expensive prompts/requests
   */
  async getExpensivePrompts(
    limit: number = 10,
    timeframe: Timeframe = '7d'
  ): Promise<ExpensivePrompt[]> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('cost_usd', { ascending: false })
        .limit(limit)
        .returns<LLMUsageLogRow[]>();

      if (error) throw error;

      return (
        logs?.map((log) => ({
          id: log.id,
          agent_type: log.agent_type,
          provider: log.provider,
          model: log.model,
          tokens: log.total_tokens,
          cost: log.cost_usd,
          timestamp: new Date(log.created_at),
        })) || []
      );
    } catch (error) {
      console.error('Error fetching expensive prompts:', error);
      return [];
    }
  }

  /**
   * Get quality score distribution
   */
  async getQualityDistribution(timeframe: Timeframe = '7d'): Promise<QualityDistribution> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      const { data: scores, error } = await supabase
        .from('quality_scores')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .returns<QualityScoreRow[]>();

      if (error) throw error;

      const distribution: QualityDistribution = {
        excellent: 0, // 80-100
        good: 0, // 60-79
        fair: 0, // 40-59
        poor: 0, // 0-39
        flagged_count: 0,
      };

      if (!scores || scores.length === 0) return distribution;

      scores.forEach((score) => {
        const overall = score.overall_score;

        if (overall >= 80) distribution.excellent++;
        else if (overall >= 60) distribution.good++;
        else if (overall >= 40) distribution.fair++;
        else distribution.poor++;

        if (score.flag_for_review) distribution.flagged_count++;
      });

      return distribution;
    } catch (error) {
      console.error('Error calculating quality distribution:', error);
      return {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        flagged_count: 0,
      };
    }
  }

  /**
   * Get cost trend over time (for charts)
   */
  async getCostTrend(
    timeframe: Timeframe = '7d',
    granularity: 'hour' | 'day' = 'day'
  ): Promise<Array<{ timestamp: string; cost: number }>> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('created_at, cost_usd')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
        .returns<Pick<LLMUsageLogRow, 'created_at' | 'cost_usd'>[]>();

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Aggregate by time bucket
      const trend = new Map<string, number>();

      logs.forEach((log) => {
        const date = new Date(log.created_at);
        const bucket =
          granularity === 'day'
            ? date.toISOString().split('T')[0]
            : date.toISOString().split(':')[0] + ':00:00';

        trend.set(bucket, (trend.get(bucket) || 0) + log.cost_usd);
      });

      return Array.from(trend.entries()).map(([timestamp, cost]) => ({
        timestamp,
        cost: Math.round(cost * 100) / 100,
      }));
    } catch (error) {
      console.error('Error calculating cost trend:', error);
      return [];
    }
  }

  /**
   * Get cache hit rate over time
   */
  async getCacheHitRate(timeframe: Timeframe = '7d'): Promise<number> {
    const supabase = createClient();
    const startDate = this.getStartDate(timeframe);

    try {
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('cached')
        .gte('created_at', startDate.toISOString())
        .returns<Pick<LLMUsageLogRow, 'cached'>[]>();

      if (error) throw error;
      if (!logs || logs.length === 0) return 0;

      const cachedCount = logs.filter((log) => log.cached).length;
      return Math.round((cachedCount / logs.length) * 100 * 10) / 10;
    } catch (error) {
      console.error('Error calculating cache hit rate:', error);
      return 0;
    }
  }

  /**
   * Helper: Get start date for timeframe
   */
  private getStartDate(timeframe: Timeframe): Date {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(0); // Unix epoch
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Helper: Round all values in breakdown to 2 decimals
   */
  private roundBreakdownValues(breakdown: CostBreakdown): void {
    Object.keys(breakdown.by_provider).forEach((key) => {
      breakdown.by_provider[key as ProviderName] =
        Math.round(breakdown.by_provider[key as ProviderName] * 100) / 100;
    });

    Object.keys(breakdown.by_model).forEach((key) => {
      breakdown.by_model[key] = Math.round(breakdown.by_model[key] * 100) / 100;
    });

    Object.keys(breakdown.by_agent).forEach((key) => {
      breakdown.by_agent[key as AgentType] =
        Math.round(breakdown.by_agent[key as AgentType] * 100) / 100;
    });

    Object.keys(breakdown.by_day).forEach((key) => {
      breakdown.by_day[key] = Math.round(breakdown.by_day[key] * 100) / 100;
    });
  }
}

/**
 * Export singleton instance
 */
export const analyticsQueries = new AnalyticsQueries();
