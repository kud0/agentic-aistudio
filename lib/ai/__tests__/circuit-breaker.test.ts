/**
 * Tests for Circuit Breaker implementation
 * Tests state transitions, failure thresholds, and recovery
 */

import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(
      3,     // failureThreshold
      2,     // successThreshold
      1000   // timeout (1 second for faster tests)
    );
  });

  describe('State Transitions', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe('closed');
      expect(breaker.isOpen()).toBe(false);
    });

    it('should open after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('closed');

      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
      expect(breaker.isOpen()).toBe(true);
    });

    it('should transition to half-open after timeout', async () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now be half-open (triggered by isOpen() check)
      expect(breaker.isOpen()).toBe(false); // Triggers transition
      expect(breaker.getState()).toBe('half-open');
    });

    it('should close from half-open after success threshold', async () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      // Wait and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(breaker.isOpen()).toBe(false); // Triggers transition to half-open
      expect(breaker.getState()).toBe('half-open');

      // Record successes
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('half-open');

      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
    });

    it('should reopen from half-open on failure', async () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      // Wait and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(breaker.isOpen()).toBe(false); // Triggers transition to half-open
      expect(breaker.getState()).toBe('half-open');

      // Fail again - should reopen
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('Failure Tracking', () => {
    it('should track failure count', () => {
      breaker.recordFailure();
      breaker.recordFailure();

      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(2);
    });

    it('should reset failure count on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getMetrics().failureCount).toBe(2);

      breaker.recordSuccess();
      expect(breaker.getMetrics().failureCount).toBe(0);
    });

    it('should record last failure time', () => {
      const before = Date.now();
      breaker.recordFailure();
      const after = Date.now();

      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTime).toBeDefined();
      expect(metrics.lastFailureTime!.getTime()).toBeGreaterThanOrEqual(before);
      expect(metrics.lastFailureTime!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Manual Reset', () => {
    it('should manually reset circuit', () => {
      // Open circuit
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      // Manual reset
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.getMetrics().failureCount).toBe(0);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom failure threshold', () => {
      const customBreaker = new CircuitBreaker(5, 2, 60000); // 5 failures threshold

      for (let i = 0; i < 4; i++) {
        customBreaker.recordFailure();
        expect(customBreaker.getState()).toBe('closed');
      }

      customBreaker.recordFailure();
      expect(customBreaker.getState()).toBe('open');
    });

    it('should respect custom success threshold', async () => {
      const customBreaker = new CircuitBreaker(3, 3, 1000); // 3 successes threshold

      // Open circuit
      customBreaker.recordFailure();
      customBreaker.recordFailure();
      customBreaker.recordFailure();
      expect(customBreaker.getState()).toBe('open');

      // Wait and transition to half-open
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(customBreaker.isOpen()).toBe(false); // Triggers half-open

      // Need 3 successes to close
      customBreaker.recordSuccess();
      customBreaker.recordSuccess();
      expect(customBreaker.getState()).toBe('half-open');

      customBreaker.recordSuccess();
      expect(customBreaker.getState()).toBe('closed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive failures', () => {
      for (let i = 0; i < 10; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe('open');
      expect(breaker.getMetrics().failureCount).toBeGreaterThanOrEqual(3);
    });

    it('should handle rapid successive successes', () => {
      for (let i = 0; i < 10; i++) {
        breaker.recordSuccess();
      }

      expect(breaker.getState()).toBe('closed');
      expect(breaker.getMetrics().failureCount).toBe(0);
    });
  });
});
