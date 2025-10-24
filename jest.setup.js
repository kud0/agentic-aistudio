// Jest setup file for global test configuration

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GROK_API_KEY = 'test-grok-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

// Global test timeout
jest.setTimeout(10000);

// Mock fetch globally
global.fetch = jest.fn();

// Suppress console errors during tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
