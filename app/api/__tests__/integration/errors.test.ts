/**
 * Error Scenario Integration Tests
 * Tests error handling and recovery mechanisms
 */

import { NextRequest } from 'next/server';
import { POST as researchPOST } from '../../ai/research/route';
import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  mockGrokAPI,
  generateTestBrief,
} from '../../../../tests/helpers/test-setup';

describe('Error Scenario Tests', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.user.id);
  });

  afterEach(async () => {
    await cleanupTestData(testUser.user.id);
  });

  describe('Grok API Errors', () => {
    it('should handle Grok API 500 error', async () => {
      // Mock API failure
      mockGrokAPI({ success: false });

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.message).toBeDefined();

      // Restore mock
      mockGrokAPI({ success: true });
    });

    it('should handle invalid Grok API key', async () => {
      // Mock auth failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([401, 500]).toContain(response.status);
      expect(data.success).toBe(false);

      // Restore mock
      mockGrokAPI({ success: true });
    });

    it('should handle Grok rate limit errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
        json: async () => ({ error: 'Too many requests' }),
      });

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([429, 500]).toContain(response.status);
      expect(data.success).toBe(false);

      // Restore mock
      mockGrokAPI({ success: true });
    });

    it('should handle Grok timeout', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data.success).toBe(false);

      // Restore mock
      mockGrokAPI({ success: true });
    });
  });

  describe('Malformed Requests', () => {
    beforeEach(() => {
      mockGrokAPI({ success: true });
    });

    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: '',
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: '{invalid json}',
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          // Missing brief
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle invalid field types', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 12345, // Should be string
          brief: ['array', 'instead', 'of', 'string'], // Should be string
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([400, 500]).toContain(response.status);
      expect(data.success).toBe(false);
    });

    it('should handle extremely long input', async () => {
      const longBrief = 'x'.repeat(100000); // 100KB

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: longBrief,
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([200, 400, 413, 500]).toContain(response.status);
      // Either processes or rejects gracefully
    });
  });

  describe('Database Errors', () => {
    it('should handle database connection errors', async () => {
      mockGrokAPI({ success: true });

      // Mock database failure by using invalid project
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: '00000000-0000-0000-0000-000000000000',
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect([404, 500]).toContain(response.status);
      expect(data.success).toBe(false);
    });

    it('should handle concurrent database writes', async () => {
      mockGrokAPI({ success: true });

      // Send multiple concurrent requests to same project
      const promises = Array.from({ length: 5 }, (_, i) =>
        researchPOST(
          new NextRequest('http://localhost:3000/api/ai/research', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testUser.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId: testProject.id,
              brief: `Concurrent test ${i}`,
            }),
          })
        )
      );

      const responses = await Promise.all(promises);

      // All should complete without database errors
      responses.forEach((response) => {
        expect([200, 429, 500]).toContain(response.status);
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors to database', async () => {
      mockGrokAPI({ success: false });

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);

      expect(response.status).toBe(500);

      // Check if error was logged
      // (Would need access to error logs table)

      mockGrokAPI({ success: true });
    });

    it('should not expose sensitive error details', async () => {
      mockGrokAPI({ success: false });

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await researchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);

      // Error message should be generic, not expose internals
      expect(data.error.message).not.toContain('stack');
      expect(data.error.message).not.toContain('SUPABASE');
      expect(data.error.message).not.toContain('API_KEY');

      mockGrokAPI({ success: true });
    });
  });

  describe('Recovery and Retry', () => {
    it('should recover after temporary API failure', async () => {
      // First request fails
      mockGrokAPI({ success: false });

      const request1 = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response1 = await researchPOST(request1);
      expect(response1.status).toBe(500);

      // Second request succeeds
      mockGrokAPI({ success: true });

      const request2 = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response2 = await researchPOST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.success).toBe(true);
    });
  });
});
