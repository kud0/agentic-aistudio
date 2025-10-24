/**
 * Provider Health Monitor
 * Monitors AI provider health, tracks error rates, latency, and availability
 */

import { createClient } from '@/lib/supabase/client';
import type { ProviderHealth, ProviderName, HealthCheckResult } from './types';

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

interface ProviderHealthRow {
  provider: string;
  status: string;
  error_rate: number;
  avg_latency_ms: number;
  last_error?: string | null;
  last_success_at?: string | null;
  last_checked: string;
  circuit_breaker_state?: string | null;
}

/**
 * Health Monitor Configuration
 */
interface HealthConfig {
  errorRateThreshold: {
    down: number; // > this = down
    degraded: number; // > this = degraded
  };
  latencyThreshold: number; // ms, > this = degraded
  checkWindow: number; // minutes to look back
}

/**
 * Provider Health Monitor Class
 * Tracks and reports on provider health status
 */
export class ProviderHealthMonitor {
  private config: HealthConfig = {
    errorRateThreshold: {
      down: 0.5, // 50%+ errors = down
      degraded: 0.2, // 20%+ errors = degraded
    },
    latencyThreshold: 10000, // 10 seconds
    checkWindow: 60, // Last 60 minutes
  };

  /**
   * Check health of a specific provider
   * @param provider - Provider name to check
   * @returns Health status and metrics
   */
  async checkHealth(provider: ProviderName): Promise<HealthCheckResult> {
    try {
      const supabase = createClient();

      // Calculate time window for analysis
      const windowStart = new Date(
        Date.now() - this.config.checkWindow * 60 * 1000
      );

      // Fetch recent logs for this provider
      const { data: logs, error } = await supabase
        .from('llm_usage_logs')
        .select('*')
        .eq('provider', provider)
        .gte('created_at', windowStart.toISOString())
        .returns<LLMUsageLogRow[]>();

      if (error) {
        console.error(`Error fetching logs for ${provider}:`, error);
        return {
          success: false,
          error: 'Failed to fetch provider logs',
        };
      }

      // If no logs, return unknown status
      if (!logs || logs.length === 0) {
        const health: ProviderHealth = {
          provider,
          status: 'unknown',
          error_rate: 0,
          avg_latency_ms: 0,
          last_checked: new Date(),
          circuit_breaker_state: 'closed',
        };

        await this.saveHealthStatus(health);
        return { success: true, health };
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(logs);

      // Determine health status
      const status = this.determineStatus(metrics);

      // Find most recent error
      const lastError = logs
        .filter((log) => log.finish_reason === 'error')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Find most recent success
      const lastSuccess = logs
        .filter((log) => log.finish_reason !== 'error')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Construct health object
      const health: ProviderHealth = {
        provider,
        status,
        error_rate: metrics.errorRate,
        avg_latency_ms: metrics.avgLatency,
        last_error: lastError?.error_message ?? undefined,
        last_success_at: lastSuccess ? new Date(lastSuccess.created_at) : undefined,
        last_checked: new Date(),
        circuit_breaker_state: this.getCircuitBreakerState(status),
      };

      // Save to database
      await this.saveHealthStatus(health);

      return { success: true, health };
    } catch (error) {
      console.error(`Health check failed for ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check health of all configured providers
   * @returns Array of health results for all providers
   */
  async checkAllProviders(): Promise<HealthCheckResult[]> {
    const providers: ProviderName[] = ['grok', 'claude', 'openai'];

    // Check all providers in parallel for efficiency
    const results = await Promise.allSettled(
      providers.map((provider) => this.checkHealth(provider))
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: 'Health check failed' }
    );
  }

  /**
   * Calculate metrics from usage logs
   */
  private calculateMetrics(logs: any[]): {
    errorRate: number;
    avgLatency: number;
    totalRequests: number;
  } {
    const totalRequests = logs.length;
    const errors = logs.filter((log) => log.finish_reason === 'error').length;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    // Calculate average latency (exclude null/undefined values)
    const validLatencies = logs
      .map((log) => log.latency_ms)
      .filter((latency) => latency != null && latency > 0);

    const avgLatency =
      validLatencies.length > 0
        ? validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length
        : 0;

    return {
      errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimals
      avgLatency: Math.round(avgLatency),
      totalRequests,
    };
  }

  /**
   * Determine provider status based on metrics
   */
  private determineStatus(metrics: {
    errorRate: number;
    avgLatency: number;
  }): 'healthy' | 'degraded' | 'down' {
    // Down: High error rate
    if (metrics.errorRate > this.config.errorRateThreshold.down) {
      return 'down';
    }

    // Degraded: Moderate error rate or high latency
    if (
      metrics.errorRate > this.config.errorRateThreshold.degraded ||
      metrics.avgLatency > this.config.latencyThreshold
    ) {
      return 'degraded';
    }

    // Healthy: Low error rate and acceptable latency
    return 'healthy';
  }

  /**
   * Get circuit breaker state based on health status
   */
  private getCircuitBreakerState(
    status: 'healthy' | 'degraded' | 'down'
  ): 'closed' | 'open' | 'half-open' {
    switch (status) {
      case 'down':
        return 'open'; // Circuit open - prevent requests
      case 'degraded':
        return 'half-open'; // Circuit half-open - limited requests
      case 'healthy':
        return 'closed'; // Circuit closed - normal operation
      default:
        return 'closed';
    }
  }

  /**
   * Save health status to database
   */
  private async saveHealthStatus(health: ProviderHealth): Promise<void> {
    try {
      const supabase = createClient();

      // Upsert (insert or update) health record
      const healthRow: ProviderHealthRow = {
        provider: health.provider,
        status: health.status,
        error_rate: health.error_rate,
        avg_latency_ms: health.avg_latency_ms,
        last_error: health.last_error ?? null,
        last_success_at: health.last_success_at?.toISOString() ?? null,
        last_checked: health.last_checked.toISOString(),
        circuit_breaker_state: health.circuit_breaker_state ?? null,
      };

      const { error } = await supabase.from('provider_health').upsert(healthRow as any);

      if (error) {
        console.error('Failed to save health status:', error);
        throw new Error('Database upsert failed');
      }

      console.log(`Health status saved for ${health.provider}: ${health.status}`);
    } catch (error) {
      console.error('Error saving health status:', error);
      throw error;
    }
  }

  /**
   * Get current health status for all providers
   */
  async getHealthStatuses(): Promise<ProviderHealth[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('provider_health')
        .select('*')
        .order('last_checked', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching health statuses:', error);
      return [];
    }
  }

  /**
   * Get providers that are currently down or degraded
   */
  async getUnhealthyProviders(): Promise<ProviderHealth[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('provider_health')
        .select('*')
        .neq('status', 'healthy')
        .order('last_checked', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unhealthy providers:', error);
      return [];
    }
  }

  /**
   * Update health check configuration
   */
  setConfig(config: Partial<HealthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): HealthConfig {
    return { ...this.config };
  }

  /**
   * Alert on provider health issues
   * TODO: Integrate with notification system (email, Slack, etc.)
   */
  async alertOnHealthIssues(): Promise<void> {
    const unhealthy = await this.getUnhealthyProviders();

    if (unhealthy.length > 0) {
      console.warn('⚠️ Provider health issues detected:', unhealthy);
      // TODO: Send alerts via email/Slack/webhooks
      // Example:
      // await sendSlackAlert(`Providers down: ${unhealthy.map(h => h.provider).join(', ')}`);
    }
  }
}

/**
 * Export singleton instance
 */
export const healthMonitor = new ProviderHealthMonitor();
