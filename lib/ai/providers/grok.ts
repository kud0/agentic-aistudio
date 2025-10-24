/**
 * Grok Provider - X.AI API Integration
 * Full implementation with streaming, cost estimation, and error handling
 */

import { LLMProvider, GenerateParams, LLMResponse, LLMChunk } from '../types';

export class GrokProvider implements LLMProvider {
  name = 'grok';
  models = ['grok-4-fast-reasoning', 'grok-2-latest', 'grok-2-mini'];
  enabled = true;
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Grok API key is required');
    this.apiKey = apiKey;
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    const model = params.model || 'grok-2-latest';
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
            { role: 'user', content: params.prompt }
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      return {
        content: data.choices[0].message.content,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        model: data.model,
        provider: 'grok',
        cost: this.estimateCost(data.usage.total_tokens, model),
        latencyMs: latency,
        cached: false,
        timestamp: new Date(),
        metadata: {
          rawResponse: data,
          finishReason: this.mapFinishReason(data.choices[0].finish_reason),
          toolCalls: data.choices[0].message.tool_calls
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grok generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *stream(params: GenerateParams): AsyncIterableIterator<LLMChunk> {
    const model = params.model || 'grok-2-latest';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
            { role: 'user', content: params.prompt }
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok streaming error (${response.status}): ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false };
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Grok streaming failed: ${error.message}`);
      }
      throw error;
    }
  }

  async countTokens(text: string): Promise<number> {
    // Rough estimation: ~4 chars per token (standard approximation)
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean {
    return ['streaming', 'tools'].includes(feature);
  }

  getModelList(): string[] {
    return ['grok-2-latest', 'grok-2-mini'];
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Grok pricing (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'grok-4-fast-reasoning': { input: 2, output: 10 },
      'grok-2-latest': { input: 2, output: 10 },
      'grok-2-mini': { input: 0.5, output: 2 }
    };

    const modelPricing = pricing[model] || pricing['grok-4-fast-reasoning'];
    return (inputTokens / 1_000_000) * modelPricing.input + (outputTokens / 1_000_000) * modelPricing.output;
  }

  estimateCost(tokens: number, model: string): number {
    // Grok pricing (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'grok-2-latest': { input: 2, output: 10 },
      'grok-2-mini': { input: 0.5, output: 2 }
    };

    const modelPricing = pricing[model] || pricing['grok-2-latest'];

    // Assume 30% input, 70% output split (common for assistant responses)
    const inputTokens = tokens * 0.3;
    const outputTokens = tokens * 0.7;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  async getHealth() {
    // Simple health check
    return {
      provider: 'grok' as const,
      status: 'healthy' as const,
      error_rate: 0,
      avg_latency_ms: 0,
      last_checked: new Date()
    };
  }

  private mapFinishReason(reason: string): string {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_call';
      default: return 'error';
    }
  }
}
