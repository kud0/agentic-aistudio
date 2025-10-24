'use client';

import { useState, useEffect } from 'react';

export interface AnalyticsMetrics {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  successRate: number;
  avgLatency: number;
}

export interface UsageDataPoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export interface CostByProvider {
  name: string;
  cost: number;
  requests: number;
}

export interface TopProject {
  name: string;
  requests: number;
  cost: number;
}

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  avgLatency: number;
  errorRate: number;
  lastCheck: string;
}

export interface AnalyticsData {
  timeRange: string;
  metrics: AnalyticsMetrics;
  usageOverTime: UsageDataPoint[];
  costByProvider: CostByProvider[];
  topProjects: TopProject[];
}

export interface HealthData {
  providers: ProviderHealth[];
}

export function useAnalytics(timeRange: string = '7d') {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        // Map time range to API format
        const timeframeMap: Record<string, string> = {
          '7d': '7d',
          '30d': '30d',
          '90d': 'all', // Use 'all' for 90 days as API supports 24h, 7d, 30d, all
        };

        // Fetch usage data
        const usageResponse = await fetch(
          `/api/analytics/usage?timeframe=${timeframeMap[timeRange] || '7d'}`
        );
        if (!usageResponse.ok) throw new Error('Failed to fetch usage data');
        const rawUsageData = await usageResponse.json();

        // Fetch health data
        const healthResponse = await fetch('/api/analytics/health');
        if (!healthResponse.ok) throw new Error('Failed to fetch health data');
        const healthData = await healthResponse.json();

        // Transform API response to match our interface
        const transformedData = transformUsageData(rawUsageData, timeRange);
        setData(transformedData);
        setHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [timeRange]);

  return { data, health, loading, error };
}

// Transform API data to match expected interface
function transformUsageData(apiData: any, timeRange: string): AnalyticsData {
  const { totalCost, totalTokens, totalRequests, byProvider, byAgent, logs } = apiData;

  // Calculate success rate (assuming logs with status === 'success')
  const successfulRequests = logs?.filter((log: any) => log.status === 'success').length || 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

  // Calculate average latency
  const avgLatency =
    logs?.reduce((sum: number, log: any) => sum + (log.latency_ms || 0), 0) / (logs?.length || 1) || 0;

  // Group logs by date for usage over time
  const usageByDate = logs?.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
    }
    acc[date].requests += 1;
    acc[date].tokens += log.total_tokens || 0;
    acc[date].cost += Number(log.cost_usd) || 0;
    if (log.status === 'error') acc[date].errors += 1;
    return acc;
  }, {});

  // Convert to array and sort by date
  const usageOverTime = Object.entries(usageByDate || {}).map(([date, data]: [string, any]) => ({
    date,
    requests: data.requests,
    tokens: data.tokens,
    cost: data.cost,
    errors: data.errors,
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Transform provider data
  const costByProvider = Object.entries(byProvider || {}).map(([name, data]: [string, any]) => ({
    name,
    cost: data.cost,
    requests: data.requests,
  }));

  // Transform agent data to top projects
  const topProjects = Object.entries(byAgent || {}).map(([name, data]: [string, any]) => ({
    name,
    requests: data.requests,
    cost: data.cost,
  })).sort((a, b) => b.requests - a.requests).slice(0, 5);

  return {
    timeRange,
    metrics: {
      totalRequests,
      totalCost,
      totalTokens,
      successRate: parseFloat(successRate.toFixed(2)),
      avgLatency: Math.round(avgLatency),
    },
    usageOverTime,
    costByProvider,
    topProjects,
  };
}
