/**
 * Tests for Response Cache implementation
 * Tests caching, TTL, LRU eviction, and hit rates
 */

import { ResponseCache } from '../cache';
import { LLMResponse } from '../types';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  const mockResponse: LLMResponse = {
    content: 'Test response',
    tokensUsed: { prompt: 10, completion: 20, total: 30 },
    model: 'test-model',
    provider: 'test',
    finishReason: 'stop',
    cost: 0.001,
    latency: 100,
  };

  beforeEach(() => {
    cache = new ResponseCache('memory', 100);
  });

  describe('Basic Operations', () => {
    it('should store and retrieve cached response', async () => {
      await cache.set('test-key', mockResponse);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toEqual(mockResponse);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await cache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should delete cached entry', async () => {
      await cache.set('test-key', mockResponse);
      await cache.delete('test-key');

      const retrieved = await cache.get('test-key');
      expect(retrieved).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', mockResponse);
      await cache.set('key2', mockResponse);

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL and expire entries', async () => {
      await cache.set('test-key', mockResponse, 1); // 1 second TTL

      // Should be available immediately
      expect(await cache.get('test-key')).toEqual(mockResponse);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(await cache.get('test-key')).toBeNull();
    });

    it('should use default TTL if not specified', async () => {
      await cache.set('test-key', mockResponse);
      const retrieved = await cache.get('test-key');

      expect(retrieved).toEqual(mockResponse);
    });

    it('should handle different TTLs for different entries', async () => {
      await cache.set('short-ttl', mockResponse, 1);
      await cache.set('long-ttl', mockResponse, 10);

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await cache.get('short-ttl')).toBeNull();
      expect(await cache.get('long-ttl')).toEqual(mockResponse);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entry when cache is full', async () => {
      const smallCache = new ResponseCache('memory', 3);

      await smallCache.set('key1', mockResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      await smallCache.set('key2', mockResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      await smallCache.set('key3', mockResponse);
      await new Promise(resolve => setTimeout(resolve, 10));

      // This should evict key1
      await smallCache.set('key4', mockResponse);

      expect(await smallCache.get('key1')).toBeNull();
      expect(await smallCache.get('key2')).toEqual(mockResponse);
      expect(await smallCache.get('key3')).toEqual(mockResponse);
      expect(await smallCache.get('key4')).toEqual(mockResponse);
    });

    it('should respect max cache size', async () => {
      const smallCache = new ResponseCache('memory', 5);

      for (let i = 0; i < 10; i++) {
        await smallCache.set(`key${i}`, mockResponse);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe('Hit Tracking', () => {
    it('should track cache hits', async () => {
      await cache.set('test-key', mockResponse);

      await cache.get('test-key');
      await cache.get('test-key');
      await cache.get('test-key');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(3);
    });

    it('should calculate average hits', async () => {
      await cache.set('key1', mockResponse);
      await cache.set('key2', mockResponse);

      await cache.get('key1');
      await cache.get('key1');
      await cache.get('key2');

      const stats = cache.getStats();
      expect(stats.avgHits).toBe(1.5); // (2 + 1) / 2
    });

    it('should not count hits for missed keys', async () => {
      await cache.set('key1', mockResponse);
      await cache.get('key1');
      await cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should report cache size', async () => {
      await cache.set('key1', mockResponse);
      await cache.set('key2', mockResponse);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
    });

    it('should calculate hit rate', async () => {
      await cache.set('key1', mockResponse);

      await cache.get('key1'); // Hit
      await cache.get('key1'); // Hit

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should handle empty cache statistics', () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.avgHits).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid set/get operations', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(cache.set(`key${i}`, mockResponse));
      }
      await Promise.all(promises);

      const getPromises = [];
      for (let i = 0; i < 50; i++) {
        getPromises.push(cache.get(`key${i}`));
      }
      const results = await Promise.all(getPromises);

      // At least some should be cached (LRU may evict some)
      const cachedCount = results.filter(r => r !== null).length;
      expect(cachedCount).toBeGreaterThan(0);
    });

    it('should handle response objects with complex metadata', async () => {
      const complexResponse: LLMResponse = {
        ...mockResponse,
        metadata: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
        },
      };

      await cache.set('complex', complexResponse);
      const retrieved = await cache.get('complex');

      expect(retrieved).toEqual(complexResponse);
    });
  });
});
