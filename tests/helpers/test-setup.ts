/**
 * Test Setup Helpers
 * Provides utilities for integration and E2E testing
 */

import { createClient } from '@supabase/supabase-js';

// Mock environment variables for testing
export const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key',
  GROK_API_KEY: process.env.GROK_API_KEY || 'test-grok-key',
};

/**
 * Create a test Supabase client
 */
export function createTestClient() {
  return createClient(
    TEST_ENV.NEXT_PUBLIC_SUPABASE_URL,
    TEST_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Create a test user and session
 */
export async function createTestUser() {
  const supabase = createTestClient();

  const email = `test-${Date.now()}@example.com`;
  const password = 'test-password-123';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  return {
    user: data.user!,
    session: data.session!,
    email,
    password,
  };
}

/**
 * Create a test project
 */
export async function createTestProject(userId: string) {
  const supabase = createTestClient();

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: `Test Project ${Date.now()}`,
      brief: 'Test brand brief',
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userId: string) {
  const supabase = createTestClient();

  // Delete projects and related data
  await supabase.from('llm_usage_logs').delete().eq('user_id', userId);
  await supabase.from('outputs').delete().eq('user_id', userId);
  await supabase.from('projects').delete().eq('user_id', userId);

  // Delete user (if using service role key)
  // await supabase.auth.admin.deleteUser(userId);
}

/**
 * Mock fetch for Grok API
 */
export function mockGrokAPI(options: {
  success?: boolean;
  streaming?: boolean;
  delay?: number;
  cost?: number;
} = {}) {
  const {
    success = true,
    streaming = false,
    delay = 100,
    cost = 0.001,
  } = options;

  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    if (url.includes('api.x.ai')) {
      return Promise.resolve({
        ok: success,
        status: success ? 200 : 500,
        json: async () => ({
          choices: [{
            message: {
              content: 'Mock AI response from Grok',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
          model: 'grok-2-latest',
        }),
        text: async () => success ? '' : 'API Error',
        body: streaming ? {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Mock "}}]}\n\n'),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"stream"}}]}\n\n'),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: [DONE]\n\n'),
              })
              .mockResolvedValue({ done: true }),
          }),
        } : null,
      } as any);
    }

    // Pass through other requests
    return (global.fetch as any).mockImplementation()(url, init);
  }) as any;
}

/**
 * Create mock auth headers
 */
export function createAuthHeaders(session: { access_token: string }) {
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Wait for async operations
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate test brief
 */
export function generateTestBrief() {
  return `
Rebrand Denon for Gen Z Audiophiles

CLIENT: Denon
CHALLENGE: Declining market share among 18-30 demographic
GOAL: Modernize brand perception while maintaining audio quality heritage
BUDGET: $2M
TIMELINE: 6 months
`.trim();
}
