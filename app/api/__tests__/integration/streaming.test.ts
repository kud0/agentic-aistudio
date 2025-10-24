/**
 * Streaming API Integration Tests
 * Tests Server-Sent Events (SSE) streaming functionality
 */

import { NextRequest } from 'next/server';
import { POST } from '../../ai/stream/route';
import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  mockGrokAPI,
  generateTestBrief,
} from '../../../../tests/helpers/test-setup';

describe('Streaming API Integration Tests', () => {
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    // Mock Grok API with streaming enabled
    mockGrokAPI({ success: true, streaming: true });

    // Create test user and project
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.user.id);
  });

  afterAll(async () => {
    await cleanupTestData(testUser.user.id);
  });

  describe('POST /api/ai/stream', () => {
    it('should stream AI responses in real-time', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
          systemPrompt: 'You are a brand research specialist.',
        }),
      });

      const response = await POST(request);

      // Check headers
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');

      // Read stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let done = false;

      while (!done && chunks.length < 10) {
        const { value, done: streamDone } = await reader!.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value);
          chunks.push(chunk);
        }
      }

      // Verify chunks received
      expect(chunks.length).toBeGreaterThan(0);

      // Parse last chunk to verify format
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk).toContain('data:');

      // Verify stream closed properly
      reader?.cancel();
    });

    it('should have low latency to first chunk (<500ms)', async () => {
      const startTime = Date.now();

      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
        }),
      });

      const response = await POST(request);
      const reader = response.body?.getReader();

      // Read first chunk
      await reader!.read();
      const latency = Date.now() - startTime;

      expect(latency).toBeLessThan(500); // <500ms to first chunk

      reader?.cancel();
    });

    it('should handle multiple concurrent streams', async () => {
      const streamCount = 3;
      const promises = [];

      for (let i = 0; i < streamCount; i++) {
        const request = new NextRequest('http://localhost:3000/api/ai/stream', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testUser.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: testProject.id,
            taskType: 'research',
            prompt: `Test prompt ${i}`,
          }),
        });

        promises.push(POST(request));
      }

      const responses = await Promise.all(promises);

      // All streams should succeed
      responses.forEach(response => {
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      });

      // Cleanup streams
      await Promise.all(
        responses.map(async (response) => {
          const reader = response.body?.getReader();
          await reader?.cancel();
        })
      );
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should require valid project ownership', async () => {
      const otherUser = await createTestUser();
      const otherProject = await createTestProject(otherUser.user.id);

      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: otherProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);

      await cleanupTestData(otherUser.user.id);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          // Missing taskType and prompt
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle stream errors gracefully', async () => {
      // Mock API failure
      mockGrokAPI({ success: false, streaming: true });

      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
        }),
      });

      const response = await POST(request);
      const reader = response.body?.getReader();

      // Should receive error chunk
      const { value } = await reader!.read();
      const chunk = new TextDecoder().decode(value);

      expect(chunk).toContain('data:');

      reader?.cancel();

      // Restore mock
      mockGrokAPI({ success: true, streaming: true });
    });

    it('should respect budget limits during streaming', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          taskType: 'research',
          prompt: generateTestBrief(),
          options: {
            maxBudget: 0.0001, // Very low budget
          },
        }),
      });

      const response = await POST(request);

      // Should either succeed or return 429 before streaming
      expect([200, 429]).toContain(response.status);

      if (response.status === 200) {
        const reader = response.body?.getReader();
        reader?.cancel();
      }
    });
  });
});
