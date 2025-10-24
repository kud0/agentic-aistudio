/**
 * Claude Provider - Anthropic API Integration
 * Implementation using @anthropic-ai/sdk with streaming support
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, GenerateParams, LLMResponse, LLMChunk } from '../types';

export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Anthropic API key is required');
    this.client = new Anthropic({ apiKey });
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    const model = params.model || 'claude-3-5-sonnet-20241022';
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: params.maxTokens ?? 2000,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.prompt }
        ]
      });

      const latency = Date.now() - startTime;

      const content = response.content[0]?.type === 'text'
        ? response.content[0].text
        : '';

      return {
        content,
        tokensUsed: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens
        },
        model: response.model,
        provider: 'claude',
        finishReason: this.mapStopReason(response.stop_reason),
        cost: this.estimateCost(
          response.usage.input_tokens + response.usage.output_tokens,
          model
        ),
        latency,
        metadata: { rawResponse: response }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  async *stream(params: GenerateParams): AsyncIterator<LLMChunk> {
    const model = params.model || 'claude-3-5-sonnet-20241022';

    try {
      const stream = await this.client.messages.stream({
        model,
        max_tokens: params.maxTokens ?? 2000,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.prompt }
        ]
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield {
            content: event.delta.text,
            isComplete: false
          };
        } else if (event.type === 'message_stop') {
          yield {
            content: '',
            isComplete: true
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude streaming failed: ${error.message}`);
      }
      throw error;
    }
  }

  countTokens(text: string): number {
    // Claude's tokenizer is similar to GPT (rough estimation)
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean {
    return ['streaming', 'tools', 'vision'].includes(feature);
  }

  getModelList(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229'
    ];
  }

  estimateCost(tokens: number, model: string): number {
    // Claude pricing (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-opus-20240229': { input: 15, output: 75 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-5-sonnet-20241022'];

    // Assume 30% input, 70% output
    const inputTokens = tokens * 0.3;
    const outputTokens = tokens * 0.7;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  private mapStopReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_call';
      default: return 'stop';
    }
  }
}
