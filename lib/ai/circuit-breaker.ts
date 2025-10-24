/**
 * Circuit Breaker - Fault Tolerance for Providers
 * Prevents cascading failures by skipping unhealthy providers
 */

import { CircuitState } from './types';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;

  constructor(
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private timeout: number = 60000 // 60 seconds
  ) {}

  /**
   * Check if circuit is open (provider should be skipped)
   */
  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if timeout has passed
      const now = new Date();
      if (this.lastFailureTime &&
          now.getTime() - this.lastFailureTime.getTime() > this.timeout) {
        // Transition to half-open to test provider
        this.state = 'half-open';
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        // Provider is healthy again
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      // Open the circuit
      this.state = 'open';
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
