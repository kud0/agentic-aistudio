/**
 * Tests for Cost Tracker implementation
 * Tests cost logging, aggregation, and statistics
 */

import { CostTracker } from '../cost-tracker';
import { CostEntry } from '../types';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('Basic Operations', () => {
    it('should log cost entries', async () => {
      const entry: CostEntry = {
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      };

      await tracker.log(entry);

      expect(tracker.getTotalCost()).toBe(0.005);
      expect(tracker.getLogs()).toHaveLength(1);
    });

    it('should accumulate total cost', async () => {
      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'claude',
        model: 'claude-3-5-sonnet',
        tokens: 2000,
        cost: 0.030,
        timestamp: new Date(),
      });

      expect(tracker.getTotalCost()).toBeCloseTo(0.035, 5);
    });

    it('should clear all logs', () => {
      tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      tracker.clear();

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getLogs()).toHaveLength(0);
    });
  });

  describe('Cost by Provider', () => {
    beforeEach(async () => {
      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'grok',
        model: 'grok-2-mini',
        tokens: 500,
        cost: 0.001,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'claude',
        model: 'claude-3-5-sonnet',
        tokens: 2000,
        cost: 0.030,
        timestamp: new Date(),
      });
    });

    it('should calculate cost by provider', () => {
      expect(tracker.getCostByProvider('grok')).toBe(0.006);
      expect(tracker.getCostByProvider('claude')).toBe(0.030);
    });

    it('should return 0 for non-existent provider', () => {
      expect(tracker.getCostByProvider('openai')).toBe(0);
    });
  });

  describe('Cost by Model', () => {
    beforeEach(async () => {
      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'claude',
        model: 'claude-3-opus',
        tokens: 2000,
        cost: 0.120,
        timestamp: new Date(),
      });
    });

    it('should calculate cost by model', () => {
      expect(tracker.getCostByModel('grok-2-latest')).toBe(0.010);
      expect(tracker.getCostByModel('claude-3-opus')).toBe(0.120);
    });

    it('should return 0 for non-existent model', () => {
      expect(tracker.getCostByModel('nonexistent-model')).toBe(0);
    });
  });

  describe('Cost by Time Period', () => {
    it('should calculate cost for time period', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: twoHoursAgo,
      });

      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: oneHourAgo,
      });

      await tracker.log({
        provider: 'claude',
        model: 'claude-3-5-sonnet',
        tokens: 2000,
        cost: 0.030,
        timestamp: now,
      });

      // Cost for last hour
      const lastHourCost = tracker.getCostForPeriod(oneHourAgo, now);
      expect(lastHourCost).toBeCloseTo(0.035, 5); // 0.005 + 0.030

      // Cost for last two hours
      const lastTwoHoursCost = tracker.getCostForPeriod(twoHoursAgo, now);
      expect(lastTwoHoursCost).toBe(0.040); // All entries
    });

    it('should return 0 for period with no entries', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60 * 60 * 1000);

      const cost = tracker.getCostForPeriod(now, future);
      expect(cost).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'grok',
        model: 'grok-2-mini',
        tokens: 500,
        cost: 0.001,
        timestamp: new Date(),
      });

      await tracker.log({
        provider: 'claude',
        model: 'claude-3-5-sonnet',
        tokens: 2000,
        cost: 0.030,
        timestamp: new Date(),
      });
    });

    it('should calculate total statistics', () => {
      const stats = tracker.getStats();

      expect(stats.totalCost).toBe(0.036);
      expect(stats.totalLogs).toBe(3);
      expect(stats.totalTokens).toBe(3500);
      expect(stats.avgCostPerRequest).toBeCloseTo(0.012, 5);
    });

    it('should break down cost by provider', () => {
      const stats = tracker.getStats();

      expect(stats.costByProvider).toEqual({
        grok: 0.006,
        claude: 0.030,
      });
    });

    it('should break down cost by model', () => {
      const stats = tracker.getStats();

      expect(stats.costByModel).toEqual({
        'grok-2-latest': 0.005,
        'grok-2-mini': 0.001,
        'claude-3-5-sonnet': 0.030,
      });
    });

    it('should handle empty tracker statistics', () => {
      const emptyTracker = new CostTracker();
      const stats = emptyTracker.getStats();

      expect(stats.totalCost).toBe(0);
      expect(stats.totalLogs).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.avgCostPerRequest).toBe(0);
    });
  });

  describe('Log Management', () => {
    it('should return all logs', async () => {
      const entries = [
        {
          provider: 'grok',
          model: 'grok-2-latest',
          tokens: 1000,
          cost: 0.005,
          timestamp: new Date(),
        },
        {
          provider: 'claude',
          model: 'claude-3-5-sonnet',
          tokens: 2000,
          cost: 0.030,
          timestamp: new Date(),
        },
      ];

      for (const entry of entries) {
        await tracker.log(entry);
      }

      const logs = tracker.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].provider).toBe('grok');
      expect(logs[1].provider).toBe('claude');
    });

    it('should return copy of logs (not reference)', async () => {
      await tracker.log({
        provider: 'grok',
        model: 'grok-2-latest',
        tokens: 1000,
        cost: 0.005,
        timestamp: new Date(),
      });

      const logs = tracker.getLogs();
      logs.push({
        provider: 'fake',
        model: 'fake',
        tokens: 0,
        cost: 0,
        timestamp: new Date(),
      });

      // Original logs should be unchanged
      expect(tracker.getLogs()).toHaveLength(1);
    });
  });

  describe('High Volume', () => {
    it('should handle many log entries efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        await tracker.log({
          provider: i % 2 === 0 ? 'grok' : 'claude',
          model: 'test-model',
          tokens: 100,
          cost: 0.001,
          timestamp: new Date(),
        });
      }

      const duration = Date.now() - startTime;

      expect(tracker.getLogs()).toHaveLength(1000);
      expect(tracker.getTotalCost()).toBeCloseTo(1.0, 5);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
});
