/**
 * Mock providers for testing
 * Provides configurable mock implementations of LLMProvider interface
 */

import {
  LLMProvider,
  GenerateParams,
  LLMResponse,
  LLMChunk
} from '../types';

export interface MockConfig {
  shouldFail?: boolean;
  failureMessage?: string;
  delay?: number;
  response?: Partial<LLMResponse>;
}

/**
 * Mock Grok Provider for testing
 */
export class MockGrokProvider implements LLMProvider {
  name = 'grok';
  private config: MockConfig;
  public generateCalls: GenerateParams[] = [];
  public streamCalls: GenerateParams[] = [];

  constructor(config: MockConfig = {}) {
    this.config = config;
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    this.generateCalls.push(params);

    // Simulate delay
    if (this.config.delay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }

    // Simulate failure
    if (this.config.shouldFail) {
      throw new Error(this.config.failureMessage || 'Grok API error');
    }

    const promptTokens = this.countTokens(params.prompt + (params.systemPrompt || ''));
    const completionTokens = params.maxTokens || 500;

    return {
      content: this.config.response?.content || `Mock Grok response for: ${params.prompt}`,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      model: params.model || 'grok-2-latest',
      provider: 'grok',
      finishReason: 'stop',
      cost: this.estimateCost(promptTokens + completionTokens, params.model || 'grok-2-latest'),
      latency: this.config.delay || 100,
      metadata: this.config.response?.metadata,
    };
  }

  async *stream(params: GenerateParams): AsyncIterator<LLMChunk> {
    this.streamCalls.push(params);

    if (this.config.shouldFail) {
      throw new Error(this.config.failureMessage || 'Grok streaming error');
    }

    const words = (this.config.response?.content || 'Mock streaming response').split(' ');

    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        isComplete: i === words.length - 1,
        metadata: { index: i },
      };
    }
  }

  countTokens(text: string): number {
    // Simple approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean {
    return feature === 'streaming' || feature === 'tools';
  }

  getModelList(): string[] {
    return ['grok-2-latest', 'grok-2-mini'];
  }

  estimateCost(tokens: number, model: string): number {
    // Grok pricing: ~$5 per 1M tokens
    const pricePerMillion = model.includes('mini') ? 2 : 5;
    return (tokens / 1_000_000) * pricePerMillion;
  }

  reset() {
    this.generateCalls = [];
    this.streamCalls = [];
  }

  setConfig(config: MockConfig) {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Mock Claude Provider for testing
 */
export class MockClaudeProvider implements LLMProvider {
  name = 'claude';
  private config: MockConfig;
  public generateCalls: GenerateParams[] = [];
  public streamCalls: GenerateParams[] = [];

  constructor(config: MockConfig = {}) {
    this.config = config;
  }

  async generate(params: GenerateParams): Promise<LLMResponse> {
    this.generateCalls.push(params);

    if (this.config.delay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }

    if (this.config.shouldFail) {
      throw new Error(this.config.failureMessage || 'Claude API error');
    }

    const promptTokens = this.countTokens(params.prompt + (params.systemPrompt || ''));
    const completionTokens = params.maxTokens || 500;

    return {
      content: this.config.response?.content || `Mock Claude response for: ${params.prompt}`,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      model: params.model || 'claude-3-5-sonnet-20240620',
      provider: 'claude',
      finishReason: 'stop',
      cost: this.estimateCost(promptTokens + completionTokens, params.model || 'claude-3-5-sonnet-20240620'),
      latency: this.config.delay || 150,
      metadata: this.config.response?.metadata,
    };
  }

  async *stream(params: GenerateParams): AsyncIterator<LLMChunk> {
    this.streamCalls.push(params);

    if (this.config.shouldFail) {
      throw new Error(this.config.failureMessage || 'Claude streaming error');
    }

    const words = (this.config.response?.content || 'Mock Claude streaming').split(' ');

    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        isComplete: i === words.length - 1,
        metadata: { index: i },
      };
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  supportsFeature(feature: 'streaming' | 'tools' | 'vision'): boolean {
    return true; // Claude supports all features
  }

  getModelList(): string[] {
    return [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  estimateCost(tokens: number, model: string): number {
    // Claude pricing varies by model
    let pricePerMillion = 15; // Default (Sonnet)
    if (model.includes('opus')) pricePerMillion = 60;
    if (model.includes('haiku')) pricePerMillion = 1.25;

    return (tokens / 1_000_000) * pricePerMillion;
  }

  reset() {
    this.generateCalls = [];
    this.streamCalls = [];
  }

  setConfig(config: MockConfig) {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockData = {
    user: { id: 'test-user-123', email: 'test@example.com' },
    project: { id: 'test-project-123', user_id: 'test-user-123', name: 'Test Project' },
    usageLogs: [] as any[],
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockData.user },
        error: null,
      }),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: table === 'projects' ? mockData.project : null,
        error: null,
      }),
      mockResolvedValue: jest.fn().mockResolvedValue({
        data: table === 'llm_usage_logs' ? mockData.usageLogs : [],
        error: null,
      }),
    })),
    // Helper to set mock data
    __setMockData: (key: string, value: any) => {
      (mockData as any)[key] = value;
    },
    __getMockData: () => mockData,
  };
}
