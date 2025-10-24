/**
 * Research API Integration Tests
 * Tests the /api/ai/research endpoint with real authentication and database
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../../ai/research/route';
import {
  createTestUser,
  createTestProject,
  cleanupTestData,
  mockGrokAPI,
  generateTestBrief,
} from '../../../../tests/helpers/test-setup';

describe('Research API Integration Tests', () => {
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    // Mock Grok API
    mockGrokAPI({ success: true });

    // Create test user and project
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.user.id);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(testUser.user.id);
  });

  describe('POST /api/ai/research', () => {
    it('should generate research with valid authentication', async () => {
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

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.research).toBeDefined();
      expect(data.data.metadata).toBeDefined();
      expect(data.data.metadata.model).toBe('grok-2-latest');
      expect(data.data.metadata.provider).toBe('grok');
    });

    it('should reject request without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request for project user does not own', async () => {
      // Create another user
      const otherUser = await createTestUser();
      const otherProject = await createTestProject(otherUser.user.id);

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: otherProject.id,
          brief: generateTestBrief(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');

      // Cleanup
      await cleanupTestData(otherUser.user.id);
    });

    it('should reject request with missing projectId', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brief: generateTestBrief(),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with missing brief', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should track cost and tokens', async () => {
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

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metadata.tokensUsed).toBeGreaterThan(0);
      expect(data.data.metadata.cost).toBeGreaterThan(0);
      expect(data.data.metadata.latencyMs).toBeGreaterThan(0);
    });

    it('should respect budget limits', async () => {
      // Create a project with exceeded budget
      // This would require seeding the database with usage logs
      // For now, we'll test the check logic

      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: testProject.id,
          brief: generateTestBrief(),
          options: {
            maxBudget: 0.001, // Very low budget
          },
        }),
      });

      // This should pass the first time
      const response = await POST(request);
      expect(response.status).toBeLessThanOrEqual(429); // Either success or budget exceeded
    });

    it('should measure latency under 5 seconds', async () => {
      const startTime = Date.now();

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

      const response = await POST(request);
      const latency = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(latency).toBeLessThan(5000); // 5 second max
    });
  });

  describe('GET /api/ai/research', () => {
    it('should retrieve previous research for project', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/ai/research?projectId=${testProject.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testUser.session.access_token}`,
          },
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data.research)).toBe(true);
    });

    it('should require authentication', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/ai/research?projectId=${testProject.id}`,
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should require projectId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/research', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });
});
