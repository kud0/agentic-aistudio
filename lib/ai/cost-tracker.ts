/**
 * Cost Tracker - Monitor and log LLM usage costs
 * Integrates with Supabase for persistent logging
 */

// Note: Supabase client import will be added when Supabase is set up
// import { createClient } from '@/lib/supabase/server';

export interface CostLog {
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  projectId?: string;
  userId?: string;
  agentType?: string;
}

export class CostTracker {
  private inMemoryLogs: CostLog[] = [];
  private totalCost = 0;

  /**
   * Log an LLM usage event
   */
  async log(entry: CostLog): Promise<void> {
    // Store in memory for MVP (will add Supabase integration later)
    this.inMemoryLogs.push(entry);
    this.totalCost += entry.cost;

    console.log(`[Cost Log] Provider: ${entry.provider}, Model: ${entry.model}, Tokens: ${entry.tokens}, Cost: $${entry.cost.toFixed(4)}`);

    // TODO: Add Supabase integration when database is set up
    /*
    const supabase = createClient();
    await supabase.from('llm_usage_logs').insert({
      provider: entry.provider,
      model: entry.model,
      prompt_tokens: Math.floor(entry.tokens * 0.3), // Estimate
      completion_tokens: Math.floor(entry.tokens * 0.7),
      total_tokens: entry.tokens,
      cost_usd: entry.cost,
      project_id: entry.projectId,
      user_id: entry.userId,
      agent_type: entry.agentType,
      created_at: entry.timestamp
    });
    */
  }

  /**
   * Get total cost for a project
   */
  async getProjectCost(projectId: string): Promise<number> {
    // In-memory implementation
    const projectLogs = this.inMemoryLogs.filter(log => log.projectId === projectId);
    return projectLogs.reduce((sum, log) => sum + log.cost, 0);

    // TODO: Supabase implementation
    /*
    const supabase = createClient();
    const { data } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .eq('project_id', projectId);

    return data?.reduce((sum, row) => sum + row.cost_usd, 0) || 0;
    */
  }

  /**
   * Get total cost for a user
   */
  async getUserCost(userId: string, startDate?: Date): Promise<number> {
    // In-memory implementation
    const userLogs = this.inMemoryLogs.filter(log => {
      if (log.userId !== userId) return false;
      if (startDate && log.timestamp < startDate) return false;
      return true;
    });
    return userLogs.reduce((sum, log) => sum + log.cost, 0);

    // TODO: Supabase implementation
    /*
    const supabase = createClient();
    let query = supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data } = await query;
    return data?.reduce((sum, row) => sum + row.cost_usd, 0) || 0;
    */
  }

  /**
   * Get daily cost across all users
   */
  async getDailyCost(date?: Date): Promise<number> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // In-memory implementation
    const dailyLogs = this.inMemoryLogs.filter(log =>
      log.timestamp >= startOfDay && log.timestamp <= endOfDay
    );
    return dailyLogs.reduce((sum, log) => sum + log.cost, 0);

    // TODO: Supabase implementation
    /*
    const supabase = createClient();
    const { data } = await supabase
      .from('llm_usage_logs')
      .select('cost_usd')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    return data?.reduce((sum, row) => sum + row.cost_usd, 0) || 0;
    */
  }

  /**
   * Get usage statistics by provider
   */
  async getProviderStats(): Promise<Record<string, { tokens: number; cost: number; calls: number }>> {
    const stats: Record<string, { tokens: number; cost: number; calls: number }> = {};

    for (const log of this.inMemoryLogs) {
      if (!stats[log.provider]) {
        stats[log.provider] = { tokens: 0, cost: 0, calls: 0 };
      }
      stats[log.provider].tokens += log.tokens;
      stats[log.provider].cost += log.cost;
      stats[log.provider].calls++;
    }

    return stats;
  }

  /**
   * Get usage statistics by model
   */
  async getModelStats(): Promise<Record<string, { tokens: number; cost: number; calls: number }>> {
    const stats: Record<string, { tokens: number; cost: number; calls: number }> = {};

    for (const log of this.inMemoryLogs) {
      const key = `${log.provider}/${log.model}`;
      if (!stats[key]) {
        stats[key] = { tokens: 0, cost: 0, calls: 0 };
      }
      stats[key].tokens += log.tokens;
      stats[key].cost += log.cost;
      stats[key].calls++;
    }

    return stats;
  }

  /**
   * Get total cost tracked in memory
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs(): CostLog[] {
    return [...this.inMemoryLogs];
  }

  /**
   * Clear in-memory logs (for testing)
   */
  clear(): void {
    this.inMemoryLogs = [];
    this.totalCost = 0;
  }

  /**
   * Get cost by provider
   */
  getCostByProvider(provider: string): number {
    return this.inMemoryLogs
      .filter(log => log.provider === provider)
      .reduce((sum, log) => sum + log.cost, 0);
  }

  /**
   * Get cost by model
   */
  getCostByModel(model: string): number {
    return this.inMemoryLogs
      .filter(log => log.model === model)
      .reduce((sum, log) => sum + log.cost, 0);
  }

  /**
   * Get cost for a specific time period
   */
  getCostForPeriod(startDate: Date, endDate: Date): number {
    return this.inMemoryLogs
      .filter(log => log.timestamp >= startDate && log.timestamp <= endDate)
      .reduce((sum, log) => sum + log.cost, 0);
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalTokens = this.inMemoryLogs.reduce((sum, log) => sum + log.tokens, 0);
    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};

    for (const log of this.inMemoryLogs) {
      costByProvider[log.provider] = (costByProvider[log.provider] || 0) + log.cost;
      costByModel[log.model] = (costByModel[log.model] || 0) + log.cost;
    }

    return {
      totalCost: this.totalCost,
      totalLogs: this.inMemoryLogs.length,
      totalTokens,
      avgCostPerRequest: this.inMemoryLogs.length > 0 ? this.totalCost / this.inMemoryLogs.length : 0,
      costByProvider,
      costByModel,
    };
  }
}
