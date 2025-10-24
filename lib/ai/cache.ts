/**
 * Response Cache - Save costs by caching LLM responses
 * Memory-based implementation with TTL and LRU eviction
 */

import { LLMResponse } from './types';

export interface CacheEntry {
  response: LLMResponse;
  timestamp: Date;
  hits: number;
  ttl: number;
}

export class ResponseCache {
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // Track access for LRU
  private readonly _maxSize: number;
  private readonly _defaultTTL: number;

  constructor(
    cacheTypeOrMaxSize: string | number = 1000,
    maxSizeOrTTL?: number
  ) {
    // Handle both signatures: ResponseCache('memory', maxSize) and ResponseCache(maxSize, ttl)
    if (typeof cacheTypeOrMaxSize === 'string') {
      // New signature: ResponseCache('memory', 100)
      this._maxSize = maxSizeOrTTL || 1000;
      this._defaultTTL = 3600;
    } else {
      // Old signature: ResponseCache(1000, 3600)
      this._maxSize = cacheTypeOrMaxSize;
      this._defaultTTL = maxSizeOrTTL || 3600;
    }
  }

  get maxSize(): number {
    return this._maxSize;
  }

  get defaultTTL(): number {
    return this._defaultTTL;
  }

  /**
   * Get a cached response
   */
  async get(key: string): Promise<LLMResponse | null> {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    const age = (now - entry.timestamp.getTime()) / 1000; // seconds
    if (age > entry.ttl) {
      this.memoryCache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update hits and access order
    entry.hits++;
    this.updateAccessOrder(key);

    console.log(`[Cache Hit] Key: ${key}, Hits: ${entry.hits}`);
    return entry.response;
  }

  /**
   * Store a response in cache
   */
  async set(key: string, response: LLMResponse, ttl?: number): Promise<void> {
    const cacheTTL = ttl ?? this.defaultTTL;

    // Evict oldest entries while at capacity (LRU eviction)
    while (this.memoryCache.size >= this.maxSize && !this.memoryCache.has(key)) {
      const oldestKey = this.accessOrder[0];
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.removeFromAccessOrder(oldestKey);
        console.log(`[Cache Eviction] Removed: ${oldestKey}`);
      } else {
        break; // Safety check
      }
    }

    this.memoryCache.set(key, {
      response,
      timestamp: new Date(),
      hits: 0,
      ttl: cacheTTL
    });

    this.updateAccessOrder(key);

    console.log(`[Cache Set] Key: ${key}, TTL: ${cacheTTL}s, Size: ${this.memoryCache.size}`);
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder = [];
    console.log('[Cache Clear] All entries removed');
  }

  /**
   * Remove specific key from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.removeFromAccessOrder(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.memoryCache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits,
      hitRate,
      utilizationPercent: (this.memoryCache.size / this.maxSize) * 100
    };
  }

  /**
   * Clean up expired entries (should be called periodically)
   */
  async cleanExpired(): Promise<number> {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      const age = (now - entry.timestamp.getTime()) / 1000;
      if (age > entry.ttl) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache Cleanup] Removed ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    // Remove if exists
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}
