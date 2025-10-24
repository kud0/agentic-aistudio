/**
 * Tests for Mock Provider implementations
 * Tests generate(), stream(), estimateCost(), and other provider methods
 */

import { MockGrokProvider, MockClaudeProvider } from './mocks';
import { GenerateParams } from '../types';

describe('Mock Providers', () => {
  describe('MockGrokProvider', () => {
    let provider: MockGrokProvider;

    beforeEach(() => {
      provider = new MockGrokProvider();
    });

    describe('generate()', () => {
      it('should generate response', async () => {
        const params: GenerateParams = {
          prompt: 'What is AI?',
          systemPrompt: 'You are a helpful assistant',
          temperature: 0.7,
          maxTokens: 100,
        };

        const response = await provider.generate(params);

        expect(response.content).toContain('Mock Grok response');
        expect(response.provider).toBe('grok');
        expect(response.finishReason).toBe('stop');
        expect(response.tokensUsed.total).toBeGreaterThan(0);
        expect(response.cost).toBeGreaterThan(0);
      });

      it('should track generate calls', async () => {
        const params: GenerateParams = { prompt: 'Test 1' };
        await provider.generate(params);
        await provider.generate({ prompt: 'Test 2' });

        expect(provider.generateCalls).toHaveLength(2);
        expect(provider.generateCalls[0].prompt).toBe('Test 1');
        expect(provider.generateCalls[1].prompt).toBe('Test 2');
      });

      it('should simulate failures when configured', async () => {
        provider.setConfig({
          shouldFail: true,
          failureMessage: 'API rate limit exceeded',
        });

        await expect(
          provider.generate({ prompt: 'Test' })
        ).rejects.toThrow('API rate limit exceeded');
      });

      it('should simulate delays', async () => {
        provider.setConfig({ delay: 500 });

        const start = Date.now();
        await provider.generate({ prompt: 'Test' });
        const duration = Date.now() - start;

        expect(duration).toBeGreaterThanOrEqual(500);
      });

      it('should use custom response when configured', async () => {
        provider.setConfig({
          response: {
            content: 'Custom response content',
            metadata: { custom: true },
          },
        });

        const response = await provider.generate({ prompt: 'Test' });

        expect(response.content).toBe('Custom response content');
        expect(response.metadata).toEqual({ custom: true });
      });
    });

    describe('stream()', () => {
      it('should stream response chunks', async () => {
        provider.setConfig({
          response: { content: 'Hello world test' },
        });

        const chunks = [];
        for await (const chunk of provider.stream({ prompt: 'Test' })) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBe(3); // 3 words
        expect(chunks[chunks.length - 1].isComplete).toBe(true);

        const fullContent = chunks.map(c => c.content).join('');
        expect(fullContent).toBe('Hello world test');
      });

      it('should track stream calls', async () => {
        for await (const _ of provider.stream({ prompt: 'Test 1' })) {
          // Consume stream
        }

        expect(provider.streamCalls).toHaveLength(1);
        expect(provider.streamCalls[0].prompt).toBe('Test 1');
      });

      it('should simulate streaming failures', async () => {
        provider.setConfig({
          shouldFail: true,
          failureMessage: 'Stream connection lost',
        });

        const streamPromise = (async () => {
          for await (const _ of provider.stream({ prompt: 'Test' })) {
            // This should throw
          }
        })();

        await expect(streamPromise).rejects.toThrow('Stream connection lost');
      });
    });

    describe('countTokens()', () => {
      it('should count tokens approximately', () => {
        const text = 'The quick brown fox jumps over the lazy dog';
        const tokens = provider.countTokens(text);

        // Approximately 4 chars per token
        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(text.length);
      });

      it('should handle empty text', () => {
        expect(provider.countTokens('')).toBe(0);
      });
    });

    describe('estimateCost()', () => {
      it('should estimate cost based on tokens', () => {
        const cost = provider.estimateCost(1_000_000, 'grok-2-latest');
        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeLessThan(10); // Should be around $5
      });

      it('should use different pricing for mini model', () => {
        const latestCost = provider.estimateCost(1_000_000, 'grok-2-latest');
        const miniCost = provider.estimateCost(1_000_000, 'grok-2-mini');

        expect(miniCost).toBeLessThan(latestCost);
      });
    });

    describe('supportsFeature()', () => {
      it('should support streaming', () => {
        expect(provider.supportsFeature('streaming')).toBe(true);
      });

      it('should support tools', () => {
        expect(provider.supportsFeature('tools')).toBe(true);
      });

      it('should not support vision', () => {
        expect(provider.supportsFeature('vision')).toBe(false);
      });
    });

    describe('getModelList()', () => {
      it('should return available models', () => {
        const models = provider.getModelList();

        expect(models).toContain('grok-2-latest');
        expect(models).toContain('grok-2-mini');
      });
    });

    describe('reset()', () => {
      it('should reset call tracking', async () => {
        await provider.generate({ prompt: 'Test' });
        for await (const _ of provider.stream({ prompt: 'Test' })) {
          // Consume stream
        }

        expect(provider.generateCalls).toHaveLength(1);
        expect(provider.streamCalls).toHaveLength(1);

        provider.reset();

        expect(provider.generateCalls).toHaveLength(0);
        expect(provider.streamCalls).toHaveLength(0);
      });
    });
  });

  describe('MockClaudeProvider', () => {
    let provider: MockClaudeProvider;

    beforeEach(() => {
      provider = new MockClaudeProvider();
    });

    describe('generate()', () => {
      it('should generate response', async () => {
        const params: GenerateParams = {
          prompt: 'What is AI?',
          temperature: 0.7,
          maxTokens: 100,
        };

        const response = await provider.generate(params);

        expect(response.content).toContain('Mock Claude response');
        expect(response.provider).toBe('claude');
        expect(response.model).toContain('claude');
        expect(response.finishReason).toBe('stop');
      });

      it('should use default model when not specified', async () => {
        const response = await provider.generate({ prompt: 'Test' });

        expect(response.model).toBe('claude-3-5-sonnet-20240620');
      });

      it('should simulate failures', async () => {
        provider.setConfig({
          shouldFail: true,
          failureMessage: 'Claude API error',
        });

        await expect(
          provider.generate({ prompt: 'Test' })
        ).rejects.toThrow('Claude API error');
      });
    });

    describe('stream()', () => {
      it('should stream response chunks', async () => {
        const chunks = [];
        for await (const chunk of provider.stream({ prompt: 'Test' })) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[chunks.length - 1].isComplete).toBe(true);
      });
    });

    describe('estimateCost()', () => {
      it('should estimate different costs for different models', () => {
        const sonnetCost = provider.estimateCost(1_000_000, 'claude-3-5-sonnet-20240620');
        const opusCost = provider.estimateCost(1_000_000, 'claude-3-opus-20240229');
        const haikuCost = provider.estimateCost(1_000_000, 'claude-3-haiku-20240307');

        expect(opusCost).toBeGreaterThan(sonnetCost);
        expect(sonnetCost).toBeGreaterThan(haikuCost);
      });
    });

    describe('supportsFeature()', () => {
      it('should support all features', () => {
        expect(provider.supportsFeature('streaming')).toBe(true);
        expect(provider.supportsFeature('tools')).toBe(true);
        expect(provider.supportsFeature('vision')).toBe(true);
      });
    });

    describe('getModelList()', () => {
      it('should return Claude models', () => {
        const models = provider.getModelList();

        expect(models).toContain('claude-3-5-sonnet-20240620');
        expect(models).toContain('claude-3-opus-20240229');
        expect(models).toContain('claude-3-haiku-20240307');
      });
    });
  });

  describe('Provider Comparison', () => {
    it('should have consistent interfaces', async () => {
      const grok = new MockGrokProvider();
      const claude = new MockClaudeProvider();

      const params: GenerateParams = {
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 100,
      };

      const grokResponse = await grok.generate(params);
      const claudeResponse = await claude.generate(params);

      // Both should have the same response structure
      expect(grokResponse).toHaveProperty('content');
      expect(grokResponse).toHaveProperty('tokensUsed');
      expect(grokResponse).toHaveProperty('provider');
      expect(grokResponse).toHaveProperty('model');
      expect(grokResponse).toHaveProperty('finishReason');

      expect(claudeResponse).toHaveProperty('content');
      expect(claudeResponse).toHaveProperty('tokensUsed');
      expect(claudeResponse).toHaveProperty('provider');
      expect(claudeResponse).toHaveProperty('model');
      expect(claudeResponse).toHaveProperty('finishReason');
    });

    it('should have different provider names', () => {
      const grok = new MockGrokProvider();
      const claude = new MockClaudeProvider();

      expect(grok.name).toBe('grok');
      expect(claude.name).toBe('claude');
    });
  });
});
